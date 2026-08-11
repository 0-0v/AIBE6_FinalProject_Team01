package back.backend.global.realtime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import back.backend.domain.trip.repository.TripMemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TripSubscriptionAuthorizerTest {

    @Test
    @DisplayName("t1 여행방 멤버는 협업 상태 채널을 구독할 수 있다")
    void t1_memberCanSubscribeToAwarenessTopic() {
        TripMemberRepository repository = mock(TripMemberRepository.class);
        when(repository.existsByTripIdAndMemberId(10L, 7L)).thenReturn(true);
        TripSubscriptionAuthorizer authorizer = new TripSubscriptionAuthorizer(repository);

        assertThatCode(() -> authorizer.authorize("/topic/trip-awareness/10", () -> "7"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("t2 여행방 멤버가 아니면 협업 상태 채널을 구독할 수 없다")
    void t2_nonMemberCannotSubscribeToAwarenessTopic() {
        TripMemberRepository repository = mock(TripMemberRepository.class);
        when(repository.existsByTripIdAndMemberId(10L, 7L)).thenReturn(false);
        TripSubscriptionAuthorizer authorizer = new TripSubscriptionAuthorizer(repository);

        assertThatThrownBy(() ->
                authorizer.authorize("/topic/trip-awareness/10", () -> "7"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("t3 여행방과 무관한 공개 채널은 기존 구독 정책을 유지한다")
    void t3_publicTopicKeepsExistingSubscriptionPolicy() {
        TripSubscriptionAuthorizer authorizer =
                new TripSubscriptionAuthorizer(mock(TripMemberRepository.class));

        assertThatCode(() -> authorizer.authorize("/topic/public-cards", null))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("t4 잘못된 여행방 채널 주소는 구독할 수 없다")
    void t4_malformedTripTopicCannotBeSubscribed() {
        TripSubscriptionAuthorizer authorizer =
                new TripSubscriptionAuthorizer(mock(TripMemberRepository.class));

        assertThatThrownBy(() -> authorizer.authorize("/topic/trips/not-a-number", () -> "7"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("잘못된 여행방 실시간 채널입니다.");
    }
}
