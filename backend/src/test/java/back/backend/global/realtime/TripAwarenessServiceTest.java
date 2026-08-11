package back.backend.global.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.global.exception.BusinessException;
import java.security.Principal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class TripAwarenessServiceTest {

    @Test
    @DisplayName("t1 여행방 멤버가 협업 상태를 보내면 서버가 인증 회원 ID로 전파한다")
    void t1_memberAwarenessUsesAuthenticatedMemberId() {
        TripMemberRepository tripMemberRepository = mock(TripMemberRepository.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        TripAwarenessService service =
                new TripAwarenessService(tripMemberRepository, messagingTemplate);
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 7L)).thenReturn(true);
        Principal principal = () -> "7";
        TripAwarenessRequest request = new TripAwarenessRequest(
                "schedule", 2, "place-1", "도톤보리", 34.6937, 135.5023, 15.0,
                "itinerary", "item-3", "도톤보리 일정 편집 중"
        );

        service.publish(10L, request, principal);

        ArgumentCaptor<TripAwarenessEvent> eventCaptor =
                ArgumentCaptor.forClass(TripAwarenessEvent.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/trip-awareness/10"), eventCaptor.capture());
        TripAwarenessEvent event = eventCaptor.getValue();
        assertThat(event.tripId()).isEqualTo(10L);
        assertThat(event.memberId()).isEqualTo(7L);
        assertThat(event.workspace()).isEqualTo("schedule");
        assertThat(event.selectedDay()).isEqualTo(2);
        assertThat(event.editingLabel()).isEqualTo("도톤보리 일정 편집 중");
        assertThat(event.occurredAt()).isNotNull();
    }

    @Test
    @DisplayName("t2 여행방 멤버가 아니면 협업 상태를 전파하지 않는다")
    void t2_nonMemberCannotPublishAwareness() {
        TripMemberRepository tripMemberRepository = mock(TripMemberRepository.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        TripAwarenessService service =
                new TripAwarenessService(tripMemberRepository, messagingTemplate);
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 7L)).thenReturn(false);

        assertThatThrownBy(() -> service.publish(
                10L,
                new TripAwarenessRequest(
                        "places", null, null, null, null, null, null,
                        null, null, null
                ),
                () -> "7"
        )).isInstanceOf(BusinessException.class);
        verify(messagingTemplate, never()).convertAndSend(
                eq("/topic/trip-awareness/10"), org.mockito.ArgumentMatchers.any(Object.class));
    }
}
