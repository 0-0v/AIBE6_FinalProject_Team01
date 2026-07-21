import type { CurrentUser } from '../../stores/current-user-store'

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

export async function fetchCurrentUser(
    accessToken: string,
): Promise<CurrentUser | null> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/members/me`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!response.ok) {
            return null
        }
        const body: ApiResponse<CurrentUser> = await response.json()
        return body.data
    } catch {
        return null
    }
}
