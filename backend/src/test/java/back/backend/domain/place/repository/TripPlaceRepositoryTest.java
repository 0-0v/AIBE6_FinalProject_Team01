package back.backend.domain.place.repository;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.global.config.JpaConfig;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
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
    private PlaceCategoryRepository placeCategoryRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("t1 장소 목록은 등록 순서대로 장소 정보를 함께 조회한다")
    void t1_findAllOrdersByIdWithPlace() {
        PlaceCategory category = placeCategoryRepository.save(category());
        Place place = placeRepository.save(place("ChIJorder"));
        tripPlaceRepository.save(tripPlace(place, category, TripPlaceStatus.SAVED));
        tripPlaceRepository.save(tripPlace(placeRepository.save(place("ChIJsecond")), category, TripPlaceStatus.SAVED));
        tripPlaceRepository.save(tripPlace(placeRepository.save(place("ChIJthird")), category, TripPlaceStatus.SAVED));
        entityManager.flush();
        entityManager.clear();

        List<TripPlace> result = tripPlaceRepository.findAllOrderedByTripId(1L);

        assertThat(result).extracting(item -> item.getPlace().getGooglePlaceId())
                .containsExactly("ChIJorder", "ChIJsecond", "ChIJthird");
        assertThat(result).allSatisfy(tripPlace -> assertThat(tripPlace.getPlace().getName()).isNotBlank());
    }

    @Test
    @DisplayName("t2 상태 필터 조회는 해당 상태의 장소만 등록 순서대로 반환한다")
    void t2_findByStatusOrdersById() {
        PlaceCategory category = placeCategoryRepository.save(category());
        tripPlaceRepository.save(tripPlace(
                placeRepository.save(place("ChIJhold")), category, TripPlaceStatus.HOLD));
        tripPlaceRepository.save(tripPlace(
                placeRepository.save(place("ChIJsaved1")), category, TripPlaceStatus.SAVED));
        tripPlaceRepository.save(tripPlace(
                placeRepository.save(place("ChIJsaved2")), category, TripPlaceStatus.SAVED));
        entityManager.flush();
        entityManager.clear();

        List<TripPlace> result = tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                1L, TripPlaceStatus.SAVED);

        assertThat(result).extracting(item -> item.getPlace().getGooglePlaceId())
                .containsExactly("ChIJsaved1", "ChIJsaved2");
    }

    @Test
    @DisplayName("t3 같은 장소라도 다른 여행방에는 등록되지 않은 것으로 조회한다")
    void t3_findByTripAndPlaceSeparatesTrips() {
        PlaceCategory category = placeCategoryRepository.save(category());
        Place place = placeRepository.save(place("ChIJshared"));
        tripPlaceRepository.save(tripPlace(1L, place, category, TripPlaceStatus.SAVED));
        entityManager.flush();
        entityManager.clear();

        assertThat(tripPlaceRepository.findByTripIdAndPlaceId(1L, place.getId())).isPresent();
        assertThat(tripPlaceRepository.findByTripIdAndPlaceId(2L, place.getId())).isEmpty();
    }

    private Place place(String googlePlaceId) {
        return Place.builder()
                .googlePlaceId(googlePlaceId)
                .name(googlePlaceId)
                .latitude(new BigDecimal("33.0000000"))
                .longitude(new BigDecimal("126.0000000"))
                .build();
    }

    private PlaceCategory category() {
        return PlaceCategory.builder()
                .tripId(1L)
                .name("기타")
                .categoryType(PlaceCategoryType.OTHER)
                .markerColor("#64748b")
                .markerIcon(PlaceMarkerIcon.MAP_PIN)
                .sortOrder(0)
                .build();
    }

    private TripPlace tripPlace(
            Place place,
            PlaceCategory category,
            TripPlaceStatus status
    ) {
        return tripPlace(1L, place, category, status);
    }

    private TripPlace tripPlace(
            Long tripId,
            Place place,
            PlaceCategory category,
            TripPlaceStatus status
    ) {
        return TripPlace.builder()
                .tripId(tripId)
                .place(place)
                .category(category)
                .addedBy(1L)
                .status(status)
                .build();
    }
}
