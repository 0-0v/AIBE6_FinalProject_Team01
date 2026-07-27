package back.backend.domain.itinerary.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.global.config.JpaConfig;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class ItineraryItemRepositoryTest {

    @Autowired ItineraryDayRepository dayRepository;
    @Autowired ItineraryItemRepository itemRepository;

    @Test
    @DisplayName("t1 여행 일정 전체에 배치된 장소를 조회한다")
    void t1_existsByTripAndTripPlaceFindsItemAcrossDays() {
        ItineraryDay firstDay = dayRepository.save(
                ItineraryDay.create(1L, LocalDate.of(2026, 8, 1), 1)
        );
        itemRepository.saveAndFlush(ItineraryItem.create(firstDay, 100L, 0));

        assertThat(itemRepository.existsByItineraryDayTripIdAndTripPlaceId(1L, 100L))
                .isTrue();
        assertThat(itemRepository.existsByItineraryDayTripIdAndTripPlaceId(2L, 100L))
                .isFalse();
    }

    @Test
    @DisplayName("t2 동일한 여행 장소를 여러 Day에 저장하면 유일 제약 위반이 발생한다")
    void t2_duplicateTripPlaceAcrossDaysViolatesUniqueConstraint() {
        List<ItineraryDay> days = dayRepository.saveAll(List.of(
                ItineraryDay.create(1L, LocalDate.of(2026, 8, 1), 1),
                ItineraryDay.create(1L, LocalDate.of(2026, 8, 2), 2)
        ));
        itemRepository.saveAndFlush(ItineraryItem.create(days.get(0), 100L, 0));

        assertThatThrownBy(() ->
                itemRepository.saveAndFlush(ItineraryItem.create(days.get(1), 100L, 0))
        ).isInstanceOf(DataIntegrityViolationException.class);
    }
}
