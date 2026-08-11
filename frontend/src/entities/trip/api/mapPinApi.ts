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
    nickname: string
    profileImageUrl: string | null
    content: string
    createdAt: string
}

function mapPinCommentsPath(tripId: number, googlePlaceId: string) {
    return `/api/trips/${tripId}/map-pins/${encodeURIComponent(googlePlaceId)}/comments`
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
        mapPinCommentsPath(tripId, googlePlaceId),
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
        mapPinCommentsPath(tripId, googlePlaceId),
        payload,
    )
    return res.data
}

export async function deleteMapPinComment(
    tripId: number,
    googlePlaceId: string,
    commentId: number,
): Promise<void> {
    await apiClient.delete(
        `${mapPinCommentsPath(tripId, googlePlaceId)}/${commentId}`,
    )
}
