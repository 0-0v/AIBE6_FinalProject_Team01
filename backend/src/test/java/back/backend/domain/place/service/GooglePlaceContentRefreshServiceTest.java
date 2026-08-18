package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.global.exception.BusinessException;
import back.backend.domain.place.exception.PlaceErrorCode;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class GooglePlaceContentRefreshServiceTest {

    @Mock PlaceSearchService placeSearchService;
    @Mock PlaceRepository placeRepository;

    private GooglePlaceContentRefreshService service;
    private Place place;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-13T00:00:00Z"), ZoneOffset.UTC);
        service = new GooglePlaceContentRefreshService(placeSearchService, placeRepository, clock);
        place = Place.builder()
                .googlePlaceId("ChIJfresh")
                .name("이전 이름")
                .address("이전 주소")
                .latitude(new BigDecimal("37.0000000"))
                .longitude(new BigDecimal("127.0000000"))
                .googleContentFetchedAt(LocalDateTime.of(2026, 7, 1, 0, 0))
                .build();
        ReflectionTestUtils.setField(place, "id", 1L);
    }

    @Test
    @DisplayName("t1 Google 장소 정보가 30일 미만이면 외부 API를 호출하지 않는다")
    void t1_freshContentSkipsRefresh() {
        ReflectionTestUtils.setField(place, "googleContentFetchedAt",
                LocalDateTime.of(2026, 8, 1, 0, 0));

        assertThat(service.ensureFresh(place)).isTrue();

        then(placeSearchService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("t2 Google 장소 정보가 30일 이상이면 Place ID로 재조회하고 갱신한다")
    void t2_expiredContentIsRefreshed() {
        given(placeSearchService.getPlaceDetails("ChIJfresh"))
                .willReturn(details("새 이름", "새 주소", 37.5, 127.5));
        given(placeRepository.findById(1L)).willReturn(Optional.of(place));

        assertThat(service.ensureFresh(place)).isTrue();

        assertThat(place.getName()).isEqualTo("새 이름");
        assertThat(place.getLatitude()).isEqualByComparingTo("37.5");
        then(placeRepository).should().saveAndFlush(place);
    }

    @Test
    @DisplayName("t3 만료된 Google 장소 정보를 재조회하지 못하면 사용 불가로 처리한다")
    void t3_failedRefreshMakesContentUnavailable() {
        given(placeSearchService.getPlaceDetails("ChIJfresh"))
                .willThrow(new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR));

        assertThat(service.ensureFresh(place)).isFalse();

        then(placeRepository).should(never()).saveAndFlush(place);
    }

    @Test
    @DisplayName("t4 강제 갱신은 캐시 기간이 남아도 Place ID로 재조회한다")
    void t4_forcedRefreshIgnoresFreshCache() {
        ReflectionTestUtils.setField(place, "googleContentFetchedAt",
                LocalDateTime.of(2026, 8, 1, 0, 0));
        given(placeSearchService.getPlaceDetails("ChIJfresh"))
                .willReturn(details("검증된 이름", "검증된 주소", 37.5, 127.5));
        given(placeRepository.findById(1L)).willReturn(Optional.of(place));

        assertThat(service.refreshNow(place)).isTrue();

        assertThat(place.getName()).isEqualTo("검증된 이름");
        then(placeSearchService).should().getPlaceDetails("ChIJfresh");
    }

    private PlaceSearchResponse details(
            String name, String address, double latitude, double longitude
    ) {
        return new PlaceSearchResponse(
                "ChIJfresh", name, address, latitude, longitude, "restaurant",
                List.of("restaurant"), null, null, null, null, null, List.of(),
                null, null, null, null, null, null, null
        );
    }
}
