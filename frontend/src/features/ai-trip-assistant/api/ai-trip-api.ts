import type {
    RouteOption,
    RoutePlanPreview,
    ItineraryDay,
} from '@/entities/trip'
import {
    apiClient,
    getAccessToken,
    restoreSession,
    type ApiResponse,
} from '@/shared/api/client'
import type { AiPlaceRecommendation } from '../model/types'

export async function recommendPlacesAlongRoute(
    tripId: number,
    input: {
        dayId: number
        fromTripPlaceId: number | null
        toTripPlaceId: number | null
        category: string
        prompt: string
        limit?: number
    },
): Promise<AiPlaceRecommendation[]> {
    if (!getAccessToken()) {
        const restoredToken = await restoreSession()
        if (!restoredToken) {
            throw new Error('로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.')
        }
    }
    const response = await apiClient.post<ApiResponse<AiPlaceRecommendation[]>>(
        `/api/trips/${tripId}/ai/place-recommendations`,
        input,
    )
    return response.data
}

export async function previewAiItineraryReplan(
    tripId: number,
    input: {
        itineraryItemId: number
        reasons: string[]
    },
): Promise<RouteOption[]> {
    const response = await apiClient.post<ApiResponse<RouteOption[]>>(
        `/api/trips/${tripId}/itinerary/replan/preview`,
        input,
    )
    return response.data
}

export async function applyAiItineraryReplan(
    tripId: number,
    plan: RoutePlanPreview,
): Promise<ItineraryDay[]> {
    const response = await apiClient.post<ApiResponse<ItineraryDay[]>>(
        `/api/trips/${tripId}/itinerary/replan/apply`,
        plan,
    )
    return response.data
}
