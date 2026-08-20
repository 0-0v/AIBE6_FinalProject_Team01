package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.GooglePlacesApiResponse;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.dto.response.PlaceOperationalDetails;
import back.backend.domain.place.dto.response.DestinationMetadataResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import back.backend.global.util.GeoDistanceCalculator;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.service.ExternalApiUsageService;

@Service
public class PlaceSearchService {

    private static final String GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1";
    private static final double ROOM_SEARCH_RADIUS_METERS = 50_000.0;
    private static final int MAX_SEARCH_RESULTS = 15;
    private static final String FIELD_MASK =
            "places.id,places.displayName,places.formattedAddress,places.location," +
            "places.primaryType,places.types," +
            "places.rating,places.userRatingCount";
    private static final String DETAILS_FIELD_MASK =
            "id,businessStatus,currentOpeningHours.openNow," +
            "currentOpeningHours.nextOpenTime,currentOpeningHours.nextCloseTime," +
            "currentOpeningHours.weekdayDescriptions,currentOpeningHours.periods," +
            "regularOpeningHours.weekdayDescriptions";
    private static final String PLACE_DETAILS_FIELD_MASK =
            "id,displayName,formattedAddress,location,primaryType,types,rating,userRatingCount";

    private final RestClient restClient;
    private ExternalApiUsageService usageService;
    private GoogleMapsQuotaGuard quotaGuard;

