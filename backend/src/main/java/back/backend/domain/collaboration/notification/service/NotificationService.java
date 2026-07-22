package back.backend.domain.collaboration.notification.service;

import back.backend.domain.collaboration.notification.dto.NotificationCreateCommand;
import back.backend.domain.collaboration.notification.entity.Notification;
import back.backend.domain.collaboration.notification.exception.NotificationErrorCode;
import back.backend.domain.collaboration.notification.repository.NotificationRepository;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final MemberRepository memberRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            MemberRepository memberRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.memberRepository = memberRepository;
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
        return notificationRepository.save(notification).getId();
    }
}
