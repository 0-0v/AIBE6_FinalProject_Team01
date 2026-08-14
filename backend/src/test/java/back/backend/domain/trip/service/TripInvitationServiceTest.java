package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripInvitation;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripInvitationRepository;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TripInvitationServiceTest {
    @Mock TripRepository tripRepository;
    @Mock TripInvitationRepository invitationRepository;
    @Mock TripMemberRepository tripMemberRepository;
    private TripInvitationService service;

    @BeforeEach
    void setUp() {
        service = new TripInvitationService(tripRepository, invitationRepository, tripMemberRepository);
    }

    @Test
    @DisplayName("t1 여행방 멤버가 초대를 생성하면 5분 코드와 7일 링크를 반환한다")
    void t1_createInvitationReturnsPersistedCode() {
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip()));
        when(invitationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(1L, 10L);

        assertThat(response.inviteCode()).hasSize(6);
        assertThat(response.inviteToken()).hasSize(32);
        assertThat(response.codeExpiresAt()).isBefore(LocalDateTime.now().plusMinutes(6));
        assertThat(response.linkExpiresAt()).isAfter(LocalDateTime.now().plusDays(6));
    }

    @Test
    @DisplayName("t2 비로그인 사용자가 유효한 초대 코드로 조회하면 여행방 정보를 반환한다")
    void t2_previewInvitationReturnsTrip() {
        TripInvitation invitation = TripInvitation.create(10L, "valid-code", "123456", 1L,
                LocalDateTime.now().plusMinutes(5), LocalDateTime.now().plusDays(1));
        when(invitationRepository.findByInviteCode("valid-code")).thenReturn(Optional.of(invitation));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip()));
        when(tripMemberRepository.countByTripId(10L)).thenReturn(1L);

        assertThat(service.preview("valid-code").title()).isEqualTo("제주 여행");
    }

    @Test
    @DisplayName("t3 만료된 초대 코드로 조회하면 초대 링크 없음 예외가 발생한다")
    void t3_previewInvitationRejectsExpiredCode() {
        TripInvitation invitation = TripInvitation.create(10L, "expired", "123456", 1L,
                LocalDateTime.now().minusMinutes(1), LocalDateTime.now().minusMinutes(1));
        when(invitationRepository.findByInviteCode("expired")).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> service.preview("expired"))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(TripErrorCode.INVITATION_NOT_FOUND));
    }

    private Trip trip() { return Trip.create(1L, "제주 여행", null, Set.of(), null, null, null); }
}
