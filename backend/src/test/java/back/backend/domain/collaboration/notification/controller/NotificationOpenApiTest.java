package back.backend.domain.collaboration.notification.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationOpenApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("t1 Swagger 명세에 알림 조회 및 읽음 처리 경로를 모두 노출한다")
    void t1_openApiContainsAllNotificationPaths() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/notifications']").exists())
                .andExpect(jsonPath("$.paths['/api/notifications/unread-count']").exists())
                .andExpect(jsonPath("$.paths['/api/notifications/{notificationId}/read']").exists())
                .andExpect(jsonPath("$.paths['/api/notifications/read-all']").exists());
    }
}
