import { apiClient, type ApiResponse } from '@/shared/api/client'

export type TravelRecord = {
    id: number
    memberId: number
    memberNickname: string
    tripPlaceId: number
    itineraryItemId: number | null
    dayNumber: number
    visitedAt: string
    memo: string | null
    imageUrls: string[]
    createdAt: string
}

export type TravelRecordCreateBody = {
    tripPlaceId: number
    itineraryItemId: number | null
    visitedAt: string
    memo: string | null
    imageUrls: string[]
}

export type Retrospective = {
    id: number
    memberId: number
    rating: number
    goodPoints: string | null
    improvements: string | null
    summary: string | null
    updatedAt: string
}

export type RetrospectiveBody = {
    rating: number
    goodPoints: string | null
    improvements: string | null
    summary: string | null
}

export async function getTravelRecords(tripId: number) {
    const response = await apiClient.get<ApiResponse<TravelRecord[]>>(
        `/api/trips/${tripId}/travel-records`,
    )
    return response.data
}

export async function createTravelRecord(
    tripId: number,
    body: TravelRecordCreateBody,
) {
    const response = await apiClient.post<ApiResponse<TravelRecord>>(
        `/api/trips/${tripId}/travel-records`,
        body,
    )
    return response.data
}

export async function getMyRetrospective(tripId: number) {
    const response = await apiClient.get<ApiResponse<Retrospective | null>>(
        `/api/trips/${tripId}/retrospective/me`,
    )
    return response.data
}

export async function saveMyRetrospective(
    tripId: number,
    body: RetrospectiveBody,
) {
    const response = await apiClient.put<ApiResponse<Retrospective>>(
        `/api/trips/${tripId}/retrospective`,
        body,
    )
    return response.data
}
