import { apiClient } from './client'
import type { CurrentUser } from '../model/current-user-store'

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

export async function fetchCurrentUser(
    accessToken: string,
): Promise<CurrentUser | null> {
    try {
        const res = await apiClient.get<ApiResponse<CurrentUser>>(
            '/api/members/me',
            { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        return res.data
    } catch {
        return null
    }
}
