package back.backend.domain.itinerary.dto.response;

import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ItineraryItemResponseTest {

    @Test
    @DisplayName("t1 일정 항목 응답에 장소 세부 타입을 포함한다")
    void t1_fromIncludesPlaceType() {
        Place place = Place.builder()
                .name("오사카역")
                .address("오사카")
                .latitude(BigDecimal.valueOf(34.7024))
                .longitude(BigDecimal.valueOf(135.4959))
                .placeType("train_station")
                .build();
        PlaceCategory category = PlaceCategory.builder()
                .name("교통")
                .categoryType(PlaceCategoryType.TRANSPORT)
                .markerColor("#64748b")
                .markerIcon(PlaceMarkerIcon.PLANE)
                .build();
        TripPlace tripPlace = TripPlace.builder()
                .id(10L)
                .place(place)
                .category(category)
                .build();
        ItineraryItem item = ItineraryItem.create(null, 10L, 0);

        ItineraryItemResponse response = ItineraryItemResponse.from(item, tripPlace);

        assertThat(response.placeType()).isEqualTo("train_station");
        assertThat(response.categoryType()).isEqualTo("TRANSPORT");
    }
}
