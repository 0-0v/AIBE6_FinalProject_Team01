package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.GooglePlacesApiResponse;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class PlaceSearchService {

    private static final String GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1";
    private static final String FIELD_MASK =
            "places.id,places.displayName,places.formattedAddress,places.location," +
            "places.primaryType,places.types," +
            "places.rating,places.userRatingCount," +
            "places.currentOpeningHours.openNow";

    private final RestClient restClient;
    @Autowired
    public PlaceSearchService(
            @Value("${app.integrations.google-maps.api-key}") String apiKey,
            @Value("${app.integrations.google-maps.referer:}") String referer,
            @Value("${app.integrations.google-maps.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.integrations.google-maps.read-timeout:5s}") Duration readTimeout) {
        this(createRestClientBuilder(connectTimeout, readTimeout), apiKey, referer);
    }

    // 테스트용 생성자 (MockRestServiceServer 바인딩)
    PlaceSearchService(RestClient.Builder builder, String apiKey) {
        this(builder, apiKey, "");
    }

    PlaceSearchService(RestClient.Builder builder, String apiKey, String referer) {
        RestClient.Builder configuredBuilder = builder
                .baseUrl(GOOGLE_PLACES_BASE_URL)
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .defaultHeader("X-Goog-FieldMask", FIELD_MASK);
        if (StringUtils.hasText(referer)) {
            configuredBuilder.defaultHeader("Referer", referer);
        }
        this.restClient = configuredBuilder.build();
    }

    private static RestClient.Builder createRestClientBuilder(
            Duration connectTimeout,
            Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        return RestClient.builder().requestFactory(requestFactory);
    }

    public List<PlaceSearchResponse> search(String query) {
        if (!StringUtils.hasText(query)) {
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED);
        }
        return callGooglePlacesApi(Map.of(
                "textQuery", query,
                "languageCode", "ko"
        ));
    }

    public List<PlaceSearchResponse> searchNearby(
            String query,
            double latitude,
            double longitude,
            double radiusMeters
    ) {
        if (!StringUtils.hasText(query)) {
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED);
        }
        double safeRadius = Math.max(500, Math.min(radiusMeters, 20_000));
        Map<String, Object> circle = Map.of(
                "center", Map.of(
                        "latitude", latitude,
                        "longitude", longitude
                ),
                "radius", safeRadius
        );
        return callGooglePlacesApi(Map.of(
                "textQuery", query,
                "languageCode", "ko",
                "locationBias", Map.of("circle", circle)
        ));
    }

    private List<PlaceSearchResponse> callGooglePlacesApi(
            Map<String, Object> requestBody
    ) {
        try {
            GooglePlacesApiResponse response = restClient.post()
                    .uri("/places:searchText")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(GooglePlacesApiResponse.class);
            return mapToResponses(response);
        } catch (RestClientException e) {
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
        }
    }

    private List<PlaceSearchResponse> mapToResponses(GooglePlacesApiResponse response) {
        if (response == null || response.places() == null) {
            return List.of();
        }
        return response.places().stream()
                .filter(place -> place.location() != null)
                .filter(place -> PlaceCategoryClassifier.isSearchable(
                        place.primaryType(),
                        place.types()
                ))
                .map(this::mapToResponse)
                .toList();
    }

    private PlaceSearchResponse mapToResponse(GooglePlacesApiResponse.Place place) {
        String name = place.displayName() != null ? place.displayName().text() : null;
        double latitude = place.location().latitude();
        double longitude = place.location().longitude();
        String placeType = StringUtils.hasText(place.primaryType())
                ? place.primaryType()
                : firstTypeOrNull(place.types());
        var recommendedCategoryType = PlaceCategoryClassifier.classify(
                place.primaryType(),
                place.types(),
                name
        );
        Boolean openNow = place.currentOpeningHours() == null
                ? null : place.currentOpeningHours().openNow();

        return new PlaceSearchResponse(
                place.id(),
                name,
                place.formattedAddress(),
                latitude,
                longitude,
                placeType,
                place.types() == null ? List.of() : List.copyOf(place.types()),
                recommendedCategoryType,
                null,
                place.rating(),
                place.userRatingCount(),
                openNow,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private String firstTypeOrNull(List<String> types) {
        return types != null && !types.isEmpty() ? types.get(0) : null;
    }
}
