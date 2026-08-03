import { apiClient, type ApiResponse } from '@/shared/api/client'

export type DestinationMetadata = {
    englishName: string
    countryCode: string | null
}

export async function fetchDestinationMetadata(placeId: string) {
    const response = await apiClient.get<ApiResponse<DestinationMetadata>>(
        `/api/places/destination-metadata?placeId=${encodeURIComponent(placeId)}`,
    )
    return response.data
}
