import {
    CalendarDaysIcon,
    CircleDollarSignIcon,
    SparklesIcon,
    ThumbsUpIcon,
    MapIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NotificationType } from '@/entities/notification'

export const notificationStyle: Record<
    NotificationType,
    { icon: LucideIcon; tone: string; fallbackTitle: string }
> = {
    VOTE: {
        icon: ThumbsUpIcon,
        tone: 'bg-amber-50 text-amber-600',
        fallbackTitle: '투표 알림',
    },
    AI: {
        icon: SparklesIcon,
        tone: 'bg-brand-50 text-brand-700',
        fallbackTitle: 'AI 알림',
    },
    ITINERARY: {
        icon: CalendarDaysIcon,
        tone: 'bg-sky-50 text-sky-600',
        fallbackTitle: '일정 알림',
    },
    SETTLEMENT: {
        icon: CircleDollarSignIcon,
        tone: 'bg-violet-50 text-violet-600',
        fallbackTitle: '정산 알림',
    },
    TRIP: {
        icon: MapIcon,
        tone: 'bg-emerald-50 text-emerald-600',
        fallbackTitle: '여행방 알림',
    },
    PLACE: {
        icon: MapIcon,
        tone: 'bg-rose-50 text-rose-600',
        fallbackTitle: '장소 알림',
    },
}

export function formatNotificationDate(createdAt: string): string {
    const date = new Date(createdAt)
    if (Number.isNaN(date.getTime())) {
        return ''
    }
    return new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}
