package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.GooglePlacesApiResponse;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.dto.response.PlaceOperationalDetails;
import back.backend.domain.place.dto.response.DestinationMetadataResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
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
    private static final double ROOM_SEARCH_RADIUS_METERS = 50_000.0;
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;
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
        if (!hasRoomCenter) {
            return results;
        }
        return results.stream()
                .filter(place -> distanceMeters(
                        latitude, longitude, place.latitude(), place.longitude())
                        <= ROOM_SEARCH_RADIUS_METERS)
                .toList();
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
        return callGooglePlacesApi(Map.of(
                "textQuery", query,
                "languageCode", "ko",
                "locationBias", createLocationCircle(latitude, longitude, safeRadius)
        ));
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

    private double distanceMeters(
            double originLatitude,
            double originLongitude,
            double destinationLatitude,
            double destinationLongitude
    ) {
        double latitudeDelta = Math.toRadians(destinationLatitude - originLatitude);
        double longitudeDelta = Math.toRadians(destinationLongitude - originLongitude);
        double originLatitudeRadians = Math.toRadians(originLatitude);
        double destinationLatitudeRadians = Math.toRadians(destinationLatitude);
        double haversine = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
                + Math.cos(originLatitudeRadians) * Math.cos(destinationLatitudeRadians)
                * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
        double normalizedHaversine = Math.max(0.0, Math.min(1.0, haversine));
        return EARTH_RADIUS_METERS * 2 * Math.atan2(
                Math.sqrt(normalizedHaversine), Math.sqrt(1 - normalizedHaversine));
    }

    private List<PlaceSearchResponse> callGooglePlacesApi(
            Map<String, Object> requestBody
    ) {
        try {
            GooglePlacesApiResponse response = restClient.post()
                    .uri("/places:searchText")
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(GooglePlacesApiResponse.class);
            return mapToResponses(response);
        } catch (RestClientException e) {
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
        try {
            GooglePlacesApiResponse.Place place = restClient.get()
                    .uri("/places/{placeId}", googlePlaceId)
                    .header("X-Goog-FieldMask", fieldMask)
                    .retrieve()
                    .body(GooglePlacesApiResponse.Place.class);
            if (place == null) {
                throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
            }
            return place;
        } catch (RestClientException e) {
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
        }
    }

    public DestinationMetadataResponse getDestinationMetadata(String googlePlaceId) {
        if (!StringUtils.hasText(googlePlaceId)) {
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED);
        }
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
                throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
            }
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
            throw new BusinessException(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR);
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
