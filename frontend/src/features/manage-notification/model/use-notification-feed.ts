import { useNavigate } from 'react-router-dom'
import type { Notification } from '@/entities/notification'
import { useCurrentUserStore } from '@/shared/model'
import { useNotificationStore } from './notification-store'

export function useNotificationFeed() {
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const notifications = useNotificationStore((state) => state.notifications)
    const unreadCount = useNotificationStore((state) => state.unreadCount)
    const isLoading = useNotificationStore((state) => state.isLoading)
    const error = useNotificationStore((state) => state.error)
    const loadNotifications = useNotificationStore(
        (state) => state.loadNotifications,
    )
    const readNotification = useNotificationStore(
        (state) => state.readNotification,
    )
    const readAllNotifications = useNotificationStore(
        (state) => state.readAllNotifications,
    )

    async function openNotification(notification: Notification) {
        await readNotification(notification.id)
        if (
            notification.targetType === 'TRIP_COMPLETION_CONFIRMATION' &&
            notification.targetId
        ) {
            navigate(`/app/room/${notification.targetId}`)
        }
    }

    return {
        currentUser,
        notifications,
        unreadCount,
        isLoading,
        error,
        loadNotifications,
        readAllNotifications,
        openNotification,
    }
}
