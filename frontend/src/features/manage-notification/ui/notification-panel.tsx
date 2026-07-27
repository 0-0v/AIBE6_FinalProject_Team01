import { useNavigate } from 'react-router-dom'
import { BellIcon } from 'lucide-react'
import type { Notification } from '@/entities/notification'
import { useCurrentUserStore } from '@/shared/model'
import {
    formatNotificationDate,
    notificationStyle,
} from '../lib/notification-presentation'
import { useNotificationStore } from '../model/notification-store'

type Props = {
    maxItems?: number
    onViewAll?: () => void
}

export function NotificationPanel({ maxItems = 4, onViewAll }: Props) {
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
    const displayedNotifications = notifications.slice(0, maxItems)
    const hiddenNotificationCount = Math.max(
        notifications.length - displayedNotifications.length,
        0,
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

    return (
        <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                        알림
                    </h2>
                    {unreadCount > 0 ? (
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-extrabold text-orange-500">
                            {unreadCount}
                        </span>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => void readAllNotifications()}
                    disabled={!currentUser || unreadCount === 0}
                    className="text-[11px] font-bold text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    모두 읽음
                </button>
            </div>

            {!currentUser ? (
                <EmptyMessage message="로그인하면 알림을 확인할 수 있어요." />
            ) : isLoading ? (
                <div className="space-y-2" aria-label="알림 불러오는 중">
                    {[0, 1, 2].map((item) => (
                        <div
                            key={item}
                            className="h-10 animate-pulse rounded-lg bg-slate-50"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl bg-rose-50 px-3 py-4 text-center">
                    <p className="text-[11px] text-rose-600">{error}</p>
                    <button
                        type="button"
                        onClick={() => void loadNotifications()}
                        className="mt-2 text-[11px] font-bold text-rose-700 underline"
                    >
                        다시 시도
                    </button>
                </div>
            ) : notifications.length === 0 ? (
                <EmptyMessage message="새로운 알림이 없습니다." />
            ) : (
                <div className="space-y-2">
                    {displayedNotifications.map((notification) => {
                        const style =
                            notificationStyle[notification.notificationType]
                        const Icon = style.icon
                        return (
                            <button
                                type="button"
                                key={notification.id}
                                onClick={() => void openNotification(notification)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50 ${notification.read ? 'opacity-50' : ''}`}
                            >
                                <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.tone}`}
                                >
                                    <Icon size={13} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <b className="truncate text-[11px] text-slate-700">
                                            {notification.title ??
                                                style.fallbackTitle}
                                        </b>
                                        <time className="shrink-0 text-[9px] text-slate-300">
                                            {formatNotificationDate(
                                                notification.createdAt,
                                            )}
                                        </time>
                                    </span>
                                    <span className="block truncate text-[10px] text-slate-400">
                                        {notification.content}
                                    </span>
                                </span>
                                {!notification.read ? (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                                ) : null}
                            </button>
                        )
                    })}
                    {hiddenNotificationCount > 0 && onViewAll ? (
                        <button
                            type="button"
                            onClick={onViewAll}
                            className="mt-3 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-brand-700 transition hover:bg-brand-50"
                        >
                            알림 {hiddenNotificationCount}개 더 보기
                        </button>
                    ) : null}
                </div>
            )}
        </section>
    )
}

function EmptyMessage({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-6 text-slate-300">
            <BellIcon size={20} />
            <p className="text-[11px]">{message}</p>
        </div>
    )
}
