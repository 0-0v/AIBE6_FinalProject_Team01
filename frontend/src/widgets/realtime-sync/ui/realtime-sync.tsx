'use client'

import { useEffect, useRef, useState } from 'react'
import { Client, ReconnectionTimeMode, type IMessage } from '@stomp/stompjs'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useNotificationStore } from '@/features/manage-notification'
import { markTripPresence, useTripStore } from '@/features/manage-trip'
import {
    type TripAwarenessEvent,
    type TripAwarenessPayload,
    useTripAwarenessStore,
} from '@/features/trip-awareness'
import {
    ACCESS_TOKEN_CHANGED_EVENT,
    BASE_URL,
    getAccessToken,
} from '@/shared/api/client'
import { useCurrentUserStore, useRealtimeStore } from '@/shared/model'

export const REALTIME_EVENT_NAME = 'plamingo:realtime'

export type RealtimeEvent = {
    eventId: string
    type: string
    tripId: number | null
    targetType: string | null
    targetId: number | null
    occurredAt: string
}

function websocketUrl() {
    return (
        process.env.NEXT_PUBLIC_WS_URL ??
        `${BASE_URL.replace(/^http/, 'ws')}/ws`
    )
}

function parseActiveTripId(value: string | null) {
    if (value == null || value.trim() === '') return null
    const tripId = Number(value)
    return Number.isSafeInteger(tripId) && tripId > 0 ? tripId : null
}

export function RealtimeSync() {
    const handledEventIds = useRef(new Set<string>())
    const [accessTokenVersion, setAccessTokenVersion] = useState(0)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const currentUserId = currentUser?.id ?? null
    const activeTripId = useTripStore((state) => state.activeTripId)
    const rooms = useTripStore((state) => state.rooms)
    const activeTripAccessible = rooms.some(
        (room) => room.apiTripId === parseActiveTripId(activeTripId),
    )

    useEffect(() => {
        const handleAccessTokenChange = () =>
            setAccessTokenVersion((current) => current + 1)
        window.addEventListener(
            ACCESS_TOKEN_CHANGED_EVENT,
            handleAccessTokenChange,
        )
        return () =>
            window.removeEventListener(
                ACCESS_TOKEN_CHANGED_EVENT,
                handleAccessTokenChange,
            )
    }, [])

    useEffect(() => {
        const tripId = parseActiveTripId(activeTripId)
        if (currentUserId == null || tripId == null || !activeTripAccessible)
            return

        const heartbeat = () => {
            void markTripPresence(tripId).catch(() => undefined)
        }
        heartbeat()
        const intervalId = window.setInterval(heartbeat, 25_000)
        return () => window.clearInterval(intervalId)
    }, [accessTokenVersion, activeTripAccessible, activeTripId, currentUserId])

    useEffect(() => {
        const token = getAccessToken()
        const tripId = parseActiveTripId(activeTripId)
        useTripAwarenessStore.getState().setTrip(tripId)
        if (currentUserId == null || !token) {
            useRealtimeStore.getState().setConnected(false)
            useTripAwarenessStore.getState().setPublisher(null)
            return
        }

        const parseEvent = (message: IMessage) => {
            const event = JSON.parse(message.body) as RealtimeEvent
            if (handledEventIds.current.has(event.eventId)) return null
            handledEventIds.current.add(event.eventId)
            window.setTimeout(
                () => handledEventIds.current.delete(event.eventId),
                30_000,
            )
            return event
        }

        const handleNotification = (message: IMessage) => {
            if (!parseEvent(message)) return
            void useNotificationStore.getState().loadNotifications()
        }

        const handleTripChange = (message: IMessage) => {
            const event = parseEvent(message)
            if (!event) return
            if (
                event.type === 'TRIP_MEMBERS_CHANGED' ||
                event.targetType === 'TRIP'
            ) {
                void useTripStore.getState().loadTrips()
            }

            const activityState = useActivityLogStore.getState()
            if (
                event.tripId !== null &&
                activityState.tripId === event.tripId
            ) {
                void activityState.loadActivityLogs(event.tripId)
            }
            window.dispatchEvent(
                new CustomEvent<RealtimeEvent>(REALTIME_EVENT_NAME, {
                    detail: event,
                }),
            )
        }

        const handlePublicCardChange = (message: IMessage) => {
            const event = parseEvent(message)
            if (!event) return
            window.dispatchEvent(
                new CustomEvent<RealtimeEvent>(REALTIME_EVENT_NAME, {
                    detail: event,
                }),
            )
        }

        const handleTripAwareness = (message: IMessage) => {
            const event = JSON.parse(message.body) as TripAwarenessEvent
            useTripAwarenessStore.getState().receive(event)
        }

        const client = new Client({
            brokerURL: websocketUrl(),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 3_000,
            reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
            maxReconnectDelay: 30_000,
            heartbeatIncoming: 10_000,
            heartbeatOutgoing: 10_000,
            onConnect: () => {
                useRealtimeStore.getState().setConnected(true)
                client.subscribe(
                    '/user/queue/notifications',
                    handleNotification,
                )
                client.subscribe('/topic/public-cards', handlePublicCardChange)
                if (tripId != null) {
                    client.subscribe(`/topic/trips/${tripId}`, handleTripChange)
                    client.subscribe(
                        `/topic/trip-awareness/${tripId}`,
                        handleTripAwareness,
                    )
                    const publisher = (payload: TripAwarenessPayload) => {
                        client.publish({
                            destination: `/app/trip-awareness/${tripId}`,
                            body: JSON.stringify(payload),
                        })
                    }
                    useTripAwarenessStore.getState().setPublisher(publisher)
                }
            },
            onDisconnect: () => useRealtimeStore.getState().setConnected(false),
            onWebSocketClose: () =>
                useRealtimeStore.getState().setConnected(false),
        })

        client.activate()
        const pruneIntervalId = window.setInterval(
            () => useTripAwarenessStore.getState().pruneExpired(),
            5_000,
        )
        return () => {
            window.clearInterval(pruneIntervalId)
            useRealtimeStore.getState().setConnected(false)
            useTripAwarenessStore.getState().setPublisher(null)
            void client.deactivate()
        }
    }, [activeTripId, currentUserId])

    return null
}
