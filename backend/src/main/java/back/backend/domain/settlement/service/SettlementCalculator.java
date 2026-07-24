package back.backend.domain.settlement.service;

import back.backend.domain.expense.dto.SettlementSummaryResponse;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class SettlementCalculator {

    public List<SettlementSummaryResponse.Transfer> calculate(
            Map<Long, BigDecimal> balances,
            Map<Long, String> names
    ) {
        List<Account> debtors = balances.entrySet().stream()
                .filter(entry -> entry.getValue().signum() < 0)
                .map(entry -> new Account(entry.getKey(), entry.getValue().abs()))
                .sorted(Comparator.comparing(Account::memberId))
                .toList();
        List<Account> creditors = balances.entrySet().stream()
                .filter(entry -> entry.getValue().signum() > 0)
                .map(entry -> new Account(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(Account::memberId))
                .toList();
        List<Account> mutableDebtors = new ArrayList<>(debtors);
        List<Account> mutableCreditors = new ArrayList<>(creditors);
        List<SettlementSummaryResponse.Transfer> transfers = new ArrayList<>();
        int debtorIndex = 0;
        int creditorIndex = 0;
        while (debtorIndex < mutableDebtors.size() && creditorIndex < mutableCreditors.size()) {
            Account debtor = mutableDebtors.get(debtorIndex);
            Account creditor = mutableCreditors.get(creditorIndex);
            BigDecimal amount = debtor.amount().min(creditor.amount());
            transfers.add(new SettlementSummaryResponse.Transfer(
                    debtor.memberId(), names.get(debtor.memberId()),
                    creditor.memberId(), names.get(creditor.memberId()), amount));
            mutableDebtors.set(debtorIndex, new Account(debtor.memberId(), debtor.amount().subtract(amount)));
            mutableCreditors.set(creditorIndex, new Account(creditor.memberId(), creditor.amount().subtract(amount)));
            if (mutableDebtors.get(debtorIndex).amount().signum() == 0) debtorIndex++;
            if (mutableCreditors.get(creditorIndex).amount().signum() == 0) creditorIndex++;
        }
        return transfers;
    }

    private record Account(Long memberId, BigDecimal amount) {}
}
