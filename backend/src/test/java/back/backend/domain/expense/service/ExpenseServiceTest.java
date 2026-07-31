package back.backend.domain.expense.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willReturn;
import static org.mockito.Mockito.spy;

import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.expense.dto.SettlementSummaryResponse;
import back.backend.domain.expense.entity.Settlement;
import back.backend.domain.expense.exception.ExpenseErrorCode;
import back.backend.domain.expense.repository.ExpenseParticipantRepository;
import back.backend.domain.expense.repository.ExpenseRepository;
import back.backend.domain.expense.repository.SettlementRepository;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.settlement.service.SettlementCalculator;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.global.exception.BusinessException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock ExpenseRepository expenseRepository;
    @Mock ExpenseParticipantRepository participantRepository;
    @Mock SettlementRepository settlementRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock TripRepository tripRepository;
    @Mock MemberRepository memberRepository;
    @Mock TripAccessChecker accessChecker;
    @Mock SettlementCalculator settlementCalculator;
    @Mock CollaborationEventService collaborationEventService;

    private ExpenseService expenseService;

    @BeforeEach
    void setUp() {
        expenseService = spy(new ExpenseService(
                expenseRepository, participantRepository, settlementRepository,
                tripMemberRepository, tripRepository, memberRepository,
                accessChecker, settlementCalculator, collaborationEventService));
    }

    @Test
    @DisplayName("t1 송금자는 자신이 보내야 하는 정산을 완료할 수 있다")
    void t1_senderCanCompleteOwnSettlement() {
        Trip trip = org.mockito.Mockito.mock(Trip.class);
        given(accessChecker.requireEdit(1L)).willReturn(2L);
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(trip.getCurrency()).willReturn("KRW");
        willReturn(List.of(
                new SettlementSummaryResponse.Transfer(
                        2L, "민수", 3L, "지현", new BigDecimal("15000.00"))))
                .given(expenseService).calculateTransfers(1L);
        given(settlementRepository.findTopByTripIdAndSenderIdAndReceiverIdOrderByUpdatedAtDesc(1L, 2L, 3L))
                .willReturn(Optional.empty());
        given(settlementRepository.save(org.mockito.ArgumentMatchers.any(Settlement.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var result = expenseService.completeTransfer(1L, 3L);

        assertThat(result.status()).isEqualTo("COMPLETED");
        assertThat(result.senderId()).isEqualTo(2L);
        assertThat(result.receiverId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("t2 송금 관계가 없는 사용자는 다른 사람의 정산을 완료할 수 없다")
    void t2_memberCannotCompleteAnotherSendersSettlement() {
        given(accessChecker.requireEdit(1L)).willReturn(2L);
        willReturn(List.of(
                new SettlementSummaryResponse.Transfer(
                        4L, "영희", 3L, "지현", new BigDecimal("15000.00"))))
                .given(expenseService).calculateTransfers(1L);

        assertThatThrownBy(() -> expenseService.completeTransfer(1L, 3L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ExpenseErrorCode.SETTLEMENT_TRANSFER_NOT_FOUND);
    }
}
