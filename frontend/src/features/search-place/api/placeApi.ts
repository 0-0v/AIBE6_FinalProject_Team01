import { apiClient } from '@/shared/api/client'
import type { PlaceSearchResult } from '../model/types'

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

export async function searchPlaces(
    query: string,
    options?: {
        location?: string
        includedType?: string
        latitude?: number
        longitude?: number
        signal?: AbortSignal
    },
): Promise<PlaceSearchResult[]> {
    const params = new URLSearchParams({ query })
    if (options?.location) params.append('location', options.location)
    if (options?.includedType) params.append('includedType', options.includedType)
    if (
        Number.isFinite(options?.latitude) &&
        Number.isFinite(options?.longitude)
    ) {
        params.append('latitude', String(options?.latitude))
        params.append('longitude', String(options?.longitude))
    }
    const res = await apiClient.get<ApiResponse<PlaceSearchResult[]>>(
        `/api/places/search?${params.toString()}`,
        { signal: options?.signal },
    )
    return res.data
}

export async function getPlaceDetails(
    googlePlaceId: string,
    signal?: AbortSignal,
): Promise<PlaceSearchResult> {
    const params = new URLSearchParams({ placeId: googlePlaceId })
    const res = await apiClient.get<ApiResponse<PlaceSearchResult>>(
        `/api/places/details?${params.toString()}`,
        { signal },
    )
    return res.data
}
