import { useCallback, useEffect, useRef, useState } from 'react'
import {
    REALTIME_EVENT_NAME,
    isTripRealtimeEvent,
    type RealtimeEvent,
} from '@/shared/lib'
import { fetchTripMembers, type TripMember } from '../api/trip-api'

const MEMBER_POLL_INTERVAL_MS = 30_000

export function useTripMembers(tripId: number) {
    const [members, setMembers] = useState<TripMember[]>([])
    const [error, setError] = useState<unknown>(null)
    const requestRef = useRef<AbortController | null>(null)

    const refresh = useCallback(async () => {
        requestRef.current?.abort()
        const controller = new AbortController()
        requestRef.current = controller
        try {
            const nextMembers = await fetchTripMembers(tripId, controller.signal)
            if (!controller.signal.aborted) {
                setMembers(nextMembers)
                setError(null)
            }
        } catch (cause) {
            if (!controller.signal.aborted) setError(cause)
        } finally {
            if (requestRef.current === controller) requestRef.current = null
        }
    }, [tripId])

    useEffect(() => {
        void Promise.resolve().then(refresh)
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') void refresh()
        }, MEMBER_POLL_INTERVAL_MS)
        const handleRealtimeChange = (event: Event) => {
            const detail = (event as CustomEvent<RealtimeEvent>).detail
            if (isTripRealtimeEvent(detail, tripId, 'TRIP_MEMBERS_CHANGED')) {
                void refresh()
            }
        }
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') void refresh()
        }
        window.addEventListener(REALTIME_EVENT_NAME, handleRealtimeChange)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            window.clearInterval(intervalId)
            requestRef.current?.abort()
            window.removeEventListener(REALTIME_EVENT_NAME, handleRealtimeChange)
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            )
        }
    }, [refresh, tripId])

    return { members, error, refresh }
}
