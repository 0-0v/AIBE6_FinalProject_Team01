import type { PendingAiTripAction } from '../model/types'

const STORAGE_PREFIX = 'plamingo:pending-ai-trip-action:'

export function savePendingAiTripAction(
    tripId: number,
    action: PendingAiTripAction,
) {
    window.sessionStorage.setItem(
        `${STORAGE_PREFIX}${tripId}`,
        JSON.stringify(action),
    )
}

export function consumePendingAiTripAction(
    tripId: number,
): PendingAiTripAction | null {
    const key = `${STORAGE_PREFIX}${tripId}`
    const stored = window.sessionStorage.getItem(key)
    if (!stored) return null
    window.sessionStorage.removeItem(key)
    try {
        return JSON.parse(stored) as PendingAiTripAction
    } catch {
        return null
    }
}
