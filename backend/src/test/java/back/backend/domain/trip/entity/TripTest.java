package back.backend.domain.trip.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TripTest {

    @Test
    @DisplayName("t1 필수 이름으로 여행방을 생성하면 계획 중 기본값과 선택 설정을 저장한다")
    void t1_createTripStoresDefaultsAndOptionalPreferences() {
        Trip trip = Trip.create(
                1L,
                "제주 가족 여행",
                CompanionType.PARENTS,
                Set.of(TravelStyle.NATURE, TravelStyle.FOOD),
                "제주도",
                LocalDate.of(2026, 8, 12),
                LocalDate.of(2026, 8, 15)
        );

        assertThat(trip.getOwnerId()).isEqualTo(1L);
        assertThat(trip.getTitle()).isEqualTo("제주 가족 여행");
        assertThat(trip.getCompanionType()).isEqualTo(CompanionType.PARENTS);
        assertThat(trip.getTravelStyles()).containsExactlyInAnyOrder(TravelStyle.NATURE, TravelStyle.FOOD);
        assertThat(trip.getStatus()).isEqualTo(TripStatus.PLANNING);
        assertThat(trip.getVisibility()).isEqualTo(TripVisibility.PRIVATE);
        assertThat(trip.getCurrency()).isEqualTo("KRW");
        assertThat(trip.getViewCount()).isZero();
    }

    @Test
    @DisplayName("t2 공백 이름으로 여행방을 생성하면 유효성 예외가 발생한다")
    void t2_createTripRejectsBlankTitle() {
        assertThatThrownBy(() -> Trip.create(1L, "   ", null, Set.of(), null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("여행방 이름은 비어 있을 수 없습니다.");
    }

    @Test
    @DisplayName("t3 종료일이 시작일보다 빠르면 유효성 예외가 발생한다")
    void t3_createTripRejectsInvalidDateRange() {
        assertThatThrownBy(() -> Trip.create(
                1L,
                "제주 여행",
                null,
                Set.of(),
                null,
                LocalDate.of(2026, 8, 15),
                LocalDate.of(2026, 8, 12)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("여행 종료일은 시작일보다 빠를 수 없습니다.");
    }

    @Test
    @DisplayName("t4 여행 기간 중 한 날짜만 입력하면 유효성 예외가 발생한다")
    void t4_createTripRejectsIncompleteDateRange() {
        assertThatThrownBy(() -> Trip.create(
                1L,
                "제주 여행",
                null,
                Set.of(),
                null,
                LocalDate.of(2026, 8, 12),
                null
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("여행 시작일과 종료일은 함께 입력해야 합니다.");
    }
}
