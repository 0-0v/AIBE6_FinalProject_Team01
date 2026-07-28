package back.backend.domain.itinerary.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleRoutesClientTest {

    @Test
    @DisplayName("t1 지하철 경로는 Routes API에 SUBWAY 선호 조건으로 요청한다")
    void t1_requestsSubwayRouteFromRoutesApi() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server =
                MockRestServiceServer.bindTo(builder).build();
        GoogleRoutesClient client = new GoogleRoutesClient(
                builder,
                "test-key",
                "https://routes.googleapis.com"
        );
        server.expect(requestTo(
                        "https://routes.googleapis.com/directions/v2:computeRoutes"
                ))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Goog-Api-Key", "test-key"))
                .andExpect(header(
                        "X-Goog-FieldMask",
                        "routes.distanceMeters,routes.duration,"
                                + "routes.legs.steps.transitDetails"
                ))
                .andExpect(jsonPath("$.travelMode").value("TRANSIT"))
                .andExpect(jsonPath(
                        "$.transitPreferences.allowedTravelModes[0]"
                ).value("SUBWAY"))
                .andRespond(withSuccess(
                        """
                        {
                          "routes": [{
                            "distanceMeters": 2100,
                            "duration": "1080s",
                            "legs": [{"steps": [{
                              "transitDetails": {
                                "stopDetails": {
                                  "departureStop": {"name": "서울역"},
                                  "arrivalStop": {"name": "시청역"}
                                },
                                "transitLine": {
                                  "nameShort": "1호선",
                                  "vehicle": {"type": "SUBWAY"}
                                }
                              }
                            }]}]
                          }]
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        Optional<GoogleRoutesClient.RouteInfo> result =
                client.getRouteInfo(
                        33.45,
                        126.50,
                        33.46,
                        126.51,
                        "transit",
                        "subway"
                );

        assertThat(result).hasValueSatisfying(route -> {
            assertThat(route.distanceMeters()).isEqualTo(2100);
            assertThat(route.durationMinutes()).isEqualTo(18);
            assertThat(route.actualTransportMode()).isEqualTo("지하철");
            assertThat(route.transportDetail())
                    .isEqualTo("서울역 → 1호선 → 시청역");
        });
        server.verify();
    }

    @Test
    @DisplayName("t2 동일한 경로 요청은 캐시된 결과를 반환한다")
    void t2_returnsCachedRouteForSameRequest() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server =
                MockRestServiceServer.bindTo(builder).build();
        GoogleRoutesClient client = new GoogleRoutesClient(
                builder,
                "test-key",
                "https://routes.googleapis.com"
        );
        server.expect(requestTo(
                        "https://routes.googleapis.com/directions/v2:computeRoutes"
                ))
                .andRespond(withSuccess(
                        """
                        {"routes":[{"distanceMeters":500,"duration":"300s"}]}
                        """,
                        MediaType.APPLICATION_JSON
                ));

        var first = client.getRouteInfo(
                37.1, 127.1, 37.2, 127.2, "walking"
        );
        var second = client.getRouteInfo(
                37.1, 127.1, 37.2, 127.2, "walking"
        );

        assertThat(second).isEqualTo(first);
        server.verify();
    }

    @Test
    @DisplayName("t3 대중교통 출발시각을 Routes API 요청에 전달한다")
    void t3_sendsTransitDepartureTime() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server =
                MockRestServiceServer.bindTo(builder).build();
        GoogleRoutesClient client = new GoogleRoutesClient(
                builder,
                "test-key",
                "https://routes.googleapis.com"
        );
        Instant departure = Instant.parse("2026-08-01T01:00:00Z");
        server.expect(requestTo(
                        "https://routes.googleapis.com/directions/v2:computeRoutes"
                ))
                .andExpect(jsonPath("$.departureTime")
                        .value("2026-08-01T01:00:00Z"))
                .andRespond(withSuccess(
                        """
                        {"routes":[{"distanceMeters":500,"duration":"300s"}]}
                        """,
                        MediaType.APPLICATION_JSON
                ));

        client.getRouteInfo(
                37.1,
                127.1,
                37.2,
                127.2,
                "transit",
                "bus",
                departure
        );

        server.verify();
    }
}
