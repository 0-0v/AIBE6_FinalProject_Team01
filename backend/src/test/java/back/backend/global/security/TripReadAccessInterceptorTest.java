package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import back.backend.domain.place.service.TripAccessChecker;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

class TripReadAccessInterceptorTest {

    private final TripAccessChecker accessChecker = mock(TripAccessChecker.class);
    private final TripReadAccessInterceptor interceptor =
            new TripReadAccessInterceptor(accessChecker);

    @Test
    @DisplayName("t1 여행방 하위 GET 요청은 공통 조회 권한을 검사한다")
    void t1_getTripResourceRequiresViewAccess() throws Exception {
        MockHttpServletRequest request = request("GET", 42L);

        boolean allowed = interceptor.preHandle(
                request,
                new MockHttpServletResponse(),
                new Object()
        );

        assertThat(allowed).isTrue();
        verify(accessChecker).requireView(42L);
    }

    @Test
    @DisplayName("t2 여행방 수정 요청은 기존 수정 권한 검사에 맡긴다")
    void t2_nonGetTripResourceSkipsReadAccessCheck() throws Exception {
        MockHttpServletRequest request = request("POST", 42L);

        boolean allowed = interceptor.preHandle(
                request,
                new MockHttpServletResponse(),
                new Object()
        );

        assertThat(allowed).isTrue();
        verifyNoInteractions(accessChecker);
    }

    @Test
    @DisplayName("t3 여행방 식별자가 없는 GET 요청은 공통 검사 대상에서 제외한다")
    void t3_getWithoutTripIdSkipsReadAccessCheck() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/trips");

        boolean allowed = interceptor.preHandle(
                request,
                new MockHttpServletResponse(),
                new Object()
        );

        assertThat(allowed).isTrue();
        verifyNoInteractions(accessChecker);
    }

    private MockHttpServletRequest request(String method, Long tripId) {
        MockHttpServletRequest request = new MockHttpServletRequest(
                method,
                "/api/trips/" + tripId + "/places"
        );
        request.setAttribute(
                HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,
                Map.of("tripId", tripId.toString())
        );
        return request;
    }
}
