package back.backend.domain.place.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.dto.response.PlaceVoteNotificationResponse;
import back.backend.domain.place.service.PlaceVoteService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class PlaceVoteNotificationControllerTest {

    private MockMvc mockMvc;

    @Mock private PlaceVoteService placeVoteService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PlaceVoteNotificationController(placeVoteService))
                .build();
    }

    @Test
    @DisplayName("t1 로그인 회원의 장소 투표 알림 목록을 반환한다")
    void t1_getNotifications() throws Exception {
        given(placeVoteService.getNotifications()).willReturn(List.of(
                new PlaceVoteNotificationResponse(
                        1L, 100L, 10L, "투표가 시작됐습니다.", false, LocalDateTime.now())));

        mockMvc.perform(get("/api/notifications/place-votes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].notificationId").value(1))
                .andExpect(jsonPath("$.data[0].read").value(false));
    }

    @Test
    @DisplayName("t2 장소 투표 알림을 읽음 처리하면 204 No Content를 반환한다")
    void t2_markNotificationRead() throws Exception {
        mockMvc.perform(patch("/api/notifications/place-votes/1/read"))
                .andExpect(status().isNoContent());

        then(placeVoteService).should().markNotificationRead(1L);
    }
}
