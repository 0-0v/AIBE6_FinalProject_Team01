'use client'

import { useEffect, useRef } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useNotificationStore } from '@/features/manage-notification'
import { useTripStore } from '@/features/manage-trip'
import { BASE_URL, getAccessToken } from '@/shared/api/client'
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

export function RealtimeSync() {
    const handledEventIds = useRef(new Set<string>())
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const activeTripId = useTripStore((state) => state.activeTripId)

    useEffect(() => {
        const token = getAccessToken()
        if (!currentUser || !token) {
            useRealtimeStore.getState().setConnected(false)
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
            void useTripStore.getState().loadTrips()

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

        const client = new Client({
            brokerURL: websocketUrl(),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 3_000,
            heartbeatIncoming: 10_000,
            heartbeatOutgoing: 10_000,
            onConnect: () => {
                useRealtimeStore.getState().setConnected(true)
                client.subscribe(
                    '/user/queue/notifications',
                    handleNotification,
                )
                client.subscribe('/topic/public-cards', handlePublicCardChange)
                if (activeTripId) {
                    client.subscribe(
                        `/topic/trips/${activeTripId}`,
                        handleTripChange,
                    )
                }
            },
            onDisconnect: () =>
                useRealtimeStore.getState().setConnected(false),
            onWebSocketClose: () =>
                useRealtimeStore.getState().setConnected(false),
        })

        client.activate()
        return () => {
            useRealtimeStore.getState().setConnected(false)
            void client.deactivate()
        }
    }, [activeTripId, currentUser])

    return null
}
