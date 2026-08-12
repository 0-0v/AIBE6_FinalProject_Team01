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
import back.backend.domain.place.dto.request.CreatePlaceVoteRequest;
import back.backend.domain.place.entity.PlaceVoteChoice;
import back.backend.domain.place.entity.PlaceVoteStatus;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.entity.PlaceVoteType;
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
                10L, null, 100L, PlaceVoteType.PLACE_APPROVAL, null,
                new PlaceVoteSummaryResponse.PlaceOptionResponse(10L, "을지맥옥", "서울", "AI 정보"),
                null, null, PlaceVoteStatus.OPEN, 1, 0, 1, 3, 4,
                PlaceVoteChoice.AGREE, null, null, "2026-07-24T11:00:00");
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

    @Test
    @DisplayName("t5 새 투표 생성 API는 요청 본문을 받아 201을 반환한다")
    void t5_createVoteEndpointReturnsCreated() throws Exception {
        given(placeVoteService.startVote(eq(1L), any(CreatePlaceVoteRequest.class))).willReturn(summary);

        mockMvc.perform(post("/api/trips/1/places/votes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"PLACE_BATTLE","primaryTripPlaceId":10,"secondaryTripPlaceId":20}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.voteRequestId").value(100));
    }

    @Test
    @DisplayName("t6 투표 ID 기반 응답 API는 선택지를 받아 200을 반환한다")
    void t6_respondByVoteIdEndpointReturnsOk() throws Exception {
        given(placeVoteService.respondByVoteId(eq(1L), eq(100L), any())).willReturn(summary);

        mockMvc.perform(put("/api/trips/1/places/votes/100/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"choice\":\"AGREE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.voteRequestId").value(100));
    }
}
