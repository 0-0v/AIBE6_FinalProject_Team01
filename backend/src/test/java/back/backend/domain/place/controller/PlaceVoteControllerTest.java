package back.backend.domain.place.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.dto.response.PlaceVoteSummaryResponse;
import back.backend.domain.place.entity.PlaceVoteChoice;
import back.backend.domain.place.entity.PlaceVoteStatus;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.service.PlaceVoteService;
import back.backend.global.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
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
class PlaceVoteControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock private PlaceVoteService placeVoteService;

    private PlaceVoteSummaryResponse summary;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PlaceVoteController(placeVoteService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        summary = new PlaceVoteSummaryResponse(
                10L, 100L, PlaceVoteStatus.OPEN,
                1, 0, 1, 3, 4, PlaceVoteChoice.AGREE, TripPlaceStatus.HOLD,
                java.time.LocalDateTime.now().plusHours(24));
    }

    @Test
    @DisplayName("t1 투표를 신청하면 201 Created와 투표 요약을 반환한다")
    void t1_startVoteReturnsCreated() throws Exception {
        given(placeVoteService.startVote(1L, 10L)).willReturn(summary);

        mockMvc.perform(post("/api/trips/1/places/10/votes"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.voteRequestId").value(100))
                .andExpect(jsonPath("$.data.status").value("OPEN"));
    }

    @Test
    @DisplayName("t2 찬성 응답을 제출하면 갱신된 집계를 반환한다")
    void t2_respondVoteReturnsSummary() throws Exception {
        given(placeVoteService.respond(eq(1L), eq(10L), any())).willReturn(summary);

        mockMvc.perform(put("/api/trips/1/places/10/votes/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("choice", "AGREE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.agreeCount").value(1))
                .andExpect(jsonPath("$.data.myChoice").value("AGREE"));
    }

    @Test
    @DisplayName("t3 투표 응답 값이 없으면 400 Bad Request를 반환한다")
    void t3_missingChoiceReturnsBadRequest() throws Exception {
        mockMvc.perform(put("/api/trips/1/places/10/votes/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t4 여행방 장소 투표 목록을 조회한다")
    void t4_getVotesReturnsSummaries() throws Exception {
        given(placeVoteService.getVotes(1L)).willReturn(List.of(summary));

        mockMvc.perform(get("/api/trips/1/places/votes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].tripPlaceId").value(10));
    }
}
