package back.backend.domain.trip.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import back.backend.global.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TripCoverImagePresetTest {

    @Test
    @DisplayName("t1 알려진 프리셋 키로 조회하면 해당 프리셋을 반환한다")
    void t1_fromReturnsMatchingPresetForKnownKey() {
        TripCoverImagePreset preset = TripCoverImagePreset.from("PRESET_1");

        assertThat(preset).isEqualTo(TripCoverImagePreset.PRESET_1);
        assertThat(preset.path()).isEqualTo("/assets/trip-covers/trip-cover-01.jpg");
    }

    @Test
    @DisplayName("t2 존재하지 않는 프리셋 키로 조회하면 예외가 발생한다")
    void t2_fromThrowsBusinessExceptionForUnknownKey() {
        assertThatThrownBy(() -> TripCoverImagePreset.from("NOT_A_PRESET"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t3 전체 프리셋 개수는 11개다")
    void t3_hasElevenPresets() {
        assertThat(TripCoverImagePreset.values()).hasSize(11);
    }
}
