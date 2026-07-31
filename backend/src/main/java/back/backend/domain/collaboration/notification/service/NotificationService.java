package back.backend.domain.collaboration.notification.service;

import back.backend.domain.collaboration.notification.dto.NotificationCreateCommand;
import back.backend.domain.collaboration.notification.dto.NotificationResponse;
import back.backend.domain.collaboration.notification.dto.ReadNotificationCountResponse;
import back.backend.domain.collaboration.notification.dto.UnreadNotificationCountResponse;
import back.backend.domain.collaboration.notification.entity.Notification;
import back.backend.domain.collaboration.notification.exception.NotificationErrorCode;
import back.backend.domain.collaboration.notification.repository.NotificationRepository;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.response.PageResponse;
import back.backend.global.realtime.RealtimeEvent;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;

    public NotificationService(
            NotificationRepository notificationRepository,
            MemberRepository memberRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.notificationRepository = notificationRepository;
        this.memberRepository = memberRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Long create(NotificationCreateCommand command) {
        if (!memberRepository.existsById(command.memberId())) {
            throw new BusinessException(NotificationErrorCode.RECIPIENT_NOT_FOUND);
        }

        Notification notification = Notification.create(
                command.memberId(),
                command.tripId(),
                command.notificationType(),
                command.title(),
                command.content(),
                command.targetType(),
                command.targetId()
        );
        Long notificationId = notificationRepository.save(notification).getId();
        eventPublisher.publishEvent(RealtimeEvent.notification(
                command.memberId(), command.tripId(), notificationId));
        return notificationId;
    }

    public PageResponse<NotificationResponse> getNotifications(Long memberId, Pageable pageable) {
        return PageResponse.from(notificationRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(memberId, pageable)
                .map(NotificationResponse::from));
    }

    public UnreadNotificationCountResponse getUnreadCount(Long memberId) {
        return new UnreadNotificationCountResponse(notificationRepository.countByMemberIdAndReadFalse(memberId));
    }

    @Transactional
    public void markAsRead(Long memberId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndMemberId(notificationId, memberId)
                .orElseThrow(() -> new BusinessException(NotificationErrorCode.NOTIFICATION_NOT_FOUND));
        notification.markAsRead(LocalDateTime.now());
        eventPublisher.publishEvent(RealtimeEvent.notification(
                memberId, notification.getTripId(), notificationId));
    }

    @Transactional
    public ReadNotificationCountResponse markAllAsRead(Long memberId) {
        int count = notificationRepository.markAllAsReadByMemberId(memberId, LocalDateTime.now());
        eventPublisher.publishEvent(RealtimeEvent.notification(memberId, null, null));
        return new ReadNotificationCountResponse(count);
    }
}
