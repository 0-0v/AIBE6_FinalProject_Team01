package back.backend.domain.itinerary.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class GoogleDirectionsClient {

    private static final String BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";

    private final RestClient restClient;
    private final String apiKey;
    private final boolean configured;

    @Autowired
    public GoogleDirectionsClient(
            @Value("${app.integrations.google-maps.api-key:}") String apiKey,
            @Value("${app.integrations.google-maps.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.integrations.google-maps.read-timeout:5s}") Duration readTimeout
    ) {
        this.apiKey = apiKey;
        this.configured = apiKey != null && !apiKey.isBlank();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
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
        if (!configured) return Optional.empty();

        try {
            DirectionsResponse response = restClient.get()
                    .uri(BASE_URL + "?origin={origin}&destination={dest}&mode={mode}&key={key}",
                            originLat + "," + originLng,
                            destLat + "," + destLng,
                            mode,
                            apiKey)
                    .retrieve()
                    .body(DirectionsResponse.class);

            if (response == null
                    || !"OK".equals(response.status())
                    || response.routes() == null
                    || response.routes().isEmpty()) {
                log.debug("Directions API 응답 없음 또는 경로 없음: status={}", response != null ? response.status() : "null");
                return Optional.empty();
            }

            Leg leg = response.routes().get(0).legs().get(0);
            int distanceMeters = leg.distance().value();
            int durationMinutes = (int) Math.ceil(leg.duration().value() / 60.0);
            return Optional.of(new RouteInfo(distanceMeters, durationMinutes));

        } catch (Exception e) {
            log.warn("Directions API 호출 실패 — Haversine 폴백: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public record RouteInfo(int distanceMeters, int durationMinutes) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DirectionsResponse(String status, List<Route> routes) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        record Route(List<Leg> legs) {}
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Leg(DistValue distance, DistValue duration) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        record DistValue(int value, String text) {}
    }
}
