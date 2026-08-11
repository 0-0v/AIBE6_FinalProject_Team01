package back.backend.domain.place.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import back.backend.global.config.JpaConfig;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import back.backend.domain.place.entity.MapPin;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class MapPinRepositoryTest {

    @Autowired
    private MapPinRepository mapPinRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("t1 같은 트립+구글장소로는 핀을 두 번 만들 수 없다")
    void t1_uniqueConstraintPreventsDuplicatePin() {
        mapPinRepository.save(pin(1L, "ChIJduplicate"));
        entityManager.flush();

        assertThatThrownBy(() -> {
            mapPinRepository.save(pin(1L, "ChIJduplicate"));
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("t2 트립ID와 구글장소ID로 핀을 조회한다")
    void t2_findByTripIdAndGooglePlaceId() {
        mapPinRepository.save(pin(1L, "ChIJfind"));
        entityManager.flush();
        entityManager.clear();

        Optional<MapPin> result = mapPinRepository.findByTripIdAndGooglePlaceId(1L, "ChIJfind");

        assertThat(result).isPresent();
        assertThat(result.get().getPlaceName()).isEqualTo("테스트 장소");
    }

    @Test
    @DisplayName("t3 트립의 모든 핀을 조회한다")
    void t3_findAllByTripId() {
        mapPinRepository.save(pin(1L, "ChIJone"));
        mapPinRepository.save(pin(1L, "ChIJtwo"));
        mapPinRepository.save(pin(2L, "ChIJother"));
        entityManager.flush();
        entityManager.clear();

        List<MapPin> result = mapPinRepository.findAllByTripId(1L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(MapPin::getGooglePlaceId)
                .containsExactlyInAnyOrder("ChIJone", "ChIJtwo");
    }

    private MapPin pin(Long tripId, String googlePlaceId) {
        return MapPin.builder()
                .tripId(tripId)
                .googlePlaceId(googlePlaceId)
                .lat(37.5)
                .lng(127.0)
                .placeName("테스트 장소")
                .createdAt(LocalDateTime.now())
                .build();
    }
}
