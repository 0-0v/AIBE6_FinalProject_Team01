import {
    apiClient,
    type ApiResponse,
    setAccessToken,
} from '@/shared/api/client'
import { fetchCurrentUser } from '@/shared/api/current-user'
import { useCurrentUserStore } from '@/shared/model'

export type PageResponse<T> = {
    content: T[]
    page: number
    size: number
    totalElements: number
    totalPages: number
    first: boolean
    last: boolean
    empty: boolean
}

export type AdminMember = {
    id: number
    email: string
    nickname: string
    provider: string
    role: 'USER' | 'ADMIN'
    status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'
    lastLoginAt: string | null
    createdAt: string
    suspendedUntil: string | null
}

export type AdminDashboard = {
    totalMembers: number
    activeMembers: number
    suspendedMembers: number
    totalTrips: number
    externalApiCallsToday: number
}

export type AdminTrip = {
    id: number
    title: string
    ownerId: number
    status: string
    startDate: string | null
    endDate: string | null
    visibility: string
    createdAt: string
}

export type ExternalApiUsage = {
    id: number
    provider: 'OPENAI' | 'GOOGLE_PLACES' | 'GOOGLE_ROUTES'
    operation: string
    success: boolean
    inputTokens: number | null
    outputTokens: number | null
    createdAt: string
}

export type AdminActionLog = {
    id: number
    adminId: number
    actionType: string
    targetType: string
    targetId: number
    reason: string
    createdAt: string
}

export type TripCoverPreset = {
    id: number
    presetKey: string
    imageUrl: string
    active: boolean
    sortOrder: number
    createdAt: string
}

export async function requestAdminOtp(identifier: string, password: string) {
    const response = await apiClient.postPublic<
        ApiResponse<{
            challengeToken: string
            maskedEmail: string
            expiresInSeconds: number
        }>
    >('/api/auth/admin/login', { identifier, password })
    return response.data
}

export async function verifyAdminOtp(challengeToken: string, code: string) {
    const response = await apiClient.postPublic<
        ApiResponse<{ accessToken: string }>
    >('/api/auth/admin/login/verify', { challengeToken, code })
    setAccessToken(response.data.accessToken)
    const user = await fetchCurrentUser(response.data.accessToken)
    if (!user || user.role !== 'ADMIN') {
        setAccessToken(null)
        throw new Error('관리자 정보를 확인할 수 없습니다.')
    }
    useCurrentUserStore.getState().setCurrentUser(user)
}

export const getAdminDashboard = () =>
    apiClient.get<ApiResponse<AdminDashboard>>('/api/admin/dashboard')

export const getAdminMembers = (query = '', page = 0) =>
    apiClient.get<ApiResponse<PageResponse<AdminMember>>>(
        `/api/admin/members?query=${encodeURIComponent(query)}&page=${page}&size=20`,
    )

export const getAdminMemberTrips = (memberId: number) =>
    apiClient.get<ApiResponse<PageResponse<AdminTrip>>>(
        `/api/admin/members/${memberId}/trips?page=0&size=50`,
    )

export const getAdminMemberApiUsages = (memberId: number) =>
    apiClient.get<ApiResponse<PageResponse<ExternalApiUsage>>>(
        `/api/admin/members/${memberId}/api-usages?page=0&size=50`,
    )

export const suspendMember = (
    memberId: number,
    reason: string,
    suspendedUntil: string | null,
) =>
    apiClient.patch<ApiResponse<AdminMember>>(
        `/api/admin/members/${memberId}/suspension`,
        { reason, suspendedUntil },
    )

export const releaseMember = (memberId: number, reason: string) =>
    apiClient.patch<ApiResponse<AdminMember>>(
        `/api/admin/members/${memberId}/suspension/release`,
        { reason, suspendedUntil: null },
    )

export const getAdminActionLogs = () =>
    apiClient.get<ApiResponse<PageResponse<AdminActionLog>>>(
        '/api/admin/action-logs?page=0&size=50',
    )

export const getAdminCoverPresets = () =>
    apiClient.get<ApiResponse<TripCoverPreset[]>>(
        '/api/admin/trip-cover-presets',
    )

export const uploadAdminCoverPreset = (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.postForm<ApiResponse<TripCoverPreset>>(
        '/api/admin/trip-cover-presets',
        formData,
    )
}

export const setAdminCoverPresetActive = (presetId: number, active: boolean) =>
    apiClient.patch<ApiResponse<TripCoverPreset>>(
        `/api/admin/trip-cover-presets/${presetId}/active?active=${active}`,
    )
