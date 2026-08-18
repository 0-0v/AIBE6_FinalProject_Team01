package back.backend.global.config;

import back.backend.domain.collaboration.notification.entity.Notification;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.repository.NotificationRepository;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("performance")
@ConditionalOnProperty(
        prefix = "app.performance.seed",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class PerformanceDataInitializer implements ApplicationRunner {

    public static final String EMAIL_PREFIX = "performance-user-";
    public static final String EMAIL_SUFFIX = "@plamingo.app";
    public static final String DEFAULT_PASSWORD = "PlamingoLoad1!";
    private static final String TRIP_TITLE_PREFIX = "성능 테스트 여행방 ";
    private static final int NOTIFICATIONS_PER_MEMBER = 5;

    private final MemberRepository memberRepository;
    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final ItineraryDayRepository itineraryDayRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final int memberCount;
    private final int membersPerTrip;

    public PerformanceDataInitializer(
            MemberRepository memberRepository,
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            ItineraryDayRepository itineraryDayRepository,
            NotificationRepository notificationRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.performance.seed.member-count:1000}") int memberCount,
            @Value("${app.performance.seed.members-per-trip:10}") int membersPerTrip
    ) {
        this.memberRepository = memberRepository;
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.itineraryDayRepository = itineraryDayRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.memberCount = requireRange(memberCount, 1, 10_000, "member-count");
        this.membersPerTrip = requireRange(membersPerTrip, 1, 100, "members-per-trip");
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String passwordHash = passwordEncoder.encode(DEFAULT_PASSWORD);
        List<Member> members = ensureMembers(passwordHash);
        LocalDate startDate = LocalDate.now().plusDays(30);

        for (int offset = 0, tripNumber = 1;
                offset < members.size(); offset += membersPerTrip, tripNumber++) {
            List<Member> group = members.subList(
                    offset, Math.min(offset + membersPerTrip, members.size()));
            Trip trip = ensureTrip(group.getFirst(), tripNumber, startDate);
            ensureMemberships(trip, group);
            ensureItinerary(trip, startDate);
        }
        ensureNotifications(members);
    }

    private List<Member> ensureMembers(String passwordHash) {
        List<Member> members = new ArrayList<>(memberCount);
        for (int index = 1; index <= memberCount; index++) {
            int memberNumber = index;
            String email = email(index);
            Member member = memberRepository.findByEmailAndProvider(email, AuthProvider.LOCAL)
                    .orElseGet(() -> memberRepository.save(Member.createLocal(
                            email, "성능사용자" + memberNumber, passwordHash)));
            members.add(member);
        }
        return members;
    }

    private Trip ensureTrip(Member owner, int tripNumber, LocalDate startDate) {
        String title = TRIP_TITLE_PREFIX + tripNumber;
        return tripRepository.findByTitleAndOwnerId(title, owner.getId())
                .orElseGet(() -> tripRepository.save(Trip.create(
                        owner.getId(), title, CompanionType.FRIENDS,
                        Set.of(TravelStyle.FOOD, TravelStyle.SHOPPING),
                        "오사카", 34.6937, 135.5023,
                        startDate, startDate.plusDays(4), TripVisibility.PRIVATE)));
    }

    private void ensureMemberships(Trip trip, List<Member> members) {
        for (Member member : members) {
            if (!tripMemberRepository.existsByTripIdAndMemberId(trip.getId(), member.getId())) {
                tripMemberRepository.save(TripMember.member(trip.getId(), member.getId()));
            }
        }
    }

    private void ensureItinerary(Trip trip, LocalDate startDate) {
        if (itineraryDayRepository.existsByTripId(trip.getId())) return;
        List<ItineraryDay> days = new ArrayList<>(5);
        for (int day = 1; day <= 5; day++) {
            days.add(ItineraryDay.create(trip.getId(), startDate.plusDays(day - 1), day));
        }
        itineraryDayRepository.saveAll(days);
    }

    private void ensureNotifications(List<Member> members) {
        for (Member member : members) {
            if (notificationRepository.countByMemberId(member.getId()) > 0) continue;
            List<Notification> notifications = new ArrayList<>(NOTIFICATIONS_PER_MEMBER);
            for (int index = 1; index <= NOTIFICATIONS_PER_MEMBER; index++) {
                notifications.add(Notification.create(
                        member.getId(), null, NotificationType.TRIP,
                        "성능 테스트 알림 " + index,
                        "실서비스형 부하테스트를 위한 알림 데이터입니다.",
                        null, null));
            }
            notificationRepository.saveAll(notifications);
        }
    }

    public static String email(int index) {
        return EMAIL_PREFIX + "%04d".formatted(index) + EMAIL_SUFFIX;
    }

    private static int requireRange(int value, int min, int max, String name) {
        if (value < min || value > max) {
            throw new IllegalArgumentException(name + " must be between " + min + " and " + max);
        }
        return value;
    }
}
