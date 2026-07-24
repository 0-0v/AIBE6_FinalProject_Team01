package back.backend.domain.expense.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.expense.dto.ExpenseResponse;
import back.backend.domain.expense.dto.ExpenseContextResponse;
import back.backend.domain.expense.dto.ExpenseMemberResponse;
import back.backend.domain.expense.dto.SettlementSummaryResponse;
import back.backend.domain.expense.entity.SplitType;
import back.backend.domain.expense.service.ExpenseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
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
class ExpenseControllerTest {
    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    @Mock ExpenseService expenseService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ExpenseController(expenseService)).build();
    }

    @Test
    @DisplayName("t1 유효한 지출을 등록하면 201과 계산된 참여자 부담액을 반환한다")
    void t1_createExpenseReturnsCalculatedShares() throws Exception {
        var response = new ExpenseResponse(
                1L, "렌터카", "TRANSPORT", new BigDecimal("30000.00"), "KRW",
                null, null, 1L, "지현", SplitType.EQUAL,
                List.of(
                        new ExpenseResponse.ParticipantShareResponse(1L, "지현", new BigDecimal("15000.00")),
                        new ExpenseResponse.ParticipantShareResponse(2L, "민수", new BigDecimal("15000.00"))
                ), null);
        given(expenseService.create(eq(1L), any())).willReturn(response);

        mockMvc.perform(post("/api/trips/1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"렌터카","category":"TRANSPORT","totalAmount":30000,"expenseDate":"2026-08-01",
                                "payerId":1,"splitType":"EQUAL","participantIds":[1,2]}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("렌터카"))
                .andExpect(jsonPath("$.data.participants.length()").value(2));
    }

    @Test
    @DisplayName("t2 정산표를 조회하면 멤버 간 최종 송금 목록을 반환한다")
    void t2_getSettlementReturnsTransfers() throws Exception {
        given(expenseService.getSettlement(1L)).willReturn(new SettlementSummaryResponse(
                new BigDecimal("30000.00"), List.of(),
                List.of(new SettlementSummaryResponse.Transfer(
                        2L, "민수", 1L, "지현", new BigDecimal("15000.00")))));

        mockMvc.perform(get("/api/trips/1/expenses/settlement"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transfers[0].senderNickname").value("민수"))
                .andExpect(jsonPath("$.data.transfers[0].receiverNickname").value("지현"));
    }

    @Test
    @DisplayName("t3 지출 Day를 선택하지 않으면 400 Bad Request를 반환한다")
    void t3_rejectExpenseWithoutExpenseDate() throws Exception {
        mockMvc.perform(post("/api/trips/1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"렌터카","category":"TRANSPORT","totalAmount":30000,
                                "payerId":1,"splitType":"EQUAL","participantIds":[1,2]}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t4 여행 일정이 정해져 있으면 지출 컨텍스트에 등록 가능 상태를 반환한다")
    void t4_getExpenseContextReturnsScheduleConfirmed() throws Exception {
        given(expenseService.getContext(1L)).willReturn(new ExpenseContextResponse(
                LocalDate.of(2026, 7, 23),
                LocalDate.of(2026, 7, 28),
                List.of(new ExpenseMemberResponse(1L, "지현")),
                true));

        mockMvc.perform(get("/api/trips/1/expenses/context"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.startDate").value("2026-07-23"))
                .andExpect(jsonPath("$.data.endDate").value("2026-07-28"))
                .andExpect(jsonPath("$.data.scheduleConfirmed").value(true));
    }
}
