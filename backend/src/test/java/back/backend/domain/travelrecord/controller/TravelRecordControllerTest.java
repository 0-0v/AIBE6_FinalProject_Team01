package back.backend.domain.travelrecord.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import back.backend.domain.travelrecord.dto.*;
import back.backend.domain.travelrecord.service.TravelRecordService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class TravelRecordControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Mock
    private TravelRecordService travelRecordService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TravelRecordController(travelRecordService))
                .build();
    }

    @Test
    @DisplayName("t1 여행 기록을 등록하면 계산된 DAY와 사진 목록을 반환한다")
    void t1_createTravelRecordReturnsDayAndPhotos() throws Exception {
        TravelRecordResponse response = new TravelRecordResponse(
                10L, 1L, "지현", 20L, null, 2,
                LocalDateTime.of(2026, 7, 24, 14, 30),
                "맛있는 라멘", List.of("/trip-record-1.png"),
                LocalDateTime.of(2026, 7, 24, 14, 31)
        );
        given(travelRecordService.create(eq(1L), any())).willReturn(response);

        mockMvc.perform(post("/api/trips/1/travel-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "tripPlaceId": 20,
                                  "visitedAt": "2026-07-24T14:30:00",
                                  "memo": "맛있는 라멘",
                                  "imageUrls": ["/trip-record-1.png"]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.dayNumber").value(2))
                .andExpect(jsonPath("$.data.imageUrls[0]").value("/trip-record-1.png"));
    }

    @Test
    @DisplayName("t2 방문 일시나 장소가 없으면 여행 기록 등록 요청을 거절한다")
    void t2_createTravelRecordWithoutRequiredFieldsReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/trips/1/travel-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"memo": "장소와 시간이 없는 기록"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t3 여행 기록을 조회하면 최신 방문순 목록을 반환한다")
    void t3_getTravelRecordsReturnsRecords() throws Exception {
        given(travelRecordService.getRecords(1L)).willReturn(List.of(
                new TravelRecordResponse(
                        10L, 1L, "지현", 20L, null, 1,
                        LocalDateTime.of(2026, 7, 23, 10, 0),
                        "첫 일정", List.of(), LocalDateTime.of(2026, 7, 23, 10, 1))
        ));

        mockMvc.perform(get("/api/trips/1/travel-records"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].memberNickname").value("지현"));
    }

    @Test
    @DisplayName("t4 회고를 저장하면 별점과 작성 내용을 반환한다")
    void t4_saveRetrospectiveReturnsSavedContent() throws Exception {
        given(travelRecordService.saveMyRetrospective(eq(1L), any())).willReturn(
                new RetrospectiveResponse(
                        5L, 1L, new BigDecimal("4.5"), "좋았던 점",
                        "개선할 점", "전체 회고", LocalDateTime.of(2026, 7, 26, 12, 0))
        );

        mockMvc.perform(put("/api/trips/1/retrospective")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RetrospectiveRequest(
                                new BigDecimal("4.5"), "좋았던 점", "개선할 점", "전체 회고"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(4.5))
                .andExpect(jsonPath("$.data.summary").value("전체 회고"));
    }

    @Test
    @DisplayName("t5 회고 별점이 범위를 벗어나면 저장 요청을 거절한다")
    void t5_saveRetrospectiveWithInvalidRatingReturnsBadRequest() throws Exception {
        mockMvc.perform(put("/api/trips/1/retrospective")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating": 5.5, "summary": "범위를 벗어난 별점"}
                                """))
                .andExpect(status().isBadRequest());
    }
}
