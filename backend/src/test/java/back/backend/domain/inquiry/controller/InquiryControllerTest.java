package back.backend.domain.inquiry.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.inquiry.dto.InquiryCreateRequest;
import back.backend.domain.inquiry.service.InquiryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class InquiryControllerTest {
    @Mock InquiryService inquiryService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new InquiryController(inquiryService)).build();
    }

    @Test
    @DisplayName("t1 비로그인 사용자가 유효한 문의를 등록하면 접수 API가 성공한다")
    void t1_createInquiryAcceptsValidAnonymousRequest() throws Exception {
        mockMvc.perform(post("/api/inquiries")
                        .contentType("application/json")
                        .content("""
                                {"category":"USER","email":"user@example.com","subject":"사용 문의","content":"문의 내용"}
                                """))
                .andExpect(status().isOk());

        verify(inquiryService).create(isNull(), anyString(), any(InquiryCreateRequest.class));
    }

    @Test
    @DisplayName("t2 이메일 형식이 잘못된 문의는 400을 반환한다")
    void t2_createInquiryRejectsInvalidEmail() throws Exception {
        mockMvc.perform(post("/api/inquiries")
                        .contentType("application/json")
                        .content("""
                                {"category":"USER","email":"invalid","subject":"사용 문의","content":"문의 내용"}
                                """))
                .andExpect(status().isBadRequest());
    }
}
