package back.backend.domain.collaboration.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.collaboration.notification.dto.NotificationCreateCommand;
import back.backend.domain.collaboration.notification.dto.NotificationResponse;
import back.backend.domain.collaboration.notification.dto.UnreadNotificationCountResponse;
import back.backend.domain.collaboration.notification.entity.Notification;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.exception.NotificationErrorCode;
import back.backend.domain.collaboration.notification.repository.NotificationRepository;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.response.PageResponse;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private MemberRepository memberRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, memberRepository);
    }

    @Test
    @DisplayName("t1 존재하는 회원에게 알림을 생성하면 생성된 알림 식별자를 반환한다")
    void t1_createReturnsNotificationIdWhenRecipientExists() {
        NotificationCreateCommand command = createCommand(1L);
        when(memberRepository.existsById(1L)).thenReturn(true);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            ReflectionTestUtils.setField(notification, "id", 10L);
            return notification;
        });

        Long notificationId = notificationService.create(command);

        assertThat(notificationId).isEqualTo(10L);
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("t2 존재하지 않는 회원에게 알림을 생성하면 수신 회원 없음 예외가 발생한다")
    void t2_createThrowsWhenRecipientDoesNotExist() {
        NotificationCreateCommand command = createCommand(2L);
        when(memberRepository.existsById(2L)).thenReturn(false);

        assertThatThrownBy(() -> notificationService.create(command))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> assertThat(((BusinessException) exception).getErrorCode())
                        .isEqualTo(NotificationErrorCode.RECIPIENT_NOT_FOUND));
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("t3 회원의 알림 목록을 조회하면 페이지 응답으로 반환한다")
    void t3_getNotificationsReturnsPagedNotificationResponses() {
        PageRequest pageable = PageRequest.of(0, 10);
        Notification notification = createNotification(1L);
        when(notificationRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(notification), pageable, 1));

        PageResponse<NotificationResponse> response = notificationService.getNotifications(1L, pageable);

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().id()).isEqualTo(10L);
        assertThat(response.content().getFirst().notificationType()).isEqualTo(NotificationType.VOTE);
        assertThat(response.totalElements()).isEqualTo(1L);
    }

    @Test
    @DisplayName("t4 회원의 읽지 않은 알림 개수를 조회한다")
    void t4_getUnreadCountReturnsUnreadNotificationCount() {
        when(notificationRepository.countByMemberIdAndReadFalse(1L)).thenReturn(3L);

        UnreadNotificationCountResponse response = notificationService.getUnreadCount(1L);

        assertThat(response.count()).isEqualTo(3L);
    }

    private NotificationCreateCommand createCommand(Long memberId) {
        return new NotificationCreateCommand(
                memberId,
                1L,
                NotificationType.VOTE,
                "장소 투표 알림",
                "새로운 장소 투표가 시작되었습니다.",
                "TRIP_PLACE",
                20L
        );
    }

    private Notification createNotification(Long memberId) {
        Notification notification = Notification.create(
                memberId,
                1L,
                NotificationType.VOTE,
                "장소 투표 알림",
                "새로운 장소 투표가 시작되었습니다.",
                "TRIP_PLACE",
                20L
        );
        ReflectionTestUtils.setField(notification, "id", 10L);
        ReflectionTestUtils.setField(notification, "createdAt", LocalDateTime.of(2026, 7, 22, 12, 0));
        return notification;
    }
}
