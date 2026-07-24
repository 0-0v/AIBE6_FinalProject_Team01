package back.backend.domain.place.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PlaceTest {

    @Test
    @DisplayName("t1 장소 좌표는 DECIMAL 스키마와 일치하는 BigDecimal로 보관한다")
    void t1_coordinatesUseBigDecimal() {
        Place place = Place.builder()
                .googlePlaceId("ChIJcoordinate")
                .name("좌표 테스트 장소")
                .latitude(new BigDecimal("33.3065000"))
                .longitude(new BigDecimal("126.2897000"))
                .build();

        assertThat(place.getLatitude()).isEqualByComparingTo("33.3065000");
        assertThat(place.getLongitude()).isEqualByComparingTo("126.2897000");
    }
}
