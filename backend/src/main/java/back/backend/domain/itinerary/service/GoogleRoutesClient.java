package back.backend.domain.itinerary.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class GoogleRoutesClient {

    private static final String FIELD_MASK =
            "routes.distanceMeters,routes.duration,"
                    + "routes.legs.steps.transitDetails";
    private static final int CACHE_MAX_ENTRIES = 500;
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    private final RestClient restClient;
    private final String apiKey;
    private final boolean configured;
    private final Map<RouteRequestKey, CachedRoute> cache =
            java.util.Collections.synchronizedMap(
                    new LinkedHashMap<>(64, 0.75f, true) {
                        @Override
                        protected boolean removeEldestEntry(
                                Map.Entry<RouteRequestKey, CachedRoute> eldest
                        ) {
                            return size() > CACHE_MAX_ENTRIES;
                        }
                    }
            );

    @Autowired
    public GoogleRoutesClient(
            @Value("${app.integrations.google-maps.routes-api-key:}") String apiKey,
            @Value("${app.integrations.google-maps.routes-base-url:https://routes.googleapis.com}") String baseUrl,
            @Value("${app.integrations.google-maps.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.integrations.google-maps.read-timeout:5s}") Duration readTimeout
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        this.apiKey = apiKey;
        this.configured = apiKey != null && !apiKey.isBlank();
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(baseUrl)
                .build();
    }

    GoogleRoutesClient(
            RestClient.Builder builder,
            String apiKey,
            String baseUrl
    ) {
        this.apiKey = apiKey;
        this.configured = apiKey != null && !apiKey.isBlank();
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    /**
     * 두 좌표 간의 실제 이동 거리와 시간을 반환합니다.
     *
     * @param mode "walking" | "transit" | "driving"
     * @return 실패 시 Optional.empty() (호출자가 Haversine 폴백 처리)
     */
    public Optional<RouteInfo> getRouteInfo(
            double originLat, double originLng,
            double destLat, double destLng,
            String mode
    ) {
        return getRouteInfo(
                originLat,
                originLng,
                destLat,
                destLng,
                mode,
                null,
                null
        );
    }

    public Optional<RouteInfo> getRouteInfo(
            double originLat, double originLng,
            double destLat, double destLng,
            String mode,
            String transitMode
    ) {
        return getRouteInfo(
                originLat,
                originLng,
                destLat,
                destLng,
                mode,
                transitMode,
                null
        );
    }

    public Optional<RouteInfo> getRouteInfo(
            double originLat, double originLng,
            double destLat, double destLng,
            String mode,
            String transitMode,
            Instant departureTime
    ) {
        if (!configured) return Optional.empty();

        RouteRequestKey cacheKey = new RouteRequestKey(
                originLat,
                originLng,
                destLat,
                destLng,
                mode,
                transitMode,
                departureTime
        );
        CachedRoute cached = cache.get(cacheKey);
        if (cached != null
                && cached.cachedAt().plus(CACHE_TTL).isAfter(Instant.now())) {
            return Optional.of(cached.routeInfo());
        }

        try {
            String travelMode = toRoutesTravelMode(mode);
            // TRAFFIC_AWARE는 DRIVE 모드에서만 지원 (WALK, TRANSIT은 미지원)
            String routingPreference = (departureTime != null && "DRIVE".equals(travelMode))
                    ? "TRAFFIC_AWARE" : null;
            ComputeRoutesRequest request = new ComputeRoutesRequest(
                    waypoint(originLat, originLng),
                    waypoint(destLat, destLng),
                    travelMode,
                    transitMode == null
                            ? null
                            : new TransitPreferences(
                                    List.of(transitMode.toUpperCase())
                            ),
                    departureTime,
                    routingPreference
            );
            ComputeRoutesResponse response = restClient.post()
                    .uri("/directions/v2:computeRoutes")
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .body(request)
                    .retrieve()
                    .body(ComputeRoutesResponse.class);

            if (response == null
                    || response.routes() == null
                    || response.routes().isEmpty()) {
                log.debug("Routes API 응답에 경로가 없습니다.");
                return Optional.empty();
            }

            Route route = response.routes().getFirst();
            RouteInfo routeInfo = new RouteInfo(
                    route.distanceMeters(),
                    durationMinutes(route.duration()),
                    actualTransportMode(route, mode),
                    transitDetail(route)
            );
            cache.put(cacheKey, new CachedRoute(routeInfo, Instant.now()));
            return Optional.of(routeInfo);

        } catch (Exception e) {
            log.warn("Routes API 호출 실패 — Haversine 폴백: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static Waypoint waypoint(double latitude, double longitude) {
        return new Waypoint(new Location(new LatLng(latitude, longitude)));
    }

    private static String toRoutesTravelMode(String mode) {
        return switch (mode) {
            case "walking" -> "WALK";
            case "transit" -> "TRANSIT";
            default -> "DRIVE";
        };
    }

    private static int durationMinutes(String duration) {
        if (duration == null || !duration.endsWith("s")) {
            throw new IllegalArgumentException("잘못된 Routes API duration");
        }
        BigDecimal seconds = new BigDecimal(
                duration.substring(0, duration.length() - 1)
        );
        return seconds.divide(
                BigDecimal.valueOf(60),
                0,
                java.math.RoundingMode.CEILING
        ).intValueExact();
    }

    private static String actualTransportMode(
            Route route,
            String requestedMode
    ) {
        if (!"transit".equals(requestedMode)) {
            return "walking".equals(requestedMode) ? "도보" : "자동차";
        }
        List<String> vehicleTypes = transitDetails(route).stream()
                .map(TransitDetails::transitLine)
                .filter(java.util.Objects::nonNull)
                .map(TransitLine::vehicle)
                .filter(java.util.Objects::nonNull)
                .map(Vehicle::type)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (vehicleTypes.size() != 1) {
            return "대중교통";
        }
        return switch (vehicleTypes.getFirst()) {
            case "BUS", "INTERCITY_BUS", "TROLLEYBUS" -> "버스";
            case "SUBWAY", "METRO_RAIL", "HEAVY_RAIL" -> "지하철";
            case "TRAM", "LIGHT_RAIL" -> "트램";
            case "TRAIN", "COMMUTER_TRAIN", "HIGH_SPEED_TRAIN",
                    "LONG_DISTANCE_TRAIN", "MONORAIL", "RAIL" -> "기차";
            case "FERRY" -> "페리";
            case "CABLE_CAR", "FUNICULAR", "GONDOLA_LIFT" -> "케이블카";
            default -> "대중교통";
        };
    }

    private static String transitDetail(Route route) {
        String detail = transitDetails(route).stream()
                .map(transit -> {
                    String departure = stopName(
                            transit.stopDetails() != null
                                    ? transit.stopDetails().departureStop()
                                    : null
                    );
                    String arrival = stopName(
                            transit.stopDetails() != null
                                    ? transit.stopDetails().arrivalStop()
                                    : null
                    );
                    String line = lineName(transit.transitLine());
                    return java.util.stream.Stream.of(
                                    departure,
                                    line,
                                    arrival
                            )
                            .filter(value -> value != null && !value.isBlank())
                            .collect(Collectors.joining(" → "));
                })
                .filter(value -> !value.isBlank())
                .collect(Collectors.joining(" / "));
        return detail.length() <= 255 ? detail : detail.substring(0, 255);
    }

    private static List<TransitDetails> transitDetails(Route route) {
        if (route.legs() == null) {
            return List.of();
        }
        return route.legs().stream()
                .filter(java.util.Objects::nonNull)
                .flatMap(leg -> leg.steps() == null
                        ? java.util.stream.Stream.empty()
                        : leg.steps().stream())
                .map(Step::transitDetails)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private static String stopName(TransitStop stop) {
        return stop != null ? stop.name() : null;
    }

    private static String lineName(TransitLine line) {
        if (line == null) {
            return null;
        }
        return line.nameShort() != null && !line.nameShort().isBlank()
                ? line.nameShort()
                : line.name();
    }

    public record RouteInfo(
            int distanceMeters,
            int durationMinutes,
            String actualTransportMode,
            String transportDetail
    ) {
        public RouteInfo(int distanceMeters, int durationMinutes) {
            this(distanceMeters, durationMinutes, null, null);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ComputeRoutesResponse(List<Route> routes) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Route(
            int distanceMeters,
            String duration,
            List<Leg> legs
    ) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Leg(List<Step> steps) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Step(TransitDetails transitDetails) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TransitDetails(
            StopDetails stopDetails,
            TransitLine transitLine,
            String headsign
    ) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record StopDetails(
            TransitStop arrivalStop,
            TransitStop departureStop
    ) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TransitStop(String name) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TransitLine(
            String name,
            String nameShort,
            Vehicle vehicle
    ) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Vehicle(String type) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record ComputeRoutesRequest(
            Waypoint origin,
            Waypoint destination,
            String travelMode,
            TransitPreferences transitPreferences,
            Instant departureTime,
            String routingPreference
    ) {}

    private record Waypoint(Location location) {}
    private record Location(LatLng latLng) {}
    private record LatLng(double latitude, double longitude) {}
    private record TransitPreferences(List<String> allowedTravelModes) {}
    private record RouteRequestKey(
            double originLat,
            double originLng,
            double destLat,
            double destLng,
            String mode,
            String transitMode,
            Instant departureTime
    ) {}
    private record CachedRoute(RouteInfo routeInfo, Instant cachedAt) {}
}
