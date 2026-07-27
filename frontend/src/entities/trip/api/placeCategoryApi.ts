import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/client'
import type { PlaceMarkerIcon } from '../model/place-marker-icon'
import type { PlaceCategoryType } from '../model/types'

export type PlaceCategoryInfo = {
    categoryId: number
    name: string
    categoryType: PlaceCategoryType
    markerColor: string
    markerIcon: PlaceMarkerIcon
}

export async function getPlaceCategories(
    tripId: number,
    signal?: AbortSignal,
): Promise<PlaceCategoryInfo[]> {
    const response = await apiClient.get<ApiResponse<PlaceCategoryInfo[]>>(
        `/api/trips/${tripId}/categories`,
        { signal },
    )
    return response.data
}
