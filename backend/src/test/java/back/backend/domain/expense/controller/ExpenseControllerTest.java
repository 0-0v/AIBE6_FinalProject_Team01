package back.backend.domain.expense.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.expense.dto.ExpenseResponse;
import back.backend.domain.expense.dto.ExpenseContextResponse;
import back.backend.domain.expense.dto.ExpenseMemberResponse;
import back.backend.domain.expense.dto.SettlementSummaryResponse;
import back.backend.domain.expense.entity.ParticipantSettlementStatus;
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
                        new ExpenseResponse.ParticipantShareResponse(
                                1L, "지현", new BigDecimal("15000.00"),
                                ParticipantSettlementStatus.COMPLETED, null),
                        new ExpenseResponse.ParticipantShareResponse(
                                2L, "민수", new BigDecimal("15000.00"),
                                ParticipantSettlementStatus.PENDING, null)
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
    @DisplayName("t2 지출을 수정하면 갱신된 지출 정보를 반환한다")
    void t2_updateExpenseReturnsUpdatedExpense() throws Exception {
        var response = new ExpenseResponse(
                1L, "렌터카(수정)", "TRANSPORT", new BigDecimal("40000.00"), "KRW",
                null, null, 1L, "지현", SplitType.EQUAL,
                List.of(new ExpenseResponse.ParticipantShareResponse(
                        1L, "지현", new BigDecimal("40000.00"),
                        ParticipantSettlementStatus.COMPLETED, null)), null);
        given(expenseService.update(eq(1L), eq(9L), any())).willReturn(response);

        mockMvc.perform(put("/api/trips/1/expenses/9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"렌터카(수정)","category":"TRANSPORT","totalAmount":40000,"expenseDate":"2026-08-01",
                                "payerId":1,"splitType":"EQUAL","participantIds":[1]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("렌터카(수정)"))
                .andExpect(jsonPath("$.data.totalAmount").value(40000.00));
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
                List.of(new ExpenseMemberResponse(1L, "지현", "/uploads/profiles/1.webp")),
                true));

        mockMvc.perform(get("/api/trips/1/expenses/context"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.startDate").value("2026-07-23"))
                .andExpect(jsonPath("$.data.endDate").value("2026-07-28"))
                .andExpect(jsonPath("$.data.members[0].profileImageUrl")
                        .value("/uploads/profiles/1.webp"))
                .andExpect(jsonPath("$.data.scheduleConfirmed").value(true));
    }

    @Test
    @DisplayName("t5 정산 요약을 조회하면 받을 돈/보낼 돈과 지출 건수를 반환한다")
    void t5_getSettlementReturnsReceivablePayableAndCounts() throws Exception {
        given(expenseService.getSettlement(1L)).willReturn(new SettlementSummaryResponse(
                new BigDecimal("30000.00"), new BigDecimal("15000.00"), BigDecimal.ZERO, 1, 0));

        mockMvc.perform(get("/api/trips/1/expenses/settlement"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.myReceivable").value(15000.00))
                .andExpect(jsonPath("$.data.pendingExpenseCount").value(1));
    }

    @Test
    @DisplayName("t6 참여자가 자신의 몫을 정산 완료 처리하면 갱신된 지출 정보를 반환한다")
    void t6_completeParticipantReturnsUpdatedExpense() throws Exception {
        var response = new ExpenseResponse(
                1L, "렌터카", "TRANSPORT", new BigDecimal("30000.00"), "KRW",
                null, null, 1L, "지현", SplitType.EQUAL,
                List.of(new ExpenseResponse.ParticipantShareResponse(
                        2L, "민수", new BigDecimal("15000.00"),
                        ParticipantSettlementStatus.COMPLETED, null)), null);
        given(expenseService.completeParticipant(1L, 9L, 2L)).willReturn(response);

        mockMvc.perform(patch("/api/trips/1/expenses/9/participants/2/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.participants[0].status").value("COMPLETED"));
    }
}
