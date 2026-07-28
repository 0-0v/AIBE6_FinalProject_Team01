import { useCurrentUserStore } from '../model'

export const BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

// 백엔드가 반환하는 이미지 등은 상대 경로(예: /uploads/..)로 저장되므로,
// 프론트엔드(다른 오리진)에서 표시하려면 API 베이스 URL을 붙여야 한다.
export function resolveMediaUrl(
    path: string | null | undefined,
): string | null {
    if (!path) return null
    if (/^https?:\/\//.test(path)) return path
    return `${BASE_URL}${path}`
}

export function resolveGooglePlacePhotoUrl(
    photoName: string | null | undefined,
): string | null {
    if (!photoName) return null
    return `${BASE_URL}/api/places/photo?name=${encodeURIComponent(photoName)}`
}

type RequestOptions = Omit<RequestInit, 'method' | 'body'>

export type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

// Refresh Token은 httpOnly 쿠키로만 존재하고 JS에서 읽을 수 없다 (XSS 방어).
// Access Token은 메모리에만 두고 localStorage에 저장하지 않는다.
let accessToken: string | null = null

export function getAccessToken(): string | null {
    return accessToken
}

export function setAccessToken(token: string | null) {
    accessToken = token
}

// 서버가 재발급마다 Refresh Token을 rotation하므로, 동시에 여러 요청이 401을 받아도
// 재발급 호출은 한 번만 나가야 한다. 두 번째 호출이 이미 폐기된 쿠키로 요청하면
// 서버가 탈취로 간주해 세션 전체를 강제 로그아웃시키기 때문.
let refreshPromise: Promise<string> | null = null

function clearSession() {
    setAccessToken(null)
    useCurrentUserStore.getState().clearCurrentUser()
}

function redirectToLogin() {
    clearSession()
    if (window.location.pathname !== '/login') {
        window.location.assign('/login')
    }
}

async function refreshAccessToken(): Promise<string> {
    const res = await fetch(`${BASE_URL}/api/auth/reissue`, {
        method: 'POST',
        credentials: 'include',
    })

    if (!res.ok) {
        throw new Error('토큰 재발급에 실패했습니다.')
    }

    const body = (await res.json()) as ApiResponse<{ accessToken: string }>
    setAccessToken(body.data.accessToken)
    return body.data.accessToken
}

// 앱 최초 로드 시 메모리에 Access Token이 없으므로, httpOnly 쿠키로 남아있는
// Refresh Token으로 조용히 재발급을 시도해 로그인 상태를 복원한다.
export async function restoreSession(): Promise<string | null> {
    try {
        refreshPromise ??= refreshAccessToken().finally(() => {
            refreshPromise = null
        })
        return await refreshPromise
    } catch {
        return null
    }
}

export async function logout(): Promise<void> {
    try {
        await request<ApiResponse<void>>('/api/auth/logout', {
            method: 'POST',
        })
    } catch {
        // 네트워크 오류가 나도 클라이언트 쪽 로그아웃은 계속 진행한다.
    } finally {
        clearSession()
    }
}

function withAccessToken(
    headers: HeadersInit | undefined,
    token: string,
): HeadersInit {
    return { ...headers, Authorization: `Bearer ${token}` }
}

export function getApiErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    return error instanceof Error && error.message
        ? error.message
        : fallbackMessage
}

export function getApiErrorStatus(error: unknown): number | null {
    if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof error.status === 'number'
    ) {
        return error.status
    }
    return null
}

export function getApiErrorCode(error: unknown): string | null {
    if (
        typeof error === 'object' &&
        error !== null &&
        'data' in error &&
        typeof error.data === 'object' &&
        error.data !== null &&
        'code' in error.data &&
        typeof error.data.code === 'string'
    ) {
        return error.data.code
    }
    return null
}

async function request<T>(
    path: string,
    init?: RequestInit,
    retryOn401 = true,
): Promise<T> {
    const isFormData = init?.body instanceof FormData
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...init?.headers,
        },
    })

    if (res.status === 401 && retryOn401) {
        refreshPromise ??= refreshAccessToken().finally(() => {
            refreshPromise = null
        })

        try {
            const newAccessToken = await refreshPromise
            return request<T>(
                path,
                {
                    ...init,
                    headers: withAccessToken(init?.headers, newAccessToken),
                },
                false,
            )
        } catch {
            redirectToLogin()
            throw new Error('인증이 만료되어 다시 로그인해야 합니다.')
        }
    }

    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}))
        const error = Object.assign(
            new Error(errorBody.message ?? res.statusText),
            { status: res.status, data: errorBody },
        )
        throw error
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
}

export const apiClient = {
    get: <T>(path: string, options?: RequestOptions) =>
        request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body: unknown, options?: RequestOptions) =>
        request<T>(path, {
            ...options,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: JSON.stringify(body),
        }),
    postPublic: <T>(path: string, body: unknown, options?: RequestOptions) =>
        request<T>(
            path,
            {
                ...options,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
                body: JSON.stringify(body),
            },
            false,
        ),
    put: <T>(path: string, body: unknown, options?: RequestOptions) =>
        request<T>(path, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>(path, {
            ...options,
            method: 'PATCH',
            headers:
                body === undefined
                    ? options?.headers
                    : {
                          'Content-Type': 'application/json',
                          ...options?.headers,
                      },
            body: body === undefined ? undefined : JSON.stringify(body),
        }),
    delete: <T = void>(path: string, options?: RequestOptions) =>
        request<T>(path, { ...options, method: 'DELETE' }),
    // FormData는 브라우저가 Content-Type(multipart boundary)을 직접 설정해야 하므로
    // 이 메서드에서는 Content-Type 헤더를 지정하지 않는다.
    postForm: <T>(path: string, formData: FormData, options?: RequestOptions) =>
        request<T>(path, {
            ...options,
            method: 'POST',
            body: formData,
        }),
}
