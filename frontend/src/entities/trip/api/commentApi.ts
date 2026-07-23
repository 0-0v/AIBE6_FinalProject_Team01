import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/client'

export type PlaceCommentResponse = {
    id: number
    tripPlaceId: number
    memberId: number
    content: string
    createdAt: string
}

export async function getPlaceComments(
    tripId: number,
    tripPlaceId: number,
    signal?: AbortSignal,
): Promise<PlaceCommentResponse[]> {
    const res = await apiClient.get<ApiResponse<PlaceCommentResponse[]>>(
        `/api/trips/${tripId}/places/${tripPlaceId}/comments`,
        { signal },
    )
    return res.data
}

export async function addPlaceComment(
    tripId: number,
    tripPlaceId: number,
    content: string,
): Promise<PlaceCommentResponse> {
    const res = await apiClient.post<ApiResponse<PlaceCommentResponse>>(
        `/api/trips/${tripId}/places/${tripPlaceId}/comments`,
        { content },
    )
    return res.data
}

export async function deletePlaceComment(
    tripId: number,
    tripPlaceId: number,
    commentId: number,
): Promise<void> {
    await apiClient.delete(
        `/api/trips/${tripId}/places/${tripPlaceId}/comments/${commentId}`,
    )
}
