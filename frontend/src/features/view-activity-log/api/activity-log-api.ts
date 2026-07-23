import type { ActivityLog } from '@/entities/activity-log'
import { apiClient } from '@/shared/api/client'

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

export type ActivityLogPage = {
    content: ActivityLog[]
    page: number
    size: number
    totalElements: number
    totalPages: number
    first: boolean
    last: boolean
    empty: boolean
}

function authorizationHeaders(): HeadersInit {
    const accessToken = window.localStorage.getItem('accessToken')
    if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
    }
    return { Authorization: `Bearer ${accessToken}` }
}

export async function fetchActivityLogs(
    tripId: number,
    page: number,
): Promise<ActivityLogPage> {
    const response = await apiClient.get<ApiResponse<ActivityLogPage>>(
        `/api/trips/${tripId}/activity-logs?page=${page}&size=20`,
        { headers: authorizationHeaders() },
    )
    return response.data
}
