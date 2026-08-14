package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

import back.backend.domain.place.entity.MapPin;
import back.backend.domain.place.repository.MapPinRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@ExtendWith(MockitoExtension.class)
class MapPinPersistenceServiceTest {

    @Mock private MapPinRepository mapPinRepository;
    @Mock private PlatformTransactionManager transactionManager;

    private MapPinPersistenceService mapPinPersistenceService;
    private MapPin candidate;

    @BeforeEach
    void setUp() {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager) {
            @Override
            public <T> T execute(org.springframework.transaction.support.TransactionCallback<T> action) {
                return action.doInTransaction(null);
            }
        };
        mapPinPersistenceService = new MapPinPersistenceService(
                mapPinRepository,
                transactionTemplate
        );
        candidate = MapPin.builder()
                .tripId(1L)
                .googlePlaceId("ChIJpin")
                .lat(37.5)
                .lng(127.0)
                .placeName("테스트 장소")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("t1 핀이 이미 존재하면 최신 Google 장소 정보와 조회 시각으로 갱신한다")
    void t1_existingPinRefreshesGoogleContent() {
        MapPin existing = MapPin.builder()
                .tripId(1L)
                .googlePlaceId("ChIJpin")
                .lat(37.0)
                .lng(126.0)
                .placeName("이전 장소")
                .createdAt(LocalDateTime.now().minusMonths(2))
                .googleContentFetchedAt(LocalDateTime.now().minusMonths(2))
                .build();
        given(mapPinRepository.findByTripIdAndGooglePlaceId(1L, "ChIJpin"))
                .willReturn(Optional.of(existing));

        MapPin result = mapPinPersistenceService.findOrCreate(candidate);

        assertThat(result).isSameAs(existing);
        assertThat(result.getPlaceName()).isEqualTo("테스트 장소");
        assertThat(result.getLat()).isEqualTo(37.5);
        then(mapPinRepository).should(never()).saveAndFlush(any(MapPin.class));
    }

    @Test
    @DisplayName("t2 핀이 없으면 새 핀을 즉시 저장한다")
    void t2_missingPinIsInsertedAndFlushed() {
        given(mapPinRepository.findByTripIdAndGooglePlaceId(1L, "ChIJpin"))
                .willReturn(Optional.empty());
        given(mapPinRepository.saveAndFlush(candidate)).willReturn(candidate);

        MapPin result = mapPinPersistenceService.findOrCreate(candidate);

        assertThat(result).isSameAs(candidate);
    }

    @Test
    @DisplayName("t3 동시 삽입 충돌이 발생하면 별도 트랜잭션에서 기존 핀을 다시 조회한다")
    void t3_concurrentInsertConflictReloadsExistingPin() {
        given(mapPinRepository.findByTripIdAndGooglePlaceId(1L, "ChIJpin"))
                .willReturn(Optional.empty(), Optional.of(candidate));
        given(mapPinRepository.saveAndFlush(candidate))
                .willThrow(new DataIntegrityViolationException(
                        "Duplicate entry for uk_map_pins_trip_place"
                ));

        MapPin result = mapPinPersistenceService.findOrCreate(candidate);

        assertThat(result).isSameAs(candidate);
        then(mapPinRepository).should(times(2))
                .findByTripIdAndGooglePlaceId(1L, "ChIJpin");
    }

    @Test
    @DisplayName("t4 핀 중복 외 무결성 오류는 그대로 전달한다")
    void t4_unrelatedConstraintViolationIsRethrown() {
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "foreign key fk_map_pins_trip"
        );
        given(mapPinRepository.findByTripIdAndGooglePlaceId(1L, "ChIJpin"))
                .willReturn(Optional.empty());
        given(mapPinRepository.saveAndFlush(candidate)).willThrow(exception);

        assertThatThrownBy(() -> mapPinPersistenceService.findOrCreate(candidate))
                .isSameAs(exception);
    }
}
