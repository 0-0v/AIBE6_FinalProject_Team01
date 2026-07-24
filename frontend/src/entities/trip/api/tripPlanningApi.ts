import { apiClient, ApiResponse } from '@/shared/api/client'

export type DateAvailability = {
    memberId: number
    nickname: string
    profileImageUrl: string | null
    availableDates: string[]
}

export type DateProposal = {
    proposalId: number | null
    startDate: string
    endDate: string
    status: 'OPEN' | 'CONFIRMED'
    agreeCount: number
    disagreeCount: number
    requiredCount: number
    myChoice: 'AGREE' | 'DISAGREE' | null
}

export async function getDateAvailability(tripId: number) {
    return (
        await apiClient.get<ApiResponse<DateAvailability[]>>(
            `/api/trips/${tripId}/date-availability`,
        )
    ).data
}

export async function saveDateAvailability(
    tripId: number,
    availableDates: string[],
) {
    return (
        await apiClient.put<ApiResponse<DateAvailability[]>>(
            `/api/trips/${tripId}/date-availability`,
            { availableDates },
        )
    ).data
}

export async function getDateProposal(tripId: number) {
    return (
        await apiClient.get<ApiResponse<DateProposal>>(
            `/api/trips/${tripId}/date-proposal`,
        )
    ).data
}

export async function proposeDates(
    tripId: number,
    startDate: string,
    endDate: string,
) {
    return (
        await apiClient.put<ApiResponse<DateProposal>>(
            `/api/trips/${tripId}/date-proposal`,
            { startDate, endDate },
        )
    ).data
}

export async function voteDates(tripId: number, choice: 'AGREE' | 'DISAGREE') {
    return (
        await apiClient.post<ApiResponse<DateProposal>>(
            `/api/trips/${tripId}/date-proposal/vote`,
            { choice },
        )
    ).data
}
