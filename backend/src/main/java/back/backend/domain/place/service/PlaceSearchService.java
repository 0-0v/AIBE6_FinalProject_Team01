package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.GooglePlacesApiResponse;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
            "places.primaryType,places.types,places.photos," +
            "places.rating,places.userRatingCount," +
            "places.currentOpeningHours.openNow," +
            "places.regularOpeningHours.openNow,places.regularOpeningHours.weekdayDescriptions," +
            "places.nationalPhoneNumber,places.websiteUri," +
            "places.editorialSummary,places.reviews";

    private final RestClient restClient;
    private final String apiKey;

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
        this.apiKey = apiKey;
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
        return callGooglePlacesApi(query);
    }

    private List<PlaceSearchResponse> callGooglePlacesApi(String query) {
        try {
            Map<String, String> requestBody = Map.of(
                    "textQuery", query,
                    "languageCode", "ko"
            );
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
        String imageUrl = resolveImageUrl(place);

        Boolean openNow = Optional.ofNullable(place.regularOpeningHours())
                .map(GooglePlacesApiResponse.RegularOpeningHours::openNow)
                .orElseGet(() -> place.currentOpeningHours() != null
                        ? place.currentOpeningHours().openNow()
                        : null);

        List<String> weekdayDescriptions = place.regularOpeningHours() != null
                ? place.regularOpeningHours().weekdayDescriptions()
                : null;

        String editorialSummary = place.editorialSummary() != null
                ? place.editorialSummary().text()
                : null;

        GooglePlacesApiResponse.Review topReview = (place.reviews() != null && !place.reviews().isEmpty())
                ? place.reviews().get(0)
                : null;

        return new PlaceSearchResponse(
                place.id(),
                name,
                place.formattedAddress(),
                latitude,
                longitude,
                placeType,
                imageUrl,
                place.rating(),
                place.userRatingCount(),
                openNow,
                weekdayDescriptions,
                place.nationalPhoneNumber(),
                place.websiteUri(),
                editorialSummary,
                topReview != null && topReview.text() != null ? topReview.text().text() : null,
                topReview != null ? topReview.rating() : null,
                topReview != null && topReview.authorAttribution() != null
                        ? topReview.authorAttribution().displayName() : null,
                topReview != null ? topReview.relativePublishTimeDescription() : null
        );
    }

    private String resolveImageUrl(GooglePlacesApiResponse.Place place) {
        if (place.photos() == null || place.photos().isEmpty()) return null;
        String photoName = place.photos().get(0).name();
        return GOOGLE_PLACES_BASE_URL + "/" + photoName
                + "/media?maxWidthPx=400&key=" + apiKey;
    }

    private String firstTypeOrNull(List<String> types) {
        return types != null && !types.isEmpty() ? types.get(0) : null;
    }
}
