package back.backend.domain.itinerary.service;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.security.MemberPrincipal;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class ItineraryDateShiftIntegrationTest {

    @Autowired private ItineraryService itineraryService;
    @Autowired private MemberRepository memberRepository;
    @Autowired private TripRepository tripRepository;
    @Autowired private TripMemberRepository tripMemberRepository;
    @Autowired private ItineraryDayRepository dayRepository;
    @Autowired private ItineraryItemRepository itemRepository;
    @Autowired private EntityManager entityManager;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("t1 실제 DB에서 여행 날짜를 변경해도 일정 초기화가 예외 없이 동작한다")
    void t1_initializeItineraryShiftsDaysAgainstRealDatabase() {
        Member owner = memberRepository.save(Member.create(
                "owner@example.com", "여행자", null, AuthProvider.KAKAO, "owner-provider"));
        MemberPrincipal principal = new MemberPrincipal(owner.getId(), owner.getEmail(), List.of());
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, principal.getAuthorities()));

        Trip trip = tripRepository.save(Trip.create(
                owner.getId(), "도쿄 여행", null, Set.of(), "도쿄",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2),
                TripVisibility.PRIVATE));
        tripMemberRepository.save(TripMember.member(trip.getId(), owner.getId()));

        ItineraryDay dayOne = dayRepository.save(
                ItineraryDay.create(trip.getId(), LocalDate.of(2026, 8, 1), 1));
        itemRepository.save(ItineraryItem.create(dayOne, 999L, 0));
        dayRepository.save(ItineraryDay.create(trip.getId(), LocalDate.of(2026, 8, 2), 2));

        trip.update(
                trip.getTitle(), null, Set.of(), trip.getDestination(), null, null,
                LocalDate.of(2026, 9, 5), LocalDate.of(2026, 9, 6),
                null, null, null);
        tripRepository.save(trip);

        // 실제 서비스에서는 일정 데이터가 이전 요청(트랜잭션)에서 이미 커밋된 상태이므로,
        // 세션 1차 캐시에 남은 참조 대신 DB 상태를 새로 조회하도록 컨텍스트를 비운다.
        entityManager.flush();
        entityManager.clear();

        itineraryService.initializeItinerary(trip.getId());

        var days = dayRepository.findAllByTripIdOrderByItineraryDateAsc(trip.getId());
        assertThat(days).extracting(ItineraryDay::getItineraryDate)
                .containsExactlyInAnyOrder(LocalDate.of(2026, 9, 5), LocalDate.of(2026, 9, 6));
    }

    @Test
    @DisplayName("t2 기간 축소 시 넘치는 Day를 삭제하고 활성 Day 날짜를 충돌 없이 변경한다")
    void t2_initializeItineraryDeletesOverflowBeforeDateReassignment() {
        Member owner = memberRepository.save(Member.create(
                "owner2@example.com", "여행자2", null, AuthProvider.KAKAO, "owner-provider-2"));
        MemberPrincipal principal = new MemberPrincipal(owner.getId(), owner.getEmail(), List.of());
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, principal.getAuthorities()));

        Trip trip = tripRepository.save(Trip.create(
                owner.getId(), "제주 여행", null, Set.of(), "제주",
                LocalDate.of(2026, 7, 5), LocalDate.of(2026, 8, 2),
                TripVisibility.PRIVATE));
        tripMemberRepository.save(TripMember.member(trip.getId(), owner.getId()));

        // Day1(dn1,07-05, 빈 Day), Day2(dn2,08-01, 빈 Day), Day3(dn3,08-02, 기록 있음 - 오버플로우 대상)
        dayRepository.save(ItineraryDay.create(trip.getId(), LocalDate.of(2026, 7, 5), 1));
        dayRepository.save(ItineraryDay.create(trip.getId(), LocalDate.of(2026, 8, 1), 2));
        ItineraryDay dayThree = dayRepository.save(
                ItineraryDay.create(trip.getId(), LocalDate.of(2026, 8, 2), 3));
        itemRepository.save(ItineraryItem.create(dayThree, 999L, 0));

        // 여행 기간을 2일로 좁히면: overlap[0]=Day1(07-05)->08-01, overlap[1]=Day2(08-01)->08-02
        // 이때 Day3(오버플로우, 원래 날짜 08-02)가 Day2의 새 목표 날짜(08-02)와 그대로 겹친다.
        trip.update(
                trip.getTitle(), null, Set.of(), trip.getDestination(), null, null,
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2),
                null, null, null);
        tripRepository.save(trip);

        entityManager.flush();
        entityManager.clear();

        itineraryService.initializeItinerary(trip.getId());

        var days = dayRepository.findAllByTripIdOrderByItineraryDateAsc(trip.getId());
        assertThat(days).hasSize(2);
        assertThat(days).extracting(ItineraryDay::getItineraryDate).doesNotHaveDuplicates();
        assertThat(itemRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("t3 날짜 초기화 시 모든 Day와 일정 항목을 삭제한다")
    void t3_initializeItineraryDeletesAllDaysAndItemsWhenDatesAreCleared() {
        Member owner = memberRepository.save(Member.create(
                "owner3@example.com", "여행자3", null, AuthProvider.KAKAO, "owner-provider-3"));
        MemberPrincipal principal = new MemberPrincipal(owner.getId(), owner.getEmail(), List.of());
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, principal.getAuthorities()));

        Trip trip = tripRepository.save(Trip.create(
                owner.getId(), "부산 여행", null, Set.of(), "부산",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2),
                TripVisibility.PRIVATE));
        tripMemberRepository.save(TripMember.member(trip.getId(), owner.getId()));
        ItineraryDay day = dayRepository.save(
                ItineraryDay.create(trip.getId(), LocalDate.of(2026, 8, 1), 1));
        itemRepository.save(ItineraryItem.create(day, 999L, 0));

        trip.update(
                trip.getTitle(), null, Set.of(), trip.getDestination(), null, null,
                null, null, null, null, null);
        tripRepository.save(trip);
        entityManager.flush();
        entityManager.clear();

        itineraryService.initializeItinerary(trip.getId());

        assertThat(dayRepository.findAllByTripIdOrderByItineraryDateAsc(trip.getId()))
                .isEmpty();
        assertThat(itemRepository.findAll()).isEmpty();
    }
}
