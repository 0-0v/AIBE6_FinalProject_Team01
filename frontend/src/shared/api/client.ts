import { useCurrentUserStore } from '../model'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

type RequestOptions = Omit<RequestInit, 'method' | 'body'>

type ApiEnvelope<T> = {
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

    const body = (await res.json()) as ApiEnvelope<{ accessToken: string }>
    setAccessToken(body.data.accessToken)
    return body.data.accessToken
}

// 앱 최초 로드 시 메모리에 Access Token이 없으므로, httpOnly 쿠키로 남아있는
// Refresh Token으로 조용히 재발급을 시도해 로그인 상태를 복원한다.
export async function restoreSession(): Promise<string | null> {
    try {
        return await refreshAccessToken()
    } catch {
        return null
    }
}

export async function logout(): Promise<void> {
    if (accessToken) {
        try {
            await fetch(`${BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: { Authorization: `Bearer ${accessToken}` },
            })
        } catch {
            // 네트워크 오류가 나도 클라이언트 쪽 로그아웃은 계속 진행한다.
        }
    }
    clearSession()
}

function withAccessToken(
    headers: HeadersInit | undefined,
    token: string,
): HeadersInit {
    return { ...headers, Authorization: `Bearer ${token}` }
}

async function request<T>(
    path: string,
    init?: RequestInit,
    retryOn401 = true,
): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
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
                { ...init, headers: withAccessToken(init?.headers, newAccessToken) },
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

    return res.json() as Promise<T>
}

export const apiClient = {
    get: <T>(path: string, options?: RequestOptions) =>
        request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body: unknown, options?: RequestOptions) =>
        request<T>(path, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>(path, {
            ...options,
            method: 'PATCH',
            body: body === undefined ? undefined : JSON.stringify(body),
        }),
    delete: <T>(path: string, options?: RequestOptions) =>
        request<T>(path, { ...options, method: 'DELETE' }),
}
