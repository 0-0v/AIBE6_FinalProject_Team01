import { create } from 'zustand'
import type { Notification } from '@/entities/notification'
import {
    fetchNotifications,
    fetchUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '../api/notification-api'

type NotificationState = {
    notifications: Notification[]
    page: number
    totalPages: number
    totalElements: number
    unreadCount: number
    isLoading: boolean
    error: string | null
    loadNotifications: (page?: number) => Promise<void>
    loadUnreadCount: () => Promise<void>
    readNotification: (notificationId: number) => Promise<void>
    readAllNotifications: () => Promise<void>
    resetNotifications: () => void
}

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : '알림을 처리하는 중 오류가 발생했습니다.'
}

let notificationRevision = 0
let notificationRequestId = 0

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    page: 0,
    totalPages: 0,
    totalElements: 0,
    unreadCount: 0,
    isLoading: false,
    error: null,

    loadNotifications: async (page) => {
        const requestedPage = Math.max(0, page ?? get().page)
        const revision = notificationRevision
        const requestId = ++notificationRequestId
        set({
            isLoading:
                get().notifications.length === 0 || requestedPage !== get().page,
            error: null,
        })
        try {
            const [notificationPage, unreadCount] = await Promise.all([
                fetchNotifications(requestedPage),
                fetchUnreadNotificationCount(),
            ])
            if (
                revision === notificationRevision &&
                requestId === notificationRequestId
            ) {
                set({
                    notifications: notificationPage.content,
                    page: notificationPage.page,
                    totalPages: notificationPage.totalPages,
                    totalElements: notificationPage.totalElements,
                    unreadCount,
                    isLoading: false,
                })
            }
        } catch (error) {
            if (requestId === notificationRequestId) {
                set({ error: errorMessage(error), isLoading: false })
            }
        }
    },

    loadUnreadCount: async () => {
        const revision = notificationRevision
        try {
            const unreadCount = await fetchUnreadNotificationCount()
            if (revision === notificationRevision) set({ unreadCount })
        } catch {
            set({ unreadCount: 0 })
        }
    },

    readNotification: async (notificationId) => {
        const notification = get().notifications.find(
            (item) => item.id === notificationId,
        )
        if (!notification || notification.read) {
            return
        }

        try {
            await markNotificationAsRead(notificationId)
            notificationRevision += 1
            const readAt = new Date().toISOString()
            set((state) => ({
                notifications: state.notifications.map((item) =>
                    item.id === notificationId
                        ? { ...item, read: true, readAt }
                        : item,
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
                error: null,
            }))
        } catch (error) {
            set({ error: errorMessage(error) })
        }
    },

    readAllNotifications: async () => {
        if (get().unreadCount === 0) {
            return
        }

        try {
            await markAllNotificationsAsRead()
            notificationRevision += 1
            const readAt = new Date().toISOString()
            set((state) => ({
                notifications: state.notifications.map((item) =>
                    item.read ? item : { ...item, read: true, readAt },
                ),
                unreadCount: 0,
                error: null,
            }))
        } catch (error) {
            set({ error: errorMessage(error) })
        }
    },

    resetNotifications: () => {
        notificationRevision += 1
        set({
            notifications: [],
            page: 0,
            totalPages: 0,
            totalElements: 0,
            unreadCount: 0,
            isLoading: false,
            error: null,
        })
    },
}))
