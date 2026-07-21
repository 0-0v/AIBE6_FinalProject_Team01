const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

type RequestOptions = Omit<RequestInit, 'method' | 'body'>

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    })

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
}
