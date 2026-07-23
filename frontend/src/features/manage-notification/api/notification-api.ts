import type { Notification } from '@/entities/notification'
import { apiClient, getAccessToken } from '@/shared/api/client'

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

type PageResponse<T> = {
    content: T[]
    page: number
    size: number
    totalElements: number
    totalPages: number
    first: boolean
    last: boolean
    empty: boolean
}

type UnreadCountResponse = {
    count: number
}

type ReadCountResponse = {
    count: number
}

function authorizationHeaders(): HeadersInit {
    const accessToken = getAccessToken()
    if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
    }
    return { Authorization: `Bearer ${accessToken}` }
}

export async function fetchNotifications(): Promise<Notification[]> {
    const response = await apiClient.get<
        ApiResponse<PageResponse<Notification>>
    >('/api/notifications?page=0&size=20', {
        headers: authorizationHeaders(),
    })
    return response.data.content
}

export async function fetchUnreadNotificationCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<UnreadCountResponse>>(
        '/api/notifications/unread-count',
        { headers: authorizationHeaders() },
    )
    return response.data.count
}

export async function markNotificationAsRead(
    notificationId: number,
): Promise<void> {
    await apiClient.patch<ApiResponse<null>>(
        `/api/notifications/${notificationId}/read`,
        undefined,
        { headers: authorizationHeaders() },
    )
}

export async function markAllNotificationsAsRead(): Promise<number> {
    const response = await apiClient.patch<ApiResponse<ReadCountResponse>>(
        '/api/notifications/read-all',
        undefined,
        { headers: authorizationHeaders() },
    )
    return response.data.count
}
