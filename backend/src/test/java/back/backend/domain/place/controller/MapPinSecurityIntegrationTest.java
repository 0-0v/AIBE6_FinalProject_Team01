package back.backend.domain.place.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.service.MapPinCommentService;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MapPinSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MapPinCommentService mapPinCommentService;

    @MockitoBean
    private TripAccessChecker tripAccessChecker;

    @Test
    @DisplayName("t1 인증 정보 없이 지도 핀 목록을 조회하면 200을 반환한다")
    void t1_guestMapPinListRequestReturnsOk() throws Exception {
        given(mapPinCommentService.getPinSummaries(1L)).willReturn(List.of());

        mockMvc.perform(get("/api/trips/1/map-pins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("t2 인증 정보 없이 지도 핀 댓글을 조회하면 200을 반환한다")
    void t2_guestMapPinCommentListRequestReturnsOk() throws Exception {
        given(mapPinCommentService.getComments(1L, "ChIJtest")).willReturn(List.of());

        mockMvc.perform(get("/api/trips/1/map-pins/ChIJtest/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("t3 인증 정보 없이 지도 핀 댓글을 등록하면 401을 반환한다")
    void t3_unauthenticatedMapPinCommentRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/trips/1/map-pins/ChIJtest/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"댓글\",\"lat\":37.5,\"lng\":127.0,\"placeName\":\"장소\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t4 인증됐지만 여행 멤버가 아니면 지도 핀 댓글 등록 시 403을 반환한다")
    @WithMockUser
    void t4_nonMemberMapPinCommentRequestReturnsForbidden() throws Exception {
        given(mapPinCommentService.addComment(eq(1L), eq("ChIJtest"), any()))
                .willThrow(new BusinessException(CommonErrorCode.FORBIDDEN));

        mockMvc.perform(post("/api/trips/1/map-pins/ChIJtest/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"댓글\",\"lat\":37.5,\"lng\":127.0,\"placeName\":\"장소\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("COMMON_403"));
    }
}