    @Autowired
    void setUsageService(ExternalApiUsageService usageService) {
        this.usageService = usageService;
    }
    @Autowired
    void setQuotaGuard(GoogleMapsQuotaGuard quotaGuard) {
        this.quotaGuard = quotaGuard;
    }
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
                .defaultHeader("X-Goog-Api-Key", apiKey);
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
        return search(query, null, null, null, null);
    }

    public List<PlaceSearchResponse> search(String query, String location, String includedType) {
        return search(query, location, includedType, null, null);
    }

    public List<PlaceSearchResponse> search(
            String query,
            String location,
            String includedType,
            Double latitude,
            Double longitude
    ) {
        if (!StringUtils.hasText(query) || query.trim().length() < 2) {
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED);
        }
        String normalizedQuery = query.trim();
        String fullQuery = StringUtils.hasText(location)
                ? normalizedQuery + " " + location.trim()
                : normalizedQuery;
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("textQuery", fullQuery);
        requestBody.put("languageCode", "ko");
        requestBody.put("maxResultCount", 20);
        if (StringUtils.hasText(includedType)) {
            requestBody.put("includedType", includedType);
            requestBody.put("strictTypeFiltering", true);
        }
        boolean hasRoomCenter = hasValidCoordinates(latitude, longitude);
        if (hasRoomCenter) {
            requestBody.put("locationBias", createLocationCircle(
                    latitude, longitude, ROOM_SEARCH_RADIUS_METERS));
        }
        List<PlaceSearchResponse> results = callGooglePlacesApi(requestBody);
        if (hasRoomCenter && StringUtils.hasText(includedType)) {
            List<PlaceSearchResponse> nearbyResults = results.stream()
                    .filter(place -> GeoDistanceCalculator.distanceMeters(
                            latitude, longitude, place.latitude(), place.longitude())
                            <= ROOM_SEARCH_RADIUS_METERS)
                    .toList();
            return rankSearchResults(nearbyResults, normalizedQuery);
        }
        // locationBias는 검색 순위를 보정할 뿐 결과를 자르는 경계가 아니다.
        // 전체 카테고리에서 장소명을 정확히 입력한 경우 중심에서 멀더라도 관련 결과를 보여준다.
        return rankSearchResults(results, normalizedQuery);
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
        List<PlaceSearchResponse> results = callGooglePlacesApi(Map.of(
                "textQuery", query,
                "languageCode", "ko",
                "locationBias", createLocationCircle(latitude, longitude, safeRadius)
        ));
        return rankSearchResults(results, query.trim());
    }

    private List<PlaceSearchResponse> rankSearchResults(
            List<PlaceSearchResponse> results,
            String query
    ) {
        String normalizedQuery = normalizeSearchText(query);
        return results.stream()
                .sorted(Comparator.comparingInt(result ->
                        searchMatchRank(normalizeSearchText(result.name()), normalizedQuery)))
                .limit(MAX_SEARCH_RESULTS)
                .toList();
    }

    private int searchMatchRank(String name, String query) {
        if (name.equals(query)) return 0;
        if (name.startsWith(query)) return 1;
        if (name.contains(query)) return 2;
        return 3;
    }

    private String normalizeSearchText(String value) {
        if (!StringUtils.hasText(value)) return "";
        return value.replaceAll("\\s+", "")
                .toLowerCase(Locale.ROOT);
    }

    private Map<String, Object> createLocationCircle(
            double latitude,
            double longitude,
            double radiusMeters
    ) {
        return Map.of("circle", Map.of(
                "center", Map.of(
                        "latitude", latitude,
                        "longitude", longitude
                ),
                "radius", radiusMeters
        ));
    }

    private boolean hasValidCoordinates(Double latitude, Double longitude) {
        return latitude != null
                && longitude != null
                && Double.isFinite(latitude)
                && Double.isFinite(longitude)
                && latitude >= -90.0
                && latitude <= 90.0
                && longitude >= -180.0
                && longitude <= 180.0;
    }

    private List<PlaceSearchResponse> callGooglePlacesApi(
            Map<String, Object> requestBody
    ) {
        acquireQuota();
        try {
            GooglePlacesApiResponse response = restClient.post()
                    .uri("/places:searchText")
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(GooglePlacesApiResponse.class);
            recordUsage("TEXT_SEARCH", true);
            return mapToResponses(response);
        } catch (RestClientException e) {
            recordUsage("TEXT_SEARCH", false);
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
        }
    }

    public PlaceSearchResponse getPlaceDetails(String googlePlaceId) {
        return mapToResponse(fetchPlaceById(googlePlaceId, PLACE_DETAILS_FIELD_MASK));
    }

    public PlaceOperationalDetails getOperationalDetails(String googlePlaceId) {
        GooglePlacesApiResponse.Place place = fetchPlaceById(googlePlaceId, DETAILS_FIELD_MASK);
        var current = place.currentOpeningHours();
        List<String> descriptions = current != null
                && current.weekdayDescriptions() != null
                ? current.weekdayDescriptions()
                : place.regularOpeningHours() == null
                || place.regularOpeningHours().weekdayDescriptions() == null
                ? List.of()
                : place.regularOpeningHours().weekdayDescriptions();
        return new PlaceOperationalDetails(
                place.businessStatus(),
                current == null ? null : current.openNow(),
                parseOffsetDateTime(current == null ? null : current.nextOpenTime()),
                parseOffsetDateTime(current == null ? null : current.nextCloseTime()),
                List.copyOf(descriptions),
                mapOpeningWindows(current)
        );
    }

    private GooglePlacesApiResponse.Place fetchPlaceById(String googlePlaceId, String fieldMask) {
        acquireQuota();
        try {
            GooglePlacesApiResponse.Place place = restClient.get()
                    .uri("/places/{placeId}", googlePlaceId)
                    .header("X-Goog-FieldMask", fieldMask)
                    .retrieve()
                    .body(GooglePlacesApiResponse.Place.class);
            if (place == null) {
                recordUsage("PLACE_DETAILS", false);
                throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
            }
            recordUsage("PLACE_DETAILS", true);
            return place;
        } catch (RestClientException e) {
            recordUsage("PLACE_DETAILS", false);
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
        }
    }

    public DestinationMetadataResponse getDestinationMetadata(String googlePlaceId) {
        if (!StringUtils.hasText(googlePlaceId)) {
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED);
        }
        acquireQuota();
        try {
            GooglePlacesApiResponse.Place place = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/places/{placeId}")
                            .queryParam("languageCode", "en")
                            .build(googlePlaceId))
                    .header("X-Goog-FieldMask", "displayName,addressComponents")
                    .retrieve()
                    .body(GooglePlacesApiResponse.Place.class);
            if (place == null || place.displayName() == null) {
                recordUsage("DESTINATION_METADATA", false);
                throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
            }
            recordUsage("DESTINATION_METADATA", true);
            String countryCode = place.addressComponents() == null
                    ? null
                    : place.addressComponents().stream()
                    .filter(component -> component.types() != null
                            && component.types().contains("country"))
                    .map(GooglePlacesApiResponse.AddressComponent::shortText)
                    .filter(StringUtils::hasText)
                    .findFirst()
                    .map(String::toUpperCase)
                    .orElse(null);
            return new DestinationMetadataResponse(place.displayName().text(), countryCode);
        } catch (RestClientException e) {
            recordUsage("DESTINATION_METADATA", false);
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
        }
    }

    private void recordUsage(String operation, boolean success) {
        if (usageService != null) {
            usageService.recordSafely(ExternalApiProvider.GOOGLE_PLACES, operation,
                    success, null, null);
        }
    }

    private void acquireQuota() {
        if (quotaGuard != null) {
            quotaGuard.acquire(ExternalApiProvider.GOOGLE_PLACES);
        }
    }

    private List<PlaceOperationalDetails.OpeningWindow> mapOpeningWindows(
            GooglePlacesApiResponse.CurrentOpeningHours current
    ) {
        if (current == null || current.periods() == null) return List.of();
        return current.periods().stream()
                .map(period -> toOpeningWindow(period.open(), period.close()))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private PlaceOperationalDetails.OpeningWindow toOpeningWindow(
            GooglePlacesApiResponse.OpeningPoint open,
            GooglePlacesApiResponse.OpeningPoint close
    ) {
        LocalDateTime opensAt = toLocalDateTime(open);
        LocalDateTime closesAt = toLocalDateTime(close);
        if (opensAt == null || closesAt == null) return null;
        return new PlaceOperationalDetails.OpeningWindow(opensAt, closesAt);
    }

    private LocalDateTime toLocalDateTime(
            GooglePlacesApiResponse.OpeningPoint point
    ) {
        if (point == null || point.date() == null
                || point.date().year() == null
                || point.date().month() == null
                || point.date().day() == null
                || point.hour() == null) {
            return null;
        }
        int minute = point.minute() == null ? 0 : point.minute();
        return LocalDateTime.of(
                LocalDate.of(
                        point.date().year(),
                        point.date().month(),
                        point.date().day()
                ),
                LocalTime.of(point.hour(), minute)
        );
    }

    private OffsetDateTime parseOffsetDateTime(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return OffsetDateTime.parse(value);
        } catch (RuntimeException ignored) {
            return null;
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
                null,
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
