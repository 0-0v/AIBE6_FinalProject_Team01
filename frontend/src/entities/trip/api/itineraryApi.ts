import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/client'
import type {
    ItineraryDay,
    ItineraryDayStatus,
    ItineraryItem,
    ItineraryTransportMode,
    RoutePlanPreview,
    RouteOption,
} from '../model/types'

type UpdateItineraryItemData = {
    startTime?: string | null
    endTime?: string | null
    memo?: string | null
    transportMinutes?: number | null
    transportMeters?: number | null
}

const itineraryInitializationRequests = new Map<
    number,
    Promise<ItineraryDay[]>
>()

export async function getItinerary(tripId: number): Promise<ItineraryDay[]> {
    const res = await apiClient.get<ApiResponse<ItineraryDay[]>>(
        `/api/trips/${tripId}/itinerary`,
    )
    return res.data
}

export async function initializeItinerary(
    tripId: number,
    options: { force?: boolean } = {},
): Promise<ItineraryDay[]> {
    const pendingRequest = itineraryInitializationRequests.get(tripId)
    if (pendingRequest && !options.force) return pendingRequest

    const request = apiClient
        .post<ApiResponse<ItineraryDay[]>>(
            `/api/trips/${tripId}/itinerary/initialize`,
            {},
        )
        .then((response) => response.data)
    itineraryInitializationRequests.set(tripId, request)
    const clearRequest = () => {
        if (itineraryInitializationRequests.get(tripId) === request) {
            itineraryInitializationRequests.delete(tripId)
        }
    }
    void request.then(clearRequest, clearRequest)

    return request
}

export type RoutePlanSettings = {
    transportMode?: string
    dayStartTime?: string
    dayEndTime?: string
    travelPace?: string
}

export async function previewItineraryRoutePlan(
    tripId: number,
    settings?: RoutePlanSettings,
): Promise<RouteOption[]> {
    const res = await apiClient.post<ApiResponse<RouteOption[]>>(
        `/api/trips/${tripId}/itinerary/route-plan/preview`,
        settings ?? {},
    )
    return res.data
}

export async function applyItineraryRoutePlan(
    tripId: number,
    plan: RoutePlanPreview,
): Promise<ItineraryDay[]> {
    const res = await apiClient.post<ApiResponse<ItineraryDay[]>>(
        `/api/trips/${tripId}/itinerary/route-plan/apply`,
        plan,
    )
    return res.data
}

export async function addItineraryItem(
    tripId: number,
    dayId: number,
    tripPlaceId: number,
    sortOrder: number,
): Promise<ItineraryDay> {
    const res = await apiClient.post<ApiResponse<ItineraryDay>>(
        `/api/trips/${tripId}/itinerary/days/${dayId}/items`,
        { tripPlaceId, sortOrder },
    )
    return res.data
}

export async function removeItineraryItem(
    tripId: number,
    itemId: number,
): Promise<void> {
    await apiClient.delete(`/api/trips/${tripId}/itinerary/items/${itemId}`)
}

export async function updateItineraryItem(
    tripId: number,
    itemId: number,
    data: UpdateItineraryItemData,
): Promise<ItineraryItem> {
    const res = await apiClient.patch<ApiResponse<ItineraryItem>>(
        `/api/trips/${tripId}/itinerary/items/${itemId}`,
        data,
    )
    return res.data
}

export async function updateItineraryTransportMode(
    tripId: number,
    itemId: number,
    transportMode: ItineraryTransportMode,
): Promise<ItineraryItem> {
    const res = await apiClient.patch<ApiResponse<ItineraryItem>>(
        `/api/trips/${tripId}/itinerary/items/${itemId}/transport-mode`,
        { transportMode },
    )
    return res.data
}

export async function moveItineraryItem(
    tripId: number,
    itemId: number,
    targetDayId: number,
    sortOrder: number,
): Promise<ItineraryItem> {
    const res = await apiClient.patch<ApiResponse<ItineraryItem>>(
        `/api/trips/${tripId}/itinerary/items/${itemId}/move`,
        { targetDayId, sortOrder },
    )
    return res.data
}

export async function reorderItineraryItems(
    tripId: number,
    dayId: number,
    itemIds: number[],
): Promise<ItineraryDay> {
    const res = await apiClient.patch<ApiResponse<ItineraryDay>>(
        `/api/trips/${tripId}/itinerary/days/${dayId}/items/reorder`,
        { itemIds },
    )
    return res.data
}

export async function updateItineraryDayStatus(
    tripId: number,
    dayId: number,
    status: ItineraryDayStatus,
): Promise<ItineraryDay> {
    const res = await apiClient.patch<ApiResponse<ItineraryDay>>(
        `/api/trips/${tripId}/itinerary/days/${dayId}/status`,
        { status },
    )
    return res.data
}

type UpdateDeparturePayload =
    | { type: 'NONE' }
    | { type: 'TRIP_PLACE'; tripPlaceId: number }
    | { type: 'CUSTOM'; name: string; latitude: number; longitude: number }

export async function updateDayDeparture(
    tripId: number,
    dayId: number,
    payload: UpdateDeparturePayload,
): Promise<ItineraryDay> {
    const res = await apiClient.patch<ApiResponse<ItineraryDay>>(
        `/api/trips/${tripId}/itinerary/days/${dayId}/departure`,
        payload,
    )
    return res.data
}
