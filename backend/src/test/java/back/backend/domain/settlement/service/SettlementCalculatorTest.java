package back.backend.domain.settlement.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SettlementCalculatorTest {
    private final SettlementCalculator calculator = new SettlementCalculator();

    @Test
    @DisplayName("t1 멤버별 잔액을 계산하면 누가 누구에게 송금할지 반환한다")
    void t1_calculateTransfersFromMemberBalances() {
        var transfers = calculator.calculate(
                Map.of(
                        1L, new BigDecimal("30000.00"),
                        2L, new BigDecimal("-10000.00"),
                        3L, new BigDecimal("-20000.00")
                ),
                Map.of(1L, "지현", 2L, "민수", 3L, "영희")
        );

        assertThat(transfers).hasSize(2);
        assertThat(transfers).extracting("senderNickname", "receiverNickname", "amount")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("민수", "지현", new BigDecimal("10000.00")),
                        org.assertj.core.groups.Tuple.tuple("영희", "지현", new BigDecimal("20000.00"))
                );
    }

    @Test
    @DisplayName("t2 모든 멤버의 결제액과 부담액이 같으면 송금 내역이 없다")
    void t2_returnEmptyTransfersWhenAllBalancesAreZero() {
        assertThat(calculator.calculate(
                Map.of(1L, BigDecimal.ZERO, 2L, BigDecimal.ZERO),
                Map.of(1L, "지현", 2L, "민수")
        )).isEmpty();
    }
}
