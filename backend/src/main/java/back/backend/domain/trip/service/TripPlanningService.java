package back.backend.domain.trip.service;

import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.dto.DateAvailabilityResponse;
import back.backend.domain.trip.dto.DateProposalRequest;
import back.backend.domain.trip.dto.DateProposalResponse;
import back.backend.domain.trip.dto.DateVoteRequest;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripPlanningService {

    private static final int MAX_AVAILABILITY_DATES = 366;
    private static final LocalDate MIN_AVAILABILITY_DATE = LocalDate.of(2000, 1, 1);
    private static final LocalDate MAX_AVAILABILITY_DATE = LocalDate.of(2100, 12, 31);

    private final JdbcClient jdbcClient;
    private final TripAccessChecker accessChecker;
    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final CollaborationEventService collaborationEventService;

    @Transactional
    public List<DateAvailabilityResponse> replaceAvailability(Long tripId, Set<LocalDate> dates) {
        Long memberId = accessChecker.requireMember(tripId);
        validateAvailabilityDates(dates);
        jdbcClient.sql("DELETE FROM trip_date_availabilities WHERE trip_id=:tripId AND member_id=:memberId")
                .param("tripId", tripId).param("memberId", memberId).update();
        dates.stream().sorted().forEach(date -> jdbcClient.sql("""
                INSERT INTO trip_date_availabilities(trip_id, member_id, available_date, created_at)
                VALUES (:tripId, :memberId, :date, :now)
                """).param("tripId", tripId).param("memberId", memberId)
                .param("date", date).param("now", LocalDateTime.now()).update());
        collaborationEventService.record(
                tripId,
                memberId,
                "DATE_AVAILABILITY_UPDATED",
                "TRIP_MEMBER",
                memberId,
                "가능 날짜가 변경됐습니다.",
                Map.of("dateCount", dates.size()),
                NotificationType.ITINERARY,
                "가능 날짜 변경"
        );
        return getAvailability(tripId);
    }

    public List<DateAvailabilityResponse> getAvailability(Long tripId) {
        accessChecker.requireView(tripId);
        Map<Long, AvailabilityBuilder> grouped = new LinkedHashMap<>();
        jdbcClient.sql("""
                SELECT tm.member_id,
                       CASE WHEN m.status = 'WITHDRAWN' THEN '탈퇴한 사용자' ELSE m.nickname END AS nickname,
                       CASE WHEN m.status = 'WITHDRAWN' THEN NULL ELSE m.profile_image_url END AS profile_image_url,
                       tda.available_date
                FROM trip_members tm
                JOIN members m ON m.id = tm.member_id
                LEFT JOIN trip_date_availabilities tda
                  ON tda.trip_id = tm.trip_id AND tda.member_id = tm.member_id
                WHERE tm.trip_id=:tripId
                ORDER BY tm.joined_at, tm.member_id, tda.available_date
                """).param("tripId", tripId).query((rs, rowNum) -> {
                    long memberId = rs.getLong("member_id");
                    String nickname = rs.getString("nickname");
                    String profileImageUrl = rs.getString("profile_image_url");
                    AvailabilityBuilder member = grouped.computeIfAbsent(memberId,
                            ignored -> new AvailabilityBuilder(
                                    memberId,
                                    nickname,
                                    profileImageUrl,
                                    new ArrayList<>()));
                    LocalDate date = rs.getObject("available_date", LocalDate.class);
                    if (date != null) {
                        member.dates().add(date);
                    }
                    return rowNum;
                }).list();
        return grouped.values().stream()
                .map(member -> new DateAvailabilityResponse(
                        member.memberId(),
                        member.nickname(),
                        member.profileImageUrl(),
                        List.copyOf(member.dates())))
                .toList();
    }

    @Transactional
    public DateProposalResponse propose(Long tripId, DateProposalRequest request) {
        Long memberId = accessChecker.requireMember(tripId);
        lockTripForUpdate(tripId);
        validateRange(request.startDate(), request.endDate());
        Proposal existingProposal = findProposalOptional(tripId);
        if (existingProposal != null
                && "OPEN".equals(existingProposal.status())
                && existingProposal.startDate().equals(request.startDate())
                && existingProposal.endDate().equals(request.endDate())) {
            return summarize(existingProposal, memberId);
        }

        LocalDateTime now = LocalDateTime.now();
        if (existingProposal == null) {
            jdbcClient.sql("""
                    INSERT INTO trip_date_proposals(trip_id, proposed_by, start_date, end_date, status, created_at, updated_at)
                    VALUES (:tripId, :memberId, :startDate, :endDate, 'OPEN', :now, :now)
                    """).param("tripId", tripId).param("memberId", memberId)
                    .param("startDate", request.startDate()).param("endDate", request.endDate())
                    .param("now", now).update();
        } else {
            jdbcClient.sql("DELETE FROM trip_date_votes WHERE proposal_id=:proposalId")
                    .param("proposalId", existingProposal.id()).update();
            jdbcClient.sql("""
                    UPDATE trip_date_proposals SET proposed_by=:memberId, start_date=:startDate,
                    end_date=:endDate, status='OPEN', updated_at=:now WHERE id=:proposalId
                    """).param("memberId", memberId).param("startDate", request.startDate())
                    .param("endDate", request.endDate()).param("now", now)
                    .param("proposalId", existingProposal.id()).update();
        }
        DateProposalResponse result = getProposal(tripId);
        collaborationEventService.record(
                tripId,
                memberId,
                "DATE_PROPOSAL_UPDATED",
                "DATE_PROPOSAL",
                result.proposalId(),
                request.startDate() + "부터 " + request.endDate() + "까지 여행 기간이 제안됐습니다.",
                Map.of(
                        "startDate", request.startDate().toString(),
                        "endDate", request.endDate().toString()
                ),
                NotificationType.ITINERARY,
                "여행 기간 제안"
        );
        return result;
    }

    public DateProposalResponse getProposal(Long tripId) {
        Long memberId = accessChecker.requireView(tripId);
        Proposal proposal = findProposalOptional(tripId);
        if (proposal == null) {
            Trip trip = tripRepository.findById(tripId)
                    .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
            if (trip.getStartDate() != null && trip.getEndDate() != null) {
                return new DateProposalResponse(null, trip.getStartDate(), trip.getEndDate(),
                        "CONFIRMED", 0, 0, 0, null);
            }
            return null;
        }
        return summarize(proposal, memberId);
    }

    @Transactional
    public DateProposalResponse vote(Long tripId, DateVoteRequest request) {
        Long memberId = accessChecker.requireMember(tripId);
        Trip trip = lockTripForUpdate(tripId);
        Proposal proposal = findProposal(tripId);
        if (!"OPEN".equals(proposal.status())) {
            throw new BusinessException(TripErrorCode.DATE_PROPOSAL_CLOSED);
        }
        LocalDateTime now = LocalDateTime.now();
        int updated = jdbcClient.sql("""
                UPDATE trip_date_votes SET choice=:choice, updated_at=:now
                WHERE proposal_id=:proposalId AND member_id=:memberId
                """).param("proposalId", proposal.id()).param("memberId", memberId)
                .param("choice", request.choice().name()).param("now", now).update();
        if (updated == 0) {
            jdbcClient.sql("""
                    INSERT INTO trip_date_votes(proposal_id, member_id, choice, created_at, updated_at)
                    VALUES (:proposalId, :memberId, :choice, :now, :now)
                    """).param("proposalId", proposal.id()).param("memberId", memberId)
                    .param("choice", request.choice().name()).param("now", now).update();
        }
        DateProposalResponse result = summarize(proposal, memberId);
        String choiceLabel = request.choice() == DateVoteRequest.Choice.AGREE ? "찬성" : "반대";
        if (result.agreeCount() >= result.requiredCount()) {
            trip.confirmDates(proposal.startDate(), proposal.endDate());
            int confirmed = jdbcClient.sql("""
                    UPDATE trip_date_proposals
                    SET status='CONFIRMED', updated_at=:now
                    WHERE id=:id AND status='OPEN'
                    """)
                    .param("now", now)
                    .param("id", proposal.id())
                    .update();
            if (confirmed == 0) {
                throw new BusinessException(TripErrorCode.DATE_PROPOSAL_CLOSED);
            }
            result = new DateProposalResponse(result.proposalId(), result.startDate(), result.endDate(),
                    "CONFIRMED", result.agreeCount(), result.disagreeCount(),
                    result.requiredCount(), result.myChoice());
            collaborationEventService.record(
                    tripId,
                    memberId,
                    "TRIP_DATES_CONFIRMED",
                    "DATE_PROPOSAL",
                    proposal.id(),
                    proposal.startDate() + "부터 " + proposal.endDate() + "까지 여행 기간이 확정됐습니다.",
                    Map.of(
                            "startDate", proposal.startDate().toString(),
                            "endDate", proposal.endDate().toString()
                    ),
                    NotificationType.ITINERARY,
                    "여행 기간 확정"
            );
        } else {
            collaborationEventService.record(
                    tripId,
                    memberId,
                    "DATE_PROPOSAL_VOTED",
                    "DATE_PROPOSAL",
                    proposal.id(),
                    "여행 기간 제안에 " + choiceLabel + " 의견이 등록됐습니다.",
                    Map.of("choice", request.choice().name()),
                    NotificationType.VOTE,
                    "여행 기간 투표"
            );
        }
        return result;
    }

    private Trip lockTripForUpdate(Long tripId) {
        return tripRepository.findByIdForUpdate(tripId)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }

    private Proposal findProposal(Long tripId) {
        Proposal proposal = findProposalOptional(tripId);
        if (proposal == null) {
            throw new BusinessException(TripErrorCode.DATE_PROPOSAL_NOT_FOUND);
        }
        return proposal;
    }

    private Proposal findProposalOptional(Long tripId) {
        return jdbcClient.sql("""
                SELECT id, start_date, end_date, status FROM trip_date_proposals WHERE trip_id=:tripId
                """).param("tripId", tripId).query((rs, rowNum) -> new Proposal(
                        rs.getLong("id"), rs.getObject("start_date", LocalDate.class),
                        rs.getObject("end_date", LocalDate.class), rs.getString("status")))
                .optional().orElse(null);
    }

    private DateProposalResponse summarize(Proposal proposal, Long memberId) {
        Map<String, Long> counts = jdbcClient.sql("""
                SELECT tdv.choice, COUNT(*) vote_count
                FROM trip_date_votes tdv
                JOIN trip_date_proposals tdp ON tdp.id = tdv.proposal_id
                JOIN trip_members tm
                  ON tm.trip_id = tdp.trip_id AND tm.member_id = tdv.member_id
                WHERE tdv.proposal_id=:proposalId
                GROUP BY tdv.choice
                """).param("proposalId", proposal.id()).query((rs, rowNum) ->
                Map.entry(rs.getString("choice"), rs.getLong("vote_count")))
                .list().stream().collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        DateVoteRequest.Choice myChoice = jdbcClient.sql("""
                SELECT choice FROM trip_date_votes WHERE proposal_id=:proposalId AND member_id=:memberId
                """).param("proposalId", proposal.id()).param("memberId", memberId)
                .query(String.class).optional().map(DateVoteRequest.Choice::valueOf).orElse(null);
        int memberCount = tripMemberRepository.findMemberIdsByTripId(
                jdbcClient.sql("SELECT trip_id FROM trip_date_proposals WHERE id=:id")
                        .param("id", proposal.id()).query(Long.class).single()).size();
        return new DateProposalResponse(proposal.id(), proposal.startDate(), proposal.endDate(), proposal.status(),
                counts.getOrDefault("AGREE", 0L).intValue(), counts.getOrDefault("DISAGREE", 0L).intValue(),
                memberCount / 2 + 1, myChoice);
    }

    private void validateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP);
        }
    }

    private void validateAvailabilityDates(Set<LocalDate> dates) {
        boolean unsupportedDate = dates.stream().anyMatch(date ->
                date.isBefore(MIN_AVAILABILITY_DATE) || date.isAfter(MAX_AVAILABILITY_DATE));
        if (dates.size() > MAX_AVAILABILITY_DATES || unsupportedDate) {
            throw new BusinessException(TripErrorCode.INVALID_DATE_AVAILABILITY);
        }
    }

    private record Proposal(Long id, LocalDate startDate, LocalDate endDate, String status) {}
    private record AvailabilityBuilder(
            Long memberId,
            String nickname,
            String profileImageUrl,
            List<LocalDate> dates
    ) {}
}
