package back.backend.domain.place.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.dto.response.PlaceCommentResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.service.PlaceCommentService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
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
class PlaceCommentControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules();

    @Mock private PlaceCommentService commentService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PlaceCommentController(commentService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("t1 GET /comments 요청 시 200과 댓글 목록을 반환한다")
    void t1_getComments() throws Exception {
        given(commentService.getComments(1L, 10L)).willReturn(List.of(
                new PlaceCommentResponse(1L, 10L, 2L, "좋아요!", LocalDateTime.now()),
                new PlaceCommentResponse(2L, 10L, 3L, "저도요", LocalDateTime.now())
        ));

        mockMvc.perform(get("/api/trips/1/places/10/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].content").value("좋아요!"))
                .andExpect(jsonPath("$.data[1].content").value("저도요"));
    }

    @Test
    @DisplayName("t2 POST /comments 요청 시 201과 저장된 댓글을 반환한다")
    void t2_addComment() throws Exception {
        given(commentService.addComment(eq(1L), eq(10L), any()))
                .willReturn(new PlaceCommentResponse(3L, 10L, 1L, "새 댓글", LocalDateTime.now()));

        mockMvc.perform(post("/api/trips/1/places/10/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "새 댓글"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(3))
                .andExpect(jsonPath("$.data.content").value("새 댓글"));
    }

    @Test
    @DisplayName("t3 content가 빈 문자열이면 400 응답을 반환한다")
    void t3_blankContentReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/trips/1/places/10/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "  "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t4 DELETE /comments/{commentId} 요청 시 204를 반환한다")
    void t4_deleteComment() throws Exception {
        willDoNothing().given(commentService).deleteComment(1L, 10L, 5L);

        mockMvc.perform(delete("/api/trips/1/places/10/comments/5"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("t5 본인 댓글이 아닌 경우 404 응답을 반환한다")
    void t5_deleteOtherCommentReturnsNotFound() throws Exception {
        willThrow(new BusinessException(PlaceErrorCode.PLACE_COMMENT_NOT_FOUND))
                .given(commentService).deleteComment(1L, 10L, 99L);

        mockMvc.perform(delete("/api/trips/1/places/10/comments/99"))
                .andExpect(status().isNotFound());
    }
}
