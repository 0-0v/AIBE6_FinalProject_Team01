import { apiClient, resolveMediaUrl } from '@/shared/api/client'

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

export type TravelPace = 'FAST' | 'NORMAL' | 'RELAXED'

export type TripResponse = {
    id: number
    ownerId: number
    title: string
    companionType: CompanionType | null
    travelStyles: TravelStyle[]
    destination: string | null
    destinationLat: number | null
    destinationLng: number | null
    destinationEnglishName: string | null
    destinationCountryCode: string | null
    startDate: string | null
    endDate: string | null
    coverImageUrl: string | null
    memberCount: number
    status: 'PLANNING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    visibility: 'PRIVATE' | 'PUBLIC_ROUTE' | 'PUBLIC_RECORD'
    completionConfirmed: boolean
    createdAt: string
    updatedAt: string
    dayStartTime: string
    dayEndTime: string
    travelPace: TravelPace
}

export type TripVisibilitySettings = {
    visibility: 'PRIVATE' | 'PUBLIC_ROUTE' | 'PUBLIC_RECORD'
    tags: string[]
    description: string | null
    placeCount: number
    photoCount: number
    recordCount: number
}

export type TripRequest = {
    title: string
    companionType?: CompanionType | null
    travelStyles?: TravelStyle[]
    destination?: string | null
    destinationLat?: number | null
    destinationLng?: number | null
    destinationEnglishName?: string | null
    destinationCountryCode?: string | null
    startDate?: string | null
    endDate?: string | null
    dayStartTime?: string | null
    dayEndTime?: string | null
    travelPace?: TravelPace | null
}
export type TripMember = {
    memberId: number
    nickname: string
    profileImageUrl: string | null
    online: boolean
}

type ApiResponse<T> = { success: boolean; message: string; data: T }

export async function fetchTrips() {
    const response =
        await apiClient.get<ApiResponse<TripResponse[]>>('/api/trips')
    return response.data
}

export async function fetchTripMembers(id: number) {
    const response = await apiClient.get<ApiResponse<TripMember[]>>(
        `/api/trips/${id}/members`,
    )
    return response.data
}

export async function markTripPresence(id: number) {
    await apiClient.post<ApiResponse<void>>(`/api/trips/${id}/presence`, null)
}

export async function createTrip(request: TripRequest) {
    const response = await apiClient.post<ApiResponse<TripResponse>>(
        '/api/trips',
        request,
    )
    return response.data
}

export async function updateTrip(id: number, request: TripRequest) {
    const response = await apiClient.patch<ApiResponse<TripResponse>>(
        `/api/trips/${id}`,
        request,
    )
    return response.data
}

export async function updateTripVisibility(
    id: number,
    visibility: 'PRIVATE' | 'PUBLIC_ROUTE' | 'PUBLIC_RECORD',
) {
    const response = await apiClient.patch<ApiResponse<TripResponse>>(
        `/api/trips/${id}/visibility`,
        { visibility },
    )
    return response.data
}

export async function confirmTripCompletion(
    id: number,
    visibility: 'PRIVATE' | 'PUBLIC_ROUTE' | 'PUBLIC_RECORD',
    tags: string[],
    description: string,
) {
    const response = await apiClient.post<ApiResponse<TripResponse>>(
        `/api/trips/${id}/completion-confirmation`,
        { visibility, tags, description },
    )
    return response.data
}

export async function fetchTripVisibilitySettings(id: number) {
    const response = await apiClient.get<ApiResponse<TripVisibilitySettings>>(
        `/api/trips/${id}/visibility-settings`,
    )
    return response.data
}

export async function uploadTripCoverImage(id: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.postForm<ApiResponse<TripResponse>>(
        `/api/trips/${id}/cover-image`,
        formData,
    )
    return response.data
}

export async function setTripCoverImagePreset(id: number, presetKey: string) {
    const response = await apiClient.post<ApiResponse<TripResponse>>(
        `/api/trips/${id}/cover-image/preset`,
        { presetKey },
    )
    return response.data
}

export async function fetchTripCoverImagePresets() {
    const response = await apiClient.get<
        ApiResponse<Array<{ presetKey: string; imageUrl: string }>>
    >('/api/trip-cover-presets')
    return response.data.map((preset) => ({
        key: preset.presetKey,
        url: preset.imageUrl.startsWith('/assets/')
            ? preset.imageUrl
            : (resolveMediaUrl(preset.imageUrl) ?? preset.imageUrl),
    }))
}

export async function deleteTrip(id: number) {
    await apiClient.delete<ApiResponse<null>>(`/api/trips/${id}`)
}

export async function leaveTrip(id: number) {
    await apiClient.delete<ApiResponse<null>>(`/api/trips/${id}/members/me`)
}

export async function createTripInvitation(id: number) {
    const response = await apiClient.post<
        ApiResponse<{ inviteCode: string; expiresAt: string }>
    >(`/api/trips/${id}/invitations`, {})
    return response.data
}

export async function validateTripEmailInvitation(id: number, email: string) {
    const response = await apiClient.post<
        ApiResponse<{ available: boolean; message: string }>
    >(`/api/trips/${id}/email-invitations/validate`, { email })
    return response.data
}

export async function sendTripEmailInvitations(id: number, emails: string[]) {
    await apiClient.post<ApiResponse<null>>(
        `/api/trips/${id}/email-invitations`,
        {
            emails,
        },
    )
}

export async function consumeTripEmailInvitation(token: string) {
    const response = await apiClient.post<ApiResponse<{ tripId: number }>>(
        `/api/trips/email-invitations/${encodeURIComponent(token)}/accept`,
        {},
    )
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

export async function claimGuestTripAccess(inviteCode: string): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/api/trip-invitations/claim', {
        inviteCode,
    })
}
