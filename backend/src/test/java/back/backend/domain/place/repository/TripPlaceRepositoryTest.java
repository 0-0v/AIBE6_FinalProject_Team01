package back.backend.domain.place.repository;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.global.config.JpaConfig;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class TripPlaceRepositoryTest {

    @Autowired
    private PlaceRepository placeRepository;

    @Autowired
    private TripPlaceRepository tripPlaceRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("t1 장소 목록은 우선순위 오름차순이고 미지정 장소는 마지막에 조회된다")
    void t1_findAllOrdersByPriorityWithNullLast() {
        Place place = placeRepository.save(place("ChIJorder"));
        tripPlaceRepository.save(tripPlace(place, null, TripPlaceStatus.CANDIDATE));
        tripPlaceRepository.save(tripPlace(placeRepository.save(place("ChIJsecond")), 2, TripPlaceStatus.CANDIDATE));
        tripPlaceRepository.save(tripPlace(placeRepository.save(place("ChIJfirst")), 1, TripPlaceStatus.CANDIDATE));
        entityManager.flush();
        entityManager.clear();

        List<TripPlace> result = tripPlaceRepository.findAllOrderedByTripId(1L);

        assertThat(result).extracting(TripPlace::getPriority)
                .containsExactly(1, 2, null);
        assertThat(result).allSatisfy(tripPlace -> assertThat(tripPlace.getPlace().getName()).isNotBlank());
    }

    @Test
    @DisplayName("t2 상태 필터 조회도 우선순위 오름차순을 유지한다")
    void t2_findByStatusOrdersByPriority() {
        tripPlaceRepository.save(tripPlace(
                placeRepository.save(place("ChIJhold")), 1, TripPlaceStatus.HOLD));
        tripPlaceRepository.save(tripPlace(
                placeRepository.save(place("ChIJcandidate2")), 2, TripPlaceStatus.CANDIDATE));
        tripPlaceRepository.save(tripPlace(
                placeRepository.save(place("ChIJcandidate1")), 1, TripPlaceStatus.CANDIDATE));
        entityManager.flush();
        entityManager.clear();

        List<TripPlace> result = tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                1L, TripPlaceStatus.CANDIDATE);

        assertThat(result).extracting(TripPlace::getPriority)
                .containsExactly(1, 2);
    }

    private Place place(String googlePlaceId) {
        return Place.builder()
                .googlePlaceId(googlePlaceId)
                .name(googlePlaceId)
                .latitude(33.0)
                .longitude(126.0)
                .build();
    }

    private TripPlace tripPlace(Place place, Integer priority, TripPlaceStatus status) {
        return TripPlace.builder()
                .tripId(1L)
                .place(place)
                .addedBy(1L)
                .status(status)
                .priority(priority)
                .build();
    }
}
