'use client'

import { useEffect, useRef, useState } from 'react'
import { Client, ReconnectionTimeMode, type IMessage } from '@stomp/stompjs'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useNotificationStore } from '@/features/manage-notification'
import { markTripPresence, useTripStore } from '@/features/manage-trip'
import {
    type TripAwarenessEvent,
    type TripAwarenessPayload,
    safeStompPublish,
    useTripAwarenessStore,
} from '@/features/trip-awareness'
import {
    ACCESS_TOKEN_CHANGED_EVENT,
    BASE_URL,
    getAccessToken,
    getApiErrorStatus,
    redirectToSuspendedLogin,
} from '@/shared/api/client'
import { useCurrentUserStore, useRealtimeStore } from '@/shared/model'
import {
    REALTIME_EVENT_NAME,
    isAccountSuspendedEvent,
    parseRealtimeMessage,
    type AccountSuspendedEvent,
    type RealtimeEvent,
} from '@/shared/lib'

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
    const activeClientRef = useRef<Client | null>(null)
    const [accessTokenVersion, setAccessTokenVersion] = useState(0)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const currentUserId = currentUser?.id ?? null
    const activeTripId = useTripStore((state) => state.activeTripId)
    const rooms = useTripStore((state) => state.rooms)
    const loadedForMemberId = useTripStore(
        (state) => state.loadedForMemberId,
    )
    const tripStateReady =
        currentUserId != null && loadedForMemberId === currentUserId
    const activeTripAccessible =
        tripStateReady &&
        rooms.some(
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

        let stopped = false
        let intervalId: number | null = null
        const heartbeat = async () => {
            if (stopped) return
            try {
                await markTripPresence(tripId)
            } catch (error) {
                const status = getApiErrorStatus(error)
                if (status !== 403 && status !== 404) return
                stopped = true
                if (intervalId !== null) window.clearInterval(intervalId)
                await useTripStore.getState().loadTrips(currentUserId)
            }
        }
        void heartbeat()
        intervalId = window.setInterval(() => void heartbeat(), 25_000)
        return () => {
            stopped = true
            if (intervalId !== null) window.clearInterval(intervalId)
        }
    }, [accessTokenVersion, activeTripAccessible, activeTripId, currentUserId])

    useEffect(() => {
        const token = getAccessToken()
        const tripId = activeTripAccessible
            ? parseActiveTripId(activeTripId)
            : null
        useTripAwarenessStore.getState().setTrip(tripId)
        if (currentUserId == null || !token) {
            useRealtimeStore.getState().setConnected(false)
            useTripAwarenessStore.getState().setPublisher(null)
            return
        }

        const parseEvent = (message: IMessage) => {
            const event = parseRealtimeMessage<RealtimeEvent>(message.body)
            if (!event?.eventId) return null
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
            const event = parseRealtimeMessage<TripAwarenessEvent>(message.body)
            if (event) useTripAwarenessStore.getState().receive(event)
        }

        const handleAccountStatus = (message: IMessage) => {
            const event = parseRealtimeMessage<AccountSuspendedEvent>(
                message.body,
            )
            if (!isAccountSuspendedEvent(event, currentUserId)) return
            client.deactivate().catch(() => undefined)
            redirectToSuspendedLogin(event.noticeToken)
        }

        const markDisconnected = () => {
            if (activeClientRef.current !== client) return
            useRealtimeStore.getState().setConnected(false)
            useTripAwarenessStore.getState().setPublisher(null)
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
                if (activeClientRef.current !== client) return
                useRealtimeStore.getState().setConnected(true)
                client.subscribe(
                    '/user/queue/notifications',
                    handleNotification,
                )
                client.subscribe(
                    '/user/queue/account-status',
                    handleAccountStatus,
                )
                client.subscribe('/topic/public-cards', handlePublicCardChange)
                if (tripId != null) {
                    client.subscribe(`/topic/trips/${tripId}`, handleTripChange)
                    client.subscribe(
                        `/topic/trip-awareness/${tripId}`,
                        handleTripAwareness,
                    )
                    const publisher = (payload: TripAwarenessPayload) => {
                        const published = safeStompPublish(
                            client,
                            `/app/trip-awareness/${tripId}`,
                            JSON.stringify(payload),
                        )
                        if (!published) markDisconnected()
                    }
                    useTripAwarenessStore.getState().setPublisher(publisher)
                }
            },
            onDisconnect: markDisconnected,
            onStompError: markDisconnected,
            onWebSocketClose: markDisconnected,
            onWebSocketError: markDisconnected,
        })

        activeClientRef.current = client
        client.activate()
        const pruneIntervalId = window.setInterval(
            () => useTripAwarenessStore.getState().pruneExpired(),
            5_000,
        )
        return () => {
            window.clearInterval(pruneIntervalId)
            if (activeClientRef.current === client) {
                activeClientRef.current = null
                useRealtimeStore.getState().setConnected(false)
                useTripAwarenessStore.getState().setPublisher(null)
            }
            void client.deactivate()
        }
    }, [
        accessTokenVersion,
        activeTripAccessible,
        activeTripId,
        currentUserId,
    ])

    return null
}
