import { useEffect, useMemo } from 'react'
import { useCurrentUserStore, useRealtimeStore } from '@/shared/model'
import {
    type TripAwarenessPayload,
    type TripAwarenessWorkspace,
    type TripMapViewport,
    useTripAwarenessStore,
} from './trip-awareness-store'

const AWARENESS_HEARTBEAT_MS = 10_000

type Options = {
    enabled: boolean
    tripId: number | null
    workspace: TripAwarenessWorkspace
    selectedDay: number | null
    selectedPlaceId: string | null
    selectedPlaceName: string | null
    viewport: TripMapViewport | null
}

export function usePublishTripAwareness({
    enabled,
    tripId,
    workspace,
    selectedDay,
    selectedPlaceId,
    selectedPlaceName,
    viewport,
}: Options) {
    const connected = useRealtimeStore((state) => state.connected)
    const currentMemberId = useCurrentUserStore(
        (state) => state.currentUser?.id ?? null,
    )
    const localEditing = useTripAwarenessStore((state) => state.localEditing)
    const publisher = useTripAwarenessStore((state) => state.publisher)
    const setTrip = useTripAwarenessStore((state) => state.setTrip)
    const receive = useTripAwarenessStore((state) => state.receive)
    const payload = useMemo<TripAwarenessPayload>(
        () => ({
            workspace,
            selectedDay,
            selectedPlaceId,
            selectedPlaceName,
            mapLat: viewport?.lat ?? null,
            mapLng: viewport?.lng ?? null,
            mapZoom: viewport?.zoom ?? null,
            editingType: localEditing?.type ?? null,
            editingTargetId: localEditing?.targetId ?? null,
            editingLabel: localEditing?.label ?? null,
        }),
        [
            localEditing,
            selectedDay,
            selectedPlaceId,
            selectedPlaceName,
            viewport,
            workspace,
        ],
    )

    useEffect(() => {
        if (!enabled || tripId == null || currentMemberId == null) return

        const publishAwareness = () => {
            const occurredAt = new Date().toISOString()
            setTrip(tripId)
            receive({
                ...payload,
                tripId,
                memberId: currentMemberId,
                occurredAt,
            })
            if (connected && publisher) publisher(payload)
        }

        publishAwareness()
        const intervalId = window.setInterval(
            publishAwareness,
            AWARENESS_HEARTBEAT_MS,
        )
        return () => window.clearInterval(intervalId)
    }, [
        connected,
        currentMemberId,
        enabled,
        payload,
        publisher,
        receive,
        setTrip,
        tripId,
    ])
}
