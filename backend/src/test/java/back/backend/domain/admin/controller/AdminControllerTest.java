package back.backend.domain.admin.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.admin.dto.ExternalApiUsageResponse;
import back.backend.domain.admin.service.AdminService;
import back.backend.global.response.PageResponse;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.domain.inquiry.service.InquiryService;
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
class AdminControllerTest {

    @Mock
    private AdminService adminService;

    @Mock
    private SecurityContextAccessor securityContextAccessor;

    @Mock
    private InquiryService inquiryService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new AdminController(adminService, securityContextAccessor, inquiryService)).build();
    }

    @Test
    @DisplayName("t1 전체 외부 API 사용 이력을 요청하면 지정한 페이지의 모든 일자 기록을 반환한다")
    void t1_apiUsagesReturnsRequestedPageAcrossAllDates() throws Exception {
        PageResponse<ExternalApiUsageResponse> response = new PageResponse<>(
                List.of(), 1, 10, 16, 2, false, true, true);
        when(adminService.externalApiUsages(1, 10)).thenReturn(response);

        mockMvc.perform(get("/api/admin/api-usages").param("page", "1").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(16));

        verify(adminService).externalApiUsages(1, 10);
    }
}
