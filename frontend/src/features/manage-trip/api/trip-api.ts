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
    coverImageUrl: string | null
    memberCount: number
    status: 'PLANNING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    visibility: 'PRIVATE' | 'PUBLIC'
    completionConfirmed: boolean
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
export type TripMember = {
    memberId: number
    nickname: string
    profileImageUrl: string | null
    online: boolean
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
export async function fetchTripMembers(id: number) {
    const response = await apiClient.get<ApiResponse<TripMember[]>>(
        `/api/trips/${id}/members`,
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

export async function updateTripVisibility(
    id: number,
    visibility: 'PRIVATE' | 'PUBLIC',
) {
    const response = await apiClient.patch<ApiResponse<TripResponse>>(
        `/api/trips/${id}/visibility`,
        { visibility },
        { headers: authHeaders() },
    )
    return response.data
}

export async function confirmTripCompletion(
    id: number,
    visibility: 'PRIVATE' | 'PUBLIC',
    tags: string[],
) {
    const response = await apiClient.post<ApiResponse<TripResponse>>(
        `/api/trips/${id}/completion-confirmation`,
        { visibility, tags },
        { headers: authHeaders() },
    )
    return response.data
}

export async function uploadTripCoverImage(id: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.postForm<ApiResponse<TripResponse>>(
        `/api/trips/${id}/cover-image`,
        formData,
        { headers: authHeaders() },
    )
    return response.data
}

export async function deleteTrip(id: number) {
    await apiClient.delete<ApiResponse<null>>(`/api/trips/${id}`, {
        headers: authHeaders(),
    })
}

export async function leaveTrip(id: number) {
    await apiClient.delete<ApiResponse<null>>(`/api/trips/${id}/members/me`, {
        headers: authHeaders(),
    })
}

export async function createTripInvitation(id: number) {
    const response = await apiClient.post<
        ApiResponse<{ inviteCode: string; expiresAt: string }>
    >(`/api/trips/${id}/invitations`, {}, { headers: authHeaders() })
    return response.data
}

const pendingInvitedTripRequests = new Map<string, Promise<TripResponse>>()

export function fetchInvitedTrip(inviteCode: string): Promise<TripResponse> {
    const pendingRequest = pendingInvitedTripRequests.get(inviteCode)
    if (pendingRequest) return pendingRequest

    const request = apiClient
        .postPublic<ApiResponse<TripResponse>>(
            `/api/trip-invitations/${encodeURIComponent(inviteCode)}/accept`,
            {},
        )
        .then((response) => response.data)
        .finally(() => {
            if (pendingInvitedTripRequests.get(inviteCode) === request) {
                pendingInvitedTripRequests.delete(inviteCode)
            }
        })
    pendingInvitedTripRequests.set(inviteCode, request)
    return request
}

export async function claimGuestTripAccess(): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/api/trip-invitations/claim', {})
}
