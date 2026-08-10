import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/client'

export type MapPinSummaryResponse = {
    googlePlaceId: string
    lat: number
    lng: number
    placeName: string
    commentCount: number
}

export type MapPinCommentResponse = {
    id: number
    mapPinId: number
    memberId: number
    content: string
    createdAt: string
}

export async function getMapPins(
    tripId: number,
    signal?: AbortSignal,
): Promise<MapPinSummaryResponse[]> {
    const res = await apiClient.get<ApiResponse<MapPinSummaryResponse[]>>(
        `/api/trips/${tripId}/map-pins`,
        { signal },
    )
    return res.data
}

export async function getMapPinComments(
    tripId: number,
    googlePlaceId: string,
    signal?: AbortSignal,
): Promise<MapPinCommentResponse[]> {
    const res = await apiClient.get<ApiResponse<MapPinCommentResponse[]>>(
        `/api/trips/${tripId}/map-pins/${googlePlaceId}/comments`,
        { signal },
    )
    return res.data
}

export async function addMapPinComment(
    tripId: number,
    googlePlaceId: string,
    payload: { content: string; lat: number; lng: number; placeName: string },
): Promise<MapPinCommentResponse> {
    const res = await apiClient.post<ApiResponse<MapPinCommentResponse>>(
        `/api/trips/${tripId}/map-pins/${googlePlaceId}/comments`,
        payload,
    )
    return res.data
}
