import type {
    RouteOption,
    RoutePlanPreview,
    ItineraryDay,
} from '@/entities/trip'
import { apiClient, type ApiResponse } from '@/shared/api/client'
import type { AiPlaceRecommendation } from '../model/types'

export async function recommendPlacesAlongRoute(
    tripId: number,
    input: {
        dayId: number
        fromTripPlaceId: number
        toTripPlaceId: number
        category: string
        prompt: string
        limit?: number
    },
): Promise<AiPlaceRecommendation[]> {
    const response = await apiClient.post<ApiResponse<AiPlaceRecommendation[]>>(
        `/api/trips/${tripId}/ai/place-recommendations`,
        input,
    )
    return response.data
}

export async function previewAiItineraryReplan(
    tripId: number,
    input: {
        itineraryItemIds: number[]
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
