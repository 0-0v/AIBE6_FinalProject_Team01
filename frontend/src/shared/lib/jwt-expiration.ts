export function getJwtExpirationTime(token: string): number | null {
    try {
        const payload = token.split('.')[1]
        if (!payload) return null

        const normalized = payload.replaceAll('-', '+').replaceAll('_', '/')
        const padded = normalized.padEnd(
            normalized.length + ((4 - (normalized.length % 4)) % 4),
            '=',
        )
        const claims = JSON.parse(globalThis.atob(padded)) as { exp?: unknown }

        return typeof claims.exp === 'number' && Number.isFinite(claims.exp)
            ? claims.exp * 1000
            : null
    } catch {
        return null
    }
}
