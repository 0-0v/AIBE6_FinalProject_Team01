import { apiClient, type ApiResponse } from '@/shared/api/client'

export type ExpenseMember = {
    memberId: number
    nickname: string
    profileImageUrl: string | null
}
export type ExpenseContext = {
    startDate: string | null
    endDate: string | null
    members: ExpenseMember[]
    scheduleConfirmed: boolean
}
export type ExpenseParticipant = ExpenseMember & { shareAmount: number }
export type ExpenseResponse = {
    id: number
    title: string
    category: string
    totalAmount: number
    currency: string
    expenseDate: string
    dayNumber: number | null
    payerId: number
    payerNickname: string
    splitType: 'EQUAL' | 'CUSTOM'
    participants: ExpenseParticipant[]
    memo: string | null
}
export type SettlementSummary = {
    totalExpense: number
    members: Array<
        ExpenseMember & {
            paidAmount: number
            shareAmount: number
            balance: number
        }
    >
    transfers: Array<{
        senderId: number
        senderNickname: string
        receiverId: number
        receiverNickname: string
        amount: number
        settlementId: number | null
        status: 'PENDING' | 'COMPLETED'
        completedAt: string | null
        canComplete: boolean
    }>
}
export type ExpenseCreateBody = {
    title: string
    category: string
    totalAmount: number
    expenseDate: string
    payerId: number
    splitType: 'EQUAL'
    participantIds: number[]
    customShares: null
    memo: string | null
}

export async function fetchExpenseData(tripId: number) {
    const [expenses, context, settlement] = await Promise.all([
        apiClient.get<ApiResponse<ExpenseResponse[]>>(
            `/api/trips/${tripId}/expenses`,
        ),
        apiClient.get<ApiResponse<ExpenseContext>>(
            `/api/trips/${tripId}/expenses/context`,
        ),
        apiClient.get<ApiResponse<SettlementSummary>>(
            `/api/trips/${tripId}/expenses/settlement`,
        ),
    ])
    return {
        expenses: expenses.data,
        context: context.data,
        settlement: settlement.data,
    }
}

export async function createExpense(tripId: number, body: ExpenseCreateBody) {
    const response = await apiClient.post<ApiResponse<ExpenseResponse>>(
        `/api/trips/${tripId}/expenses`,
        body,
    )
    return response.data
}

export async function completeSettlementTransfer(
    tripId: number,
    receiverId: number,
) {
    const response = await apiClient.patch<
        ApiResponse<SettlementSummary['transfers'][number]>
    >(
        `/api/trips/${tripId}/expenses/settlement/transfers/${receiverId}/complete`,
    )
    return response.data
}
