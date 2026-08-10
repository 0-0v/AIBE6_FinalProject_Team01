package back.backend.global.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GeoDistanceCalculatorTest {

    @Test
    @DisplayName("t1 동일한 좌표 사이의 거리는 0미터이다")
    void t1_sameCoordinatesHaveZeroDistance() {
        double distance = GeoDistanceCalculator.distanceMeters(
                37.5665, 126.9780, 37.5665, 126.9780);

        assertThat(distance).isZero();
    }

    @Test
    @DisplayName("t2 서울과 부산 사이의 거리를 미터 단위로 계산한다")
    void t2_calculatesDistanceBetweenSeoulAndBusan() {
        double distance = GeoDistanceCalculator.distanceMeters(
                37.5665, 126.9780, 35.1796, 129.0756);

        assertThat(distance).isBetween(320_000.0, 330_000.0);
    }
}
