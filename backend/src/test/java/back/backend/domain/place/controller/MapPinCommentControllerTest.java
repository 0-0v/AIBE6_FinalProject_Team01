package back.backend.domain.place.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.dto.response.MapPinCommentResponse;
import back.backend.domain.place.dto.response.MapPinSummaryResponse;
import back.backend.domain.place.service.MapPinCommentService;
import back.backend.global.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class MapPinCommentControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Mock private MapPinCommentService mapPinCommentService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new MapPinCommentController(mapPinCommentService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("t1 GET /map-pins 요청 시 200과 핀 목록을 반환한다")
    void t1_getPinSummaries() throws Exception {
        given(mapPinCommentService.getPinSummaries(1L)).willReturn(List.of(
                new MapPinSummaryResponse("ChIJone", 37.5, 127.0, "국밥집", 2L)
        ));

        mockMvc.perform(get("/api/trips/1/map-pins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].googlePlaceId").value("ChIJone"))
                .andExpect(jsonPath("$.data[0].commentCount").value(2));
    }

    @Test
    @DisplayName("t2 GET /map-pins/{googlePlaceId}/comments 요청 시 200과 댓글 목록을 반환한다")
    void t2_getComments() throws Exception {
        given(mapPinCommentService.getComments(1L, "ChIJone")).willReturn(List.of(
                new MapPinCommentResponse(
                        1L,
                        10L,
                        2L,
                        "여행자",
                        "/uploads/profile-images/member.png",
                        "여기 좋아요",
                        "2026-08-10T11:00:00")
        ));

        mockMvc.perform(get("/api/trips/1/map-pins/ChIJone/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].nickname").value("여행자"))
                .andExpect(jsonPath("$.data[0].profileImageUrl")
                        .value("/uploads/profile-images/member.png"))
                .andExpect(jsonPath("$.data[0].content").value("여기 좋아요"));
    }

    @Test
    @DisplayName("t3 POST /map-pins/{googlePlaceId}/comments 요청 시 201과 등록된 댓글을 반환한다")
    void t3_addComment() throws Exception {
        given(mapPinCommentService.addComment(eq(1L), eq("ChIJnew"), any()))
                .willReturn(new MapPinCommentResponse(
                        2L, 11L, 1L, "작성자", null, "새 댓글", "2026-08-10T11:00:00"));

        mockMvc.perform(post("/api/trips/1/map-pins/ChIJnew/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "content", "새 댓글",
                                "lat", 37.5,
                                "lng", 127.0,
                                "placeName", "새 장소"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.content").value("새 댓글"));
    }

    @Test
    @DisplayName("t4 content가 빈 문자열이면 400 응답을 반환한다")
    void t4_blankContentReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/trips/1/map-pins/ChIJnew/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "content", "  ",
                                "lat", 37.5,
                                "lng", 127.0,
                                "placeName", "새 장소"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t5 lat이 없으면 400 응답을 반환한다")
    void t5_missingLatReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/trips/1/map-pins/ChIJnew/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "content", "댓글",
                                "lng", 127.0,
                                "placeName", "새 장소"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t6 위도 범위를 벗어나면 400 응답을 반환한다")
    void t6_outOfRangeLatitudeReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/trips/1/map-pins/ChIJnew/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "content", "댓글",
                                "lat", 91.0,
                                "lng", 127.0,
                                "placeName", "새 장소"
                        ))))
                .andExpect(status().isBadRequest());
    }
}
