import { apiClient } from '@/shared/api/client'

export type CompanionType =
    'ALONE' | 'FRIENDS' | 'COUPLE' | 'SPOUSE' | 'CHILDREN' | 'PARENTS'

export type TravelStyle =
    | 'ACTIVITY'
    | 'SNS_HOT_PLACE'
    | 'NATURE'
    | 'FAMOUS_ATTRACTIONS'
    | 'RELAXATION'
    | 'CULTURE_ART_HISTORY'
    | 'SHOPPING'
    | 'FOOD'

export type TripResponse = {
    id: number
    ownerId: number
    title: string
    companionType: CompanionType | null
    travelStyles: TravelStyle[]
    destination: string | null
    startDate: string | null
    endDate: string | null
    status: 'PLANNING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    createdAt: string
    updatedAt: string
}

export type TripRequest = {
    title: string
    companionType?: CompanionType | null
    travelStyles?: TravelStyle[]
    destination?: string | null
    startDate?: string | null
    endDate?: string | null
}

type ApiResponse<T> = { success: boolean; message: string; data: T }

function authHeaders(): HeadersInit {
    return {}
}

export async function fetchTrips() {
    const response = await apiClient.get<ApiResponse<TripResponse[]>>(
        '/api/trips',
        { headers: authHeaders() },
    )
    return response.data
}

export async function createTrip(request: TripRequest) {
    const response = await apiClient.post<ApiResponse<TripResponse>>(
        '/api/trips',
        request,
        { headers: authHeaders() },
    )
    return response.data
}

export async function updateTrip(id: number, request: TripRequest) {
    const response = await apiClient.patch<ApiResponse<TripResponse>>(
        `/api/trips/${id}`,
        request,
        { headers: authHeaders() },
    )
    return response.data
}

export async function deleteTrip(id: number) {
    await apiClient.delete<ApiResponse<null>>(`/api/trips/${id}`, {
        headers: authHeaders(),
    })
}

export async function completeTrip(
    id: number,
    visibility: 'PRIVATE' | 'PUBLIC',
    tags: string[],
) {
    const response = await apiClient.post<
        ApiResponse<{
            tripId: number
            cardId: number
            visibility: 'PRIVATE' | 'PUBLIC'
            tags: string[]
        }>
    >(
        `/api/trips/${id}/complete`,
        { visibility, tags },
        { headers: authHeaders() },
    )
    return response.data
}

export async function createTripInvitation(id: number) {
    const response = await apiClient.post<
        ApiResponse<{ inviteCode: string; expiresAt: string }>
    >(`/api/trips/${id}/invitations`, {}, { headers: authHeaders() })
    return response.data
}

export async function fetchInvitedTrip(inviteCode: string) {
    const response = await apiClient.get<ApiResponse<TripResponse>>(
        `/api/trip-invitations/${encodeURIComponent(inviteCode)}/preview`,
    )
    return response.data
}
