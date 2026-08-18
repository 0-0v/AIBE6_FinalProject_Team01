package back.backend.domain.place.service;

import back.backend.domain.place.entity.Place;
import back.backend.domain.place.repository.PlaceRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class PlacePersistenceServiceTest {

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    private PlacePersistenceService placePersistenceService;
    private Place place;

    @BeforeEach
    void setUp() {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager) {
            @Override
            public <T> T execute(org.springframework.transaction.support.TransactionCallback<T> action) {
                return action.doInTransaction(null);
            }
        };
        placePersistenceService = new PlacePersistenceService(
                placeRepository,
                transactionTemplate
        );
        place = Place.builder()
                .googlePlaceId("ChIJxxx")
                .name("오설록 티 뮤지엄")
                .latitude(new BigDecimal("33.3065000"))
                .longitude(new BigDecimal("126.2897000"))
                .build();
        ReflectionTestUtils.setField(place, "id", 20L);
    }

    @Test
    @DisplayName("t1 장소가 이미 존재하면 검증되지 않은 요청값으로 덮어쓰지 않는다")
    void t1_existingPlaceIsNotOverwrittenByRequest() {
        Place existing = Place.builder()
                .googlePlaceId("ChIJxxx")
                .name("이전 이름")
                .latitude(new BigDecimal("33.0000000"))
                .longitude(new BigDecimal("126.0000000"))
                .googleContentFetchedAt(LocalDateTime.of(2026, 7, 1, 0, 0))
                .build();
        ReflectionTestUtils.setField(existing, "id", 20L);
        given(placeRepository.findByGooglePlaceId("ChIJxxx")).willReturn(Optional.of(existing));

        Place result = placePersistenceService.findOrCreate(place);

        assertThat(result).isSameAs(existing);
        assertThat(result.getName()).isEqualTo("이전 이름");
        assertThat(result.getLatitude()).isEqualByComparingTo("33.0000000");
        then(placeRepository).should(never()).saveAndFlush(any(Place.class));
    }

    @Test
    @DisplayName("t2 장소가 없으면 새 장소를 저장한다")
    void t2_missingPlaceIsInserted() {
        given(placeRepository.findByGooglePlaceId("ChIJxxx")).willReturn(Optional.empty());
        given(placeRepository.saveAndFlush(place)).willReturn(place);

        Place result = placePersistenceService.findOrCreate(place);

        assertThat(result).isSameAs(place);
    }

    @Test
    @DisplayName("t3 동시 삽입 충돌이 발생하면 다른 요청이 저장한 장소를 다시 조회한다")
    void t3_concurrentInsertConflictReloadsExistingPlace() {
        given(placeRepository.findByGooglePlaceId("ChIJxxx"))
                .willReturn(Optional.empty(), Optional.of(place));
        given(placeRepository.saveAndFlush(place))
                .willThrow(new DataIntegrityViolationException(
                        "Duplicate entry for uk_places_google_place_id"
                ));

        Place result = placePersistenceService.findOrCreate(place);

        assertThat(result).isSameAs(place);
        then(placeRepository).should(times(2)).findByGooglePlaceId("ChIJxxx");
    }
}
