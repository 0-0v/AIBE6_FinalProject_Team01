import { apiClient } from '@/shared/api/client'
import type { PlaceSearchResult } from '../model/types'

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

export async function searchPlaces(
    query: string,
    signal?: AbortSignal,
): Promise<PlaceSearchResult[]> {
    const res = await apiClient.get<ApiResponse<PlaceSearchResult[]>>(
        `/api/places/search?query=${encodeURIComponent(query)}`,
        { signal },
    )
    return res.data
}
