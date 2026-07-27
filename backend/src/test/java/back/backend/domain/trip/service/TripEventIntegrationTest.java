package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.collaboration.activitylog.repository.ActivityLogRepository;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.repository.NotificationRepository;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.dto.TripRequest;
import back.backend.domain.trip.entity.TripVisibility;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class TripEventIntegrationTest {

    @Autowired private TripService tripService;
    @Autowired private MemberRepository memberRepository;
    @Autowired private ActivityLogRepository activityLogRepository;
    @Autowired private NotificationRepository notificationRepository;

    @Test
    @DisplayName("t1 여행방 생성 이벤트는 해당 여행방 활동 로그와 회원의 전체 알림에 함께 저장된다")
    void t1_createTripStoresScopedActivityLogAndGlobalNotification() {
        Member member = memberRepository.save(Member.create(
                "trip-owner@example.com", "여행방장", null, AuthProvider.KAKAO, "trip-owner-provider"));

        var trip = tripService.create(member.getId(), new TripRequest(
                "제주 여행", null, Set.of(), null, null, null, TripVisibility.PRIVATE));

        var activityLogs = activityLogRepository.findAllByTripIdOrderByCreatedAtDescIdDesc(
                trip.id(), PageRequest.of(0, 10));
        var notifications = notificationRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(
                member.getId(), PageRequest.of(0, 10));

        assertThat(activityLogs.getContent()).hasSize(1);
        assertThat(activityLogs.getContent().getFirst().getTripId()).isEqualTo(trip.id());
        assertThat(activityLogs.getContent().getFirst().getActionType()).isEqualTo("TRIP_CREATED");
        assertThat(notifications.getContent()).hasSize(1);
        assertThat(notifications.getContent().getFirst().getTripId()).isEqualTo(trip.id());
        assertThat(notifications.getContent().getFirst().getNotificationType()).isEqualTo(NotificationType.TRIP);
    }
}
