package back.backend.domain.expense.service;

import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.expense.dto.*;
import back.backend.domain.expense.entity.*;
import back.backend.domain.expense.exception.ExpenseErrorCode;
import back.backend.domain.expense.repository.*;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.settlement.service.SettlementCalculator;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.*;
import back.backend.global.exception.BusinessException;
import java.math.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    private final ExpenseParticipantRepository participantRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripRepository tripRepository;
    private final MemberRepository memberRepository;
    private final TripAccessChecker accessChecker;
    private final SettlementCalculator settlementCalculator;
    private final CollaborationEventService collaborationEventService;

    public ExpenseService(
            ExpenseRepository expenseRepository, ExpenseParticipantRepository participantRepository,
            TripMemberRepository tripMemberRepository, TripRepository tripRepository,
            MemberRepository memberRepository, TripAccessChecker accessChecker,
            SettlementCalculator settlementCalculator, CollaborationEventService collaborationEventService
    ) {
        this.expenseRepository = expenseRepository;
        this.participantRepository = participantRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.tripRepository = tripRepository;
        this.memberRepository = memberRepository;
        this.accessChecker = accessChecker;
        this.settlementCalculator = settlementCalculator;
        this.collaborationEventService = collaborationEventService;
    }

    @Transactional
    public ExpenseResponse create(Long tripId, ExpenseCreateRequest request) {
        Long actorId = accessChecker.requireEdit(tripId);
        Trip trip = tripRepository.findById(tripId).orElseThrow();
        validateExpenseDate(trip, request.expenseDate());
        List<Long> tripMemberIds = tripMemberRepository.findMemberIdsByTripId(tripId);
        LinkedHashSet<Long> participantIds = new LinkedHashSet<>(request.participantIds());
        if (participantIds.isEmpty()) throw new BusinessException(ExpenseErrorCode.INVALID_PARTICIPANTS);
        if (!tripMemberIds.contains(request.payerId()) || !tripMemberIds.containsAll(participantIds)) {
            throw new BusinessException(ExpenseErrorCode.MEMBER_NOT_IN_TRIP);
        }
        Map<Long, BigDecimal> shares = calculateShares(request, participantIds);
        Expense expense = expenseRepository.save(Expense.builder()
                .tripId(tripId).payerId(request.payerId()).title(request.title().trim())
                .category(request.category()).totalAmount(money(request.totalAmount()))
                .currency(trip.getCurrency()).expenseDate(request.expenseDate())
                .splitType(request.splitType()).memo(request.memo()).createdBy(actorId).build());
        participantRepository.saveAll(shares.entrySet().stream()
                .map(entry -> ExpenseParticipant.builder()
                        .expenseId(expense.getId()).memberId(entry.getKey()).shareAmount(entry.getValue()).build())
                .toList());
        collaborationEventService.record(
                tripId, actorId, "EXPENSE_CREATED", "EXPENSE", expense.getId(),
                expense.getTitle() + " 지출 " + expense.getTotalAmount().toPlainString() + "원이 등록됐습니다.",
                Map.of("title", expense.getTitle(), "amount", expense.getTotalAmount()),
                NotificationType.SETTLEMENT, "지출 등록");
        return toResponse(expense, shares, trip, memberNames(tripMemberIds));
    }

    public List<ExpenseResponse> getExpenses(Long tripId) {
        accessChecker.requireView(tripId);
        Trip trip = tripRepository.findById(tripId).orElseThrow();
        List<Expense> expenses = expenseRepository.findAllByTripIdOrderByExpenseDateAscCreatedAtAscIdAsc(tripId);
        List<Long> ids = expenses.stream().map(Expense::getId).toList();
        Map<Long, List<ExpenseParticipant>> participants = ids.isEmpty() ? Map.of()
                : participantRepository.findAllByExpenseIdIn(ids).stream()
                .collect(Collectors.groupingBy(ExpenseParticipant::getExpenseId));
        Map<Long, String> names = memberNames(tripMemberRepository.findMemberIdsByTripId(tripId));
        return expenses.stream().map(expense -> toResponse(
                expense,
                participants.getOrDefault(expense.getId(), List.of()).stream()
                        .collect(Collectors.toMap(ExpenseParticipant::getMemberId, ExpenseParticipant::getShareAmount)),
                trip, names)).toList();
    }

    public ExpenseContextResponse getContext(Long tripId) {
        accessChecker.requireView(tripId);
        Trip trip = tripRepository.findById(tripId).orElseThrow();
        Map<Long, String> names = memberNames(tripMemberRepository.findMemberIdsByTripId(tripId));
        List<ExpenseMemberResponse> members = names.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new ExpenseMemberResponse(entry.getKey(), entry.getValue()))
                .toList();
        return new ExpenseContextResponse(
                trip.getStartDate(),
                trip.getEndDate(),
                members,
                trip.getStartDate() != null && trip.getEndDate() != null);
    }

    public SettlementSummaryResponse getSettlement(Long tripId) {
        accessChecker.requireView(tripId);
        List<Long> memberIds = tripMemberRepository.findMemberIdsByTripId(tripId);
        Map<Long, String> names = memberNames(memberIds);
        Map<Long, BigDecimal> paid = memberIds.stream().collect(Collectors.toMap(Function.identity(), id -> BigDecimal.ZERO));
        Map<Long, BigDecimal> shares = memberIds.stream().collect(Collectors.toMap(Function.identity(), id -> BigDecimal.ZERO));
        List<Expense> expenses = expenseRepository.findAllByTripIdOrderByExpenseDateAscCreatedAtAscIdAsc(tripId);
        Map<Long, Expense> byId = expenses.stream().collect(Collectors.toMap(Expense::getId, Function.identity()));
        if (!byId.isEmpty()) {
            for (ExpenseParticipant participant : participantRepository.findAllByExpenseIdIn(new ArrayList<>(byId.keySet()))) {
                shares.merge(participant.getMemberId(), participant.getShareAmount(), BigDecimal::add);
            }
        }
        expenses.forEach(expense -> paid.merge(expense.getPayerId(), expense.getTotalAmount(), BigDecimal::add));
        Map<Long, BigDecimal> balances = memberIds.stream().collect(Collectors.toMap(
                Function.identity(), id -> paid.get(id).subtract(shares.get(id))));
        List<SettlementSummaryResponse.MemberBalance> members = memberIds.stream()
                .map(id -> new SettlementSummaryResponse.MemberBalance(
                        id, names.get(id), paid.get(id), shares.get(id), balances.get(id))).toList();
        BigDecimal total = expenses.stream().map(Expense::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new SettlementSummaryResponse(total, members, settlementCalculator.calculate(balances, names));
    }

    private Map<Long, BigDecimal> calculateShares(ExpenseCreateRequest request, Set<Long> participantIds) {
        BigDecimal total = money(request.totalAmount());
        if (request.splitType() == SplitType.CUSTOM) {
            Map<Long, BigDecimal> custom = request.customShares() == null ? Map.of() : request.customShares();
            if (!custom.keySet().equals(participantIds)
                    || money(custom.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add)).compareTo(total) != 0) {
                throw new BusinessException(ExpenseErrorCode.INVALID_CUSTOM_SHARES);
            }
            return custom.entrySet().stream().collect(Collectors.toMap(
                    Map.Entry::getKey, entry -> money(entry.getValue()), (a, b) -> a, LinkedHashMap::new));
        }
        List<Long> sorted = participantIds.stream().sorted().toList();
        BigDecimal divisor = BigDecimal.valueOf(sorted.size());
        BigDecimal base = total.divide(divisor, 2, RoundingMode.DOWN);
        int remainingCents = total.subtract(base.multiply(divisor)).movePointRight(2).intValueExact();
        Map<Long, BigDecimal> result = new LinkedHashMap<>();
        for (int index = 0; index < sorted.size(); index++) {
            result.put(sorted.get(index), base.add(index < remainingCents ? new BigDecimal("0.01") : BigDecimal.ZERO));
        }
        return result;
    }

    private ExpenseResponse toResponse(Expense expense, Map<Long, BigDecimal> shares, Trip trip, Map<Long, String> names) {
        Integer day = expense.getExpenseDate() == null || trip.getStartDate() == null ? null
                : Math.toIntExact(ChronoUnit.DAYS.between(trip.getStartDate(), expense.getExpenseDate()) + 1);
        return new ExpenseResponse(
                expense.getId(), expense.getTitle(), expense.getCategory(), expense.getTotalAmount(),
                expense.getCurrency(), expense.getExpenseDate(), day, expense.getPayerId(),
                names.get(expense.getPayerId()), expense.getSplitType(),
                shares.entrySet().stream().map(entry -> new ExpenseResponse.ParticipantShareResponse(
                        entry.getKey(), names.get(entry.getKey()), entry.getValue())).toList(), expense.getMemo());
    }

    private Map<Long, String> memberNames(List<Long> ids) {
        return memberRepository.findAllById(ids).stream().collect(Collectors.toMap(Member::getId, Member::getNickname));
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private void validateExpenseDate(Trip trip, java.time.LocalDate expenseDate) {
        if (trip.getStartDate() == null || trip.getEndDate() == null) {
            throw new BusinessException(ExpenseErrorCode.TRIP_SCHEDULE_REQUIRED);
        }
        if (expenseDate.isBefore(trip.getStartDate()) || expenseDate.isAfter(trip.getEndDate())) {
            throw new BusinessException(ExpenseErrorCode.EXPENSE_DATE_OUT_OF_RANGE);
        }
    }
}
