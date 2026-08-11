export function isAdminVerifiedToken(token: string | null): boolean {
    if (!token) return false
    try {
        const payload = token.split('.')[1]
        if (!payload) return false
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
        const claims = JSON.parse(atob(normalized)) as {
            adminVerifiedUntil?: number
        }
        return (
            typeof claims.adminVerifiedUntil === 'number' &&
            claims.adminVerifiedUntil > Date.now()
        )
    } catch {
        return false
    }
}
