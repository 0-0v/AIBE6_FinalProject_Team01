package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.HandlerMapping;

@ExtendWith(MockitoExtension.class)
class CompletedTripWriteInterceptorTest {

    @Mock TripRepository tripRepository;
    private CompletedTripWriteInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new CompletedTripWriteInterceptor(tripRepository);
    }

    @Test
    @DisplayName("t1 완료된 여행방의 일정 변경 요청은 거절한다")
    void t1_completedTripRejectsPlanningWrite() {
        when(tripRepository.findById(10L)).thenReturn(Optional.of(completedTrip()));
        MockHttpServletRequest request = request("POST", "/api/trips/10/itinerary/initialize", 10L);

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.TRIP_ALREADY_FINISHED));
    }

    @Test
    @DisplayName("t2 완료된 여행방의 기록 변경 요청은 허용한다")
    void t2_completedTripAllowsRecordWrite() {
        MockHttpServletRequest request = request("POST", "/api/trips/10/travel-records", 10L);

        assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
    }

    @Test
    @DisplayName("t3 완료된 여행방의 북마크 변경 요청은 허용한다")
    void t3_completedTripAllowsBookmarkWrite() {
        MockHttpServletRequest request = request("POST", "/api/trips/10/bookmarks/3", 10L);

        assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
    }

    @Test
    @DisplayName("t4 완료된 여행방의 지출 등록과 정산 변경 요청은 허용한다")
    void t4_completedTripAllowsExpenseWrite() {
        MockHttpServletRequest createRequest = request("POST", "/api/trips/10/expenses", 10L);
        MockHttpServletRequest settleRequest = request(
                "PATCH", "/api/trips/10/expenses/3/participants/2/complete", 10L);

        assertThat(interceptor.preHandle(
                createRequest, new MockHttpServletResponse(), new Object())).isTrue();
        assertThat(interceptor.preHandle(
                settleRequest, new MockHttpServletResponse(), new Object())).isTrue();
        verifyNoInteractions(tripRepository);
    }

    private MockHttpServletRequest request(String method, String uri, Long tripId) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,
                java.util.Map.of("tripId", tripId.toString()));
        return request;
    }

    private Trip completedTrip() {
        Trip trip = Trip.create(1L, "완료 여행", null, Set.of(), null, null, null);
        ReflectionTestUtils.setField(trip, "status", TripStatus.COMPLETED);
        return trip;
    }
}
