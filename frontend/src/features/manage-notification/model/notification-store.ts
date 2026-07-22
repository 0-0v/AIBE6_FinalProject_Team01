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
    unreadCount: number
    isLoading: boolean
    error: string | null
    loadNotifications: () => Promise<void>
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    loadNotifications: async () => {
        set({ isLoading: true, error: null })
        try {
            const [notifications, unreadCount] = await Promise.all([
                fetchNotifications(),
                fetchUnreadNotificationCount(),
            ])
            set({ notifications, unreadCount, isLoading: false })
        } catch (error) {
            set({ error: errorMessage(error), isLoading: false })
        }
    },

    loadUnreadCount: async () => {
        try {
            const unreadCount = await fetchUnreadNotificationCount()
            set({ unreadCount })
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

    resetNotifications: () =>
        set({
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            error: null,
        }),
}))
