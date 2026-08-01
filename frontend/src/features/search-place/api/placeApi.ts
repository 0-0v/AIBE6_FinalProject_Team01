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
        signal?: AbortSignal
    },
): Promise<PlaceSearchResult[]> {
    const params = new URLSearchParams({ query })
    if (options?.location) params.append('location', options.location)
    if (options?.includedType) params.append('includedType', options.includedType)
    const res = await apiClient.get<ApiResponse<PlaceSearchResult[]>>(
        `/api/places/search?${params.toString()}`,
        { signal: options?.signal },
    )
    return res.data
}
