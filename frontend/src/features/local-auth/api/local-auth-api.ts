import {
    apiClient,
    type ApiResponse,
    setAccessToken,
} from '@/shared/api/client'
import { fetchCurrentUser } from '@/shared/api/current-user'
import { setLastLoginProvider } from '@/shared/lib'
import { useCurrentUserStore } from '@/shared/model'

export type VerificationPurpose = 'SIGNUP' | 'PASSWORD_RESET'

type TokenResponse = ApiResponse<{ accessToken: string }>
type NicknameAvailabilityResponse = ApiResponse<{ available: boolean }>

export async function sendVerificationCode(
    email: string,
    purpose: VerificationPurpose,
) {
    return apiClient.postPublic<ApiResponse<null>>(
        '/api/auth/email-verifications',
        { email, purpose },
    )
}

export async function confirmVerificationCode(
    email: string,
    code: string,
    purpose: VerificationPurpose,
) {
    return apiClient.postPublic<ApiResponse<null>>(
        '/api/auth/email-verifications/confirm',
        { email, code, purpose },
    )
}

export async function signup(
    email: string,
    password: string,
    nickname: string,
) {
    const response = await apiClient.postPublic<TokenResponse>(
        '/api/auth/signup',
        { email, password, nickname },
    )
    await establishSession(response.data.accessToken)
}

export async function checkNicknameAvailability(nickname: string) {
    const response =
        await apiClient.postPublic<NicknameAvailabilityResponse>(
            '/api/auth/nickname-availability',
            { nickname },
        )
    return response.data.available
}

export async function login(identifier: string, password: string) {
    const response = await apiClient.postPublic<TokenResponse>(
        '/api/auth/login',
        { identifier, password },
    )
    await establishSession(response.data.accessToken)
    setLastLoginProvider('LOCAL')
}

export async function resetPassword(email: string, newPassword: string) {
    return apiClient.postPublic<ApiResponse<null>>('/api/auth/password-reset', {
        email,
        newPassword,
    })
}

async function establishSession(accessToken: string) {
    setAccessToken(accessToken)
    const currentUser = await fetchCurrentUser(accessToken)
    if (!currentUser) {
        setAccessToken(null)
        throw new Error('사용자 정보를 불러오지 못했습니다.')
    }
    useCurrentUserStore.getState().setCurrentUser(currentUser)
}
