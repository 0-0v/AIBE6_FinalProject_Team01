import { BellIcon, RotateCwIcon } from 'lucide-react'
import {
    formatNotificationDate,
    notificationStyle,
} from '../lib/notification-presentation'
import { useNotificationFeed } from '../model/use-notification-feed'

export function NotificationList() {
    const {
        currentUser,
        notifications,
        unreadCount,
        isLoading,
        error,
        loadNotifications,
        readAllNotifications,
        openNotification,
    } = useNotificationFeed()

    if (!currentUser) {
        return <ListMessage message="로그인하면 알림을 확인할 수 있어요." />
    }

    if (isLoading) {
        return (
            <div
                className="mt-7 space-y-2 rounded-[22px] bg-white p-5 shadow-sm"
                aria-label="알림 불러오는 중"
            >
                {[0, 1, 2, 3].map((item) => (
                    <div
                        key={item}
                        className="h-16 animate-pulse rounded-xl bg-slate-50"
                    />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="mt-7 rounded-[22px] bg-white p-10 text-center shadow-sm">
                <p className="text-sm text-rose-600">{error}</p>
                <button
                    type="button"
                    onClick={() => void loadNotifications()}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-rose-700"
                >
                    <RotateCwIcon size={14} /> 다시 시도
                </button>
            </div>
        )
    }

    if (notifications.length === 0) {
        return <ListMessage message="새로운 알림이 없습니다." />
    }

    return (
        <div className="mt-7 overflow-hidden rounded-[22px] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <span className="text-xs font-bold text-slate-500">
                    읽지 않은 알림 {unreadCount}개
                </span>
                <button
                    type="button"
                    onClick={() => void readAllNotifications()}
                    disabled={unreadCount === 0}
                    className="text-xs font-bold text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    모두 읽음
                </button>
            </div>
            {notifications.map((notification) => {
                const style = notificationStyle[notification.notificationType]
                const Icon = style.icon
                return (
                    <button
                        type="button"
                        key={notification.id}
                        onClick={() => void openNotification(notification)}
                        className={`flex w-full items-start gap-4 border-b border-slate-100 p-5 text-left transition last:border-0 hover:bg-slate-50 ${notification.read ? 'opacity-50' : ''}`}
                    >
                        <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.tone}`}
                        >
                            <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex justify-between gap-3">
                                <b className="text-sm text-slate-800">
                                    {notification.title ?? style.fallbackTitle}
                                </b>
                                <time className="shrink-0 text-[11px] text-slate-400">
                                    {formatNotificationDate(
                                        notification.createdAt,
                                    )}
                                </time>
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                {notification.content}
                            </span>
                        </span>
                        {!notification.read ? (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                        ) : null}
                    </button>
                )
            })}
        </div>
    )
}

function ListMessage({ message }: { message: string }) {
    return (
        <div className="mt-7 flex flex-col items-center gap-3 rounded-[22px] bg-white px-5 py-16 text-slate-300 shadow-sm">
            <BellIcon size={28} />
            <p className="text-sm">{message}</p>
        </div>
    )
}
