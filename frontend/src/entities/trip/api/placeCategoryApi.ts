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
    sortOrder: number
}

export type PlaceCategoryInput = {
    name: string
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

export async function createPlaceCategory(
    tripId: number,
    input: PlaceCategoryInput,
): Promise<PlaceCategoryInfo> {
    const response = await apiClient.post<ApiResponse<PlaceCategoryInfo>>(
        `/api/trips/${tripId}/categories`,
        input,
    )
    return response.data
}

export async function updatePlaceCategory(
    tripId: number,
    categoryId: number,
    input: PlaceCategoryInput,
): Promise<PlaceCategoryInfo> {
    const response = await apiClient.put<ApiResponse<PlaceCategoryInfo>>(
        `/api/trips/${tripId}/categories/${categoryId}`,
        input,
    )
    return response.data
}

export async function deletePlaceCategory(
    tripId: number,
    categoryId: number,
): Promise<void> {
    await apiClient.delete(`/api/trips/${tripId}/categories/${categoryId}`)
}

export async function reorderPlaceCategories(
    tripId: number,
    categoryIds: number[],
): Promise<PlaceCategoryInfo[]> {
    const response = await apiClient.put<ApiResponse<PlaceCategoryInfo[]>>(
        `/api/trips/${tripId}/categories/order`,
        { categoryIds },
    )
    return response.data
}
