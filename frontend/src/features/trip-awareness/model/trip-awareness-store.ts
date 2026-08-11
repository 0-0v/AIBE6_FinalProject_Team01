import { create } from 'zustand'

export type TripAwarenessWorkspace =
    'places' | 'itinerary' | 'schedule' | 'record'

export type TripMapViewport = {
    lat: number
    lng: number
    zoom: number
}

export type TripEditingContext = {
    type: string
    targetId: string
    label: string
}

export type TripAwarenessPayload = {
    workspace: TripAwarenessWorkspace
    selectedDay: number | null
    selectedPlaceId: string | null
    selectedPlaceName: string | null
    mapLat: number | null
    mapLng: number | null
    mapZoom: number | null
    editingType: string | null
    editingTargetId: string | null
    editingLabel: string | null
}

export type TripAwarenessEvent = TripAwarenessPayload & {
    tripId: number
    memberId: number
    occurredAt: string
}

export type ActiveTripAwareness = TripAwarenessEvent & {
    receivedAt: number
}

type AwarenessPublisher = (payload: TripAwarenessPayload) => void

type TripAwarenessState = {
    tripId: number | null
    awarenessByMemberId: Record<number, ActiveTripAwareness>
    publisher: AwarenessPublisher | null
    localEditing: TripEditingContext | null
    setTrip: (tripId: number | null) => void
    setPublisher: (publisher: AwarenessPublisher | null) => void
    receive: (event: TripAwarenessEvent) => void
    pruneExpired: (now?: number) => void
    setLocalEditing: (editing: TripEditingContext | null) => void
    clearLocalEditing: (targetId: string) => void
}

export const TRIP_AWARENESS_TTL_MS = 30_000

export const useTripAwarenessStore = create<TripAwarenessState>((set) => ({
    tripId: null,
    awarenessByMemberId: {},
    publisher: null,
    localEditing: null,
    setTrip: (tripId) =>
        set((state) =>
            state.tripId === tripId
                ? state
                : {
                      tripId,
                      awarenessByMemberId: {},
                      localEditing: null,
                  },
        ),
    setPublisher: (publisher) => set({ publisher }),
    receive: (event) =>
        set((state) => {
            if (state.tripId !== event.tripId) return state
            return {
                awarenessByMemberId: {
                    ...state.awarenessByMemberId,
                    [event.memberId]: { ...event, receivedAt: Date.now() },
                },
            }
        }),
    pruneExpired: (now = Date.now()) =>
        set((state) => {
            const activeEntries = Object.entries(
                state.awarenessByMemberId,
            ).filter(
                ([, awareness]) =>
                    now - awareness.receivedAt <= TRIP_AWARENESS_TTL_MS,
            )
            if (
                activeEntries.length ===
                Object.keys(state.awarenessByMemberId).length
            ) {
                return state
            }
            return {
                awarenessByMemberId: Object.fromEntries(activeEntries),
            }
        }),
    setLocalEditing: (localEditing) => set({ localEditing }),
    clearLocalEditing: (targetId) =>
        set((state) =>
            state.localEditing?.targetId === targetId
                ? { localEditing: null }
                : state,
        ),
}))
