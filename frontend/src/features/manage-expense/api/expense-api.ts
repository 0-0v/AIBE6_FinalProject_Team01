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
export type ExpenseParticipant = ExpenseMember & {
    shareAmount: number
    status: 'PENDING' | 'COMPLETED'
    settledAt: string | null
}
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
    myReceivable: number
    myPayable: number
    pendingExpenseCount: number
    completedExpenseCount: number
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
export type ExpenseUpdateBody = ExpenseCreateBody

export async function fetchExpenseData(tripId: number, signal?: AbortSignal) {
    const options = { signal }
    const [expenses, context, settlement] = await Promise.all([
        apiClient.get<ApiResponse<ExpenseResponse[]>>(
            `/api/trips/${tripId}/expenses`,
            options,
        ),
        apiClient.get<ApiResponse<ExpenseContext>>(
            `/api/trips/${tripId}/expenses/context`,
            options,
        ),
        apiClient.get<ApiResponse<SettlementSummary>>(
            `/api/trips/${tripId}/expenses/settlement`,
            options,
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

export async function updateExpense(
    tripId: number,
    expenseId: number,
    body: ExpenseUpdateBody,
) {
    const response = await apiClient.put<ApiResponse<ExpenseResponse>>(
        `/api/trips/${tripId}/expenses/${expenseId}`,
        body,
    )
    return response.data
}

export async function completeExpenseParticipant(
    tripId: number,
    expenseId: number,
    memberId: number,
) {
    const response = await apiClient.patch<ApiResponse<ExpenseResponse>>(
        `/api/trips/${tripId}/expenses/${expenseId}/participants/${memberId}/complete`,
    )
    return response.data
}
