package back.backend.domain.card.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.verify;

import back.backend.domain.card.dto.PublicCardDetailResponse;
import back.backend.domain.card.dto.CardSort;
import back.backend.domain.card.service.PublicCardCopyService;
import back.backend.domain.card.service.PublicCardDetailService;
import back.backend.domain.card.service.PublicCardService;
import back.backend.global.security.SecurityContextAccessor;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.TripVisibility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class PublicCardControllerTest {

    @Mock PublicCardService service;
    @Mock PublicCardDetailService detailService;
    @Mock PublicCardCopyService copyService;
    @Mock SecurityContextAccessor security;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new PublicCardController(service, detailService, copyService, security))
                .build();
    }

    @Test
    @DisplayName("t1 공개 카드 상세를 조회하면 200과 여행 정보를 반환한다")
    void t1_getDetailReturns200WithTripInformation() throws Exception {
        given(detailService.getDetail(20L)).willReturn(new PublicCardDetailResponse(
                20L, 10L, "제주 여행", "여행 요약", "제주", null,
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 3),
                TripVisibility.PUBLIC_RECORD, List.of(), List.of(), Set.of(), List.of()));

        mockMvc.perform(get("/api/cards/20/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cardId").value(20))
                .andExpect(jsonPath("$.data.title").value("제주 여행"))
                .andExpect(jsonPath("$.data.destination").value("제주"))
                .andExpect(jsonPath("$.data.visibility").value("PUBLIC_RECORD"));
    }

    @Test
    @DisplayName("t2 여행 스타일 필터를 전달하면 해당 조건으로 공개 카드를 조회한다")
    void t2_getPublicCardsPassesTravelStyleFilter() throws Exception {
        mockMvc.perform(get("/api/cards/public")
                        .param("travelStyle", "FOOD"))
                .andExpect(status().isOk());

        verify(service).getPublicCards(null, 0, 9, CardSort.LATEST, null, TravelStyle.FOOD);
    }
}
