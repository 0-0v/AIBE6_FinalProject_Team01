package back.backend.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;

import back.backend.domain.collaboration.notification.repository.NotificationRepository;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PerformanceDataInitializerTest {

    @Mock MemberRepository memberRepository;
    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock ItineraryDayRepository itineraryDayRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("t1 설정한 회원 수에 맞춰 계정과 여행방 데이터를 생성한다")
    void t1_seedsConfiguredMembersAndTripData() throws Exception {
        AtomicLong memberIds = new AtomicLong(1);
        given(passwordEncoder.encode(PerformanceDataInitializer.DEFAULT_PASSWORD))
                .willReturn("encoded-password");
        given(memberRepository.findByEmailAndProvider(any(), any())).willReturn(Optional.empty());
        given(memberRepository.save(any(Member.class))).willAnswer(invocation -> {
            Member member = invocation.getArgument(0);
            ReflectionTestUtils.setField(member, "id", memberIds.getAndIncrement());
            return member;
        });
        given(tripRepository.findByTitleAndOwnerId(any(), any())).willReturn(Optional.empty());
        given(tripRepository.save(any(Trip.class))).willAnswer(invocation -> {
            Trip trip = invocation.getArgument(0);
            ReflectionTestUtils.setField(trip, "id", 100L);
            return trip;
        });

        PerformanceDataInitializer initializer = initializer(2, 2);
        initializer.run(null);

        then(passwordEncoder).should(times(1))
                .encode(PerformanceDataInitializer.DEFAULT_PASSWORD);
        then(memberRepository).should(times(2)).save(any(Member.class));
        then(tripRepository).should(times(1)).save(any(Trip.class));
        then(tripMemberRepository).should(times(2)).save(any());
        then(itineraryDayRepository).should(times(1)).saveAll(any());
        then(notificationRepository).should(times(2)).saveAll(any());
        assertThat(PerformanceDataInitializer.email(1))
                .isEqualTo("performance-user-0001@plamingo.app");
    }

    @Test
    @DisplayName("t2 허용 범위를 벗어난 회원 수 설정을 거부한다")
    void t2_rejectsOutOfRangeMemberCount() {
        assertThatThrownBy(() -> initializer(10_001, 10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("member-count");
    }

    private PerformanceDataInitializer initializer(int memberCount, int membersPerTrip) {
        return new PerformanceDataInitializer(
                memberRepository, tripRepository, tripMemberRepository,
                itineraryDayRepository, notificationRepository, passwordEncoder,
                memberCount, membersPerTrip);
    }
}
