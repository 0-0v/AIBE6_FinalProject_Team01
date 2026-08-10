import type { ExpenseResponse } from '@/features/manage-expense'

export function compactAddress(value: string | null | undefined) {
    if (!value) return '주소 미정'
    const parts = value
        .split(/\s+/)
        .filter(Boolean)
        .filter((part) => part !== '대한민국')
    return parts.slice(0, 2).join(' ') || value
}

export function isVisitedAtRangeMessage(message: string) {
    return message === '방문 일시는 여행 기간 안이어야 합니다.'
}

export function summarizeExpenses(
    expenses: ExpenseResponse[],
    currentMemberId: number | null,
) {
    let totalExpense = 0
    let myReceivable = 0
    let myPayable = 0

    for (const expense of expenses) {
        totalExpense += expense.totalAmount
        if (expense.payerId === currentMemberId) {
            myReceivable += expense.participants
                .filter(
                    (participant) =>
                        participant.memberId !== expense.payerId &&
                        participant.status === 'PENDING',
                )
                .reduce((sum, participant) => sum + participant.shareAmount, 0)
            continue
        }

        const mine = expense.participants.find(
            (participant) => participant.memberId === currentMemberId,
        )
        if (mine?.status === 'PENDING') myPayable += mine.shareAmount
    }

    return { totalExpense, myReceivable, myPayable }
}
