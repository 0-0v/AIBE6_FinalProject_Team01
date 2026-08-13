package back.backend.domain.place.repository;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.PlaceRelation;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.global.config.JpaConfig;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class PlaceRelationRepositoryTest {

    @Autowired
    private PlaceRelationRepository placeRelationRepository;

    @Autowired
    private ItineraryItemRepository itineraryItemRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("t1 같은 Day에 함께 배치된 장소 쌍의 횟수를 여러 여행에 걸쳐 집계한다")
    void t1_aggregateCoVisitCountsGroupsPlacePairsBySharedDay() {
        // itinerary_items.trip_place_id는 전체에서 유일해야 하므로(uk_itinerary_items_trip_place),
        // "같은 장소가 여러 날 함께 배치"되는 상황은 서로 다른 여행(tripId)에서
        // 같은 Place를 각각 새 TripPlace로 저장해 재현한다.
        Place placeA = persistPlace("google-a", "장소 A");
        Place placeB = persistPlace("google-b", "장소 B");
        Place placeC = persistPlace("google-c", "장소 C");

        // 여행 1: A, B가 같은 Day에 배치
        TripPlace trip1PlaceA = persistTripPlace(1L, placeA);
        TripPlace trip1PlaceB = persistTripPlace(1L, placeB);
        ItineraryDay trip1Day = persistDay(1L, 1);
        entityManager.persist(ItineraryItem.create(trip1Day, trip1PlaceA.getId(), 0));
        entityManager.persist(ItineraryItem.create(trip1Day, trip1PlaceB.getId(), 1));

        // 여행 2: 다른 여행에서도 A, B가 같은 Day에 배치 (공동방문 2회째)
        TripPlace trip2PlaceA = persistTripPlace(2L, placeA);
        TripPlace trip2PlaceB = persistTripPlace(2L, placeB);
        ItineraryDay trip2Day = persistDay(2L, 1);
        entityManager.persist(ItineraryItem.create(trip2Day, trip2PlaceA.getId(), 0));
        entityManager.persist(ItineraryItem.create(trip2Day, trip2PlaceB.getId(), 1));

        // 여행 3: C는 혼자만 배치 (짝이 없어 집계 대상 아님)
        TripPlace trip3PlaceC = persistTripPlace(3L, placeC);
        ItineraryDay trip3Day = persistDay(3L, 1);
        entityManager.persist(ItineraryItem.create(trip3Day, trip3PlaceC.getId(), 0));
        entityManager.flush();

        List<PlaceRelationRepository.PlaceCoVisitProjection> result =
                placeRelationRepository.aggregateCoVisitCounts();

        assertThat(result).hasSize(1);
        PlaceRelationRepository.PlaceCoVisitProjection pair = result.get(0);
        assertThat(pair.getFromPlaceId()).isEqualTo(placeA.getId());
        assertThat(pair.getToPlaceId()).isEqualTo(placeB.getId());
        assertThat(pair.getPairCount()).isEqualTo(2L);
    }

    @Test
    @DisplayName("t2 주어진 장소 id 목록 안의 관계만 조회한다")
    void t2_findAllByPlaceIdsInReturnsOnlyMatchingPairs() {
        Place placeA = persistPlace("google-x", "장소 X");
        Place placeB = persistPlace("google-y", "장소 Y");
        Place placeC = persistPlace("google-z", "장소 Z");
        entityManager.persist(PlaceRelation.create(
                placeA.getId(), placeB.getId(), 3, LocalDateTime.now()
        ));
        entityManager.persist(PlaceRelation.create(
                placeA.getId(), placeC.getId(), 5, LocalDateTime.now()
        ));
        entityManager.flush();

        List<PlaceRelation> result = placeRelationRepository
                .findAllByPlaceIdsIn(List.of(placeA.getId(), placeB.getId()));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCoVisitCount()).isEqualTo(3);
    }

    private Place persistPlace(String googlePlaceId, String name) {
        Place place = Place.builder()
                .googlePlaceId(googlePlaceId)
                .name(name)
                .address("테스트 주소")
                .latitude(BigDecimal.valueOf(33.45))
                .longitude(BigDecimal.valueOf(126.50))
                .build();
        entityManager.persist(place);
        return place;
    }

    private TripPlace persistTripPlace(Long tripId, Place place) {
        PlaceCategory category = PlaceCategory.builder()
                .name("명소")
                .tripId(tripId)
                .categoryType(PlaceCategoryType.ATTRACTION)
                .markerColor("#f97316")
                .markerIcon(PlaceMarkerIcon.LANDMARK)
                .build();
        entityManager.persist(category);
        TripPlace tripPlace = TripPlace.builder()
                .tripId(tripId)
                .place(place)
                .category(category)
                .addedBy(1L)
                .status(TripPlaceStatus.SAVED)
                .build();
        entityManager.persist(tripPlace);
        return tripPlace;
    }

    private ItineraryDay persistDay(Long tripId, int dayNumber) {
        ItineraryDay day = ItineraryDay.create(
                tripId,
                LocalDate.of(2026, 8, dayNumber),
                dayNumber
        );
        entityManager.persist(day);
        return day;
    }
}
