package back.backend.domain.collaboration.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.domain.trip.repository.TripMemberRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CollaborationEventServiceTest {

    @Mock ActivityLogService activityLogService;
    @Mock NotificationService notificationService;
    @Mock TripMemberRepository tripMemberRepository;
    @InjectMocks CollaborationEventService collaborationEventService;

    @Test
    @DisplayName("t1 여행 활동을 기록하면 모든 여행 멤버에게 알림을 생성한다")
    void t1_recordActivityAndNotifyTripMembers() {
        given(tripMemberRepository.findMemberIdsByTripId(1L))
                .willReturn(List.of(1L, 2L, 3L));

        collaborationEventService.record(
                1L,
                1L,
                "PLACE_ADDED",
                "TRIP_PLACE",
                10L,
                "장소가 등록됐습니다.",
                Map.of("placeName", "성산일출봉"),
                NotificationType.PLACE,
                "장소 등록"
        );

        then(activityLogService).should().create(any());
        then(notificationService).should(org.mockito.Mockito.times(3)).create(any());
    }

    @Test
    @DisplayName("t2 여행방에 행위자만 있어도 활동 로그와 본인 알림을 생성한다")
    void t2_recordActivityAndSelfNotificationWhenActorIsOnlyMember() {
        given(tripMemberRepository.findMemberIdsByTripId(1L)).willReturn(List.of(1L));

        collaborationEventService.record(
                1L, 1L, "PLACE_ADDED", "TRIP_PLACE", 10L,
                "장소가 등록됐습니다.", Map.of(), NotificationType.PLACE, "장소 등록");

        then(activityLogService).should().create(any());
        then(notificationService).should().create(any());
    }

    @Test
    @DisplayName("t3 행위자가 없는 시스템 활동에 수신자도 없으면 알림 생성을 건너뛴다")
    void t3_systemActivityWithoutRecipientsSkipsNotification() {
        given(tripMemberRepository.findMemberIdsByTripId(1L)).willReturn(List.of());

        collaborationEventService.record(
                1L, null, "PLACE_VOTE_EXPIRED", "TRIP_PLACE", 10L,
                "장소 투표가 만료됐습니다.", Map.of(), NotificationType.VOTE, "장소 투표 종료");

        then(activityLogService).should().create(any());
        then(notificationService).shouldHaveNoInteractions();
    }
}
