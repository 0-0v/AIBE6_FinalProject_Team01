import { apiClient, getAccessToken } from '@/shared/api/client'
import type { CurrentUser } from '@/shared/model'

type ApiResponse<T> = { success: boolean; message: string; data: T }

function authHeaders(): HeadersInit {
    const accessToken = getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    return { Authorization: `Bearer ${accessToken}` }
}

export async function updateNickname(nickname: string) {
    const response = await apiClient.patch<ApiResponse<CurrentUser>>(
        '/api/members/me/nickname',
        { nickname },
        { headers: authHeaders() },
    )
    return response.data
}

export async function uploadProfileImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.postForm<ApiResponse<CurrentUser>>(
        '/api/members/me/profile-image',
        formData,
        { headers: authHeaders() },
    )
    return response.data
}
