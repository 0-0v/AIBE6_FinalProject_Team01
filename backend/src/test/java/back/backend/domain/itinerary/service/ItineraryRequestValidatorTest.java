package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.global.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ItineraryRequestValidatorTest {

    @Test
    @DisplayName("t1 존재하는 일정 항목을 중복 없이 요청하면 순서 변경을 허용한다")
    void t1_acceptsCompleteUniqueReorderRequest() {
        ItineraryItem first = itemWithId(1L);
        ItineraryItem second = itemWithId(2L);

        assertThatCode(() -> ItineraryRequestValidator.validateReorder(
                List.of(first, second),
                List.of(2L, 1L)
        )).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("t2 일정 항목이 중복된 순서 변경 요청을 거부한다")
    void t2_rejectsDuplicateReorderRequest() {
        ItineraryItem first = itemWithId(1L);
        ItineraryItem second = itemWithId(2L);

        assertThatThrownBy(() -> ItineraryRequestValidator.validateReorder(
                List.of(first, second),
                List.of(1L, 1L)
        ))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(
                                ItineraryErrorCode.ITINERARY_INVALID_ITEM_ORDER
                        ));
    }

    @Test
    @DisplayName("t3 HH:mm 형식의 시간을 LocalTime으로 변환한다")
    void t3_parsesValidTime() {
        assertThat(ItineraryRequestValidator.parseTime("09:30"))
                .isEqualTo(LocalTime.of(9, 30));
    }

    private ItineraryItem itemWithId(Long id) {
        ItineraryItem item = mock(ItineraryItem.class);
        when(item.getId()).thenReturn(id);
        return item;
    }
}
