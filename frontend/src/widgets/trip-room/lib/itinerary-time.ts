import type { ItineraryItem } from '@/entities/trip'

function toMinutes(value: string): number {
    const [h, m] = value.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
    return h * 60 + m
}

export function formatTimeRange(
    startTime: string | null | undefined,
    endTime: string | null | undefined,
): string {
    if (startTime && endTime) return `${startTime} ~ ${endTime}`
    if (startTime) return `시작 ${startTime}`
    if (endTime) return `종료 ${endTime}`
    return '시간 미정'
}

export function getNextSortOrder(items: ItineraryItem[]): number {
    return (
        items.reduce(
            (highestOrder, item) => Math.max(highestOrder, item.sortOrder),
            -1,
        ) + 1
    )
}

export function findOverlappingItem(
    currentItemId: string,
    startTime: string,
    endTime: string,
    dayItems: ItineraryItem[],
): ItineraryItem | null {
    if (!startTime || !endTime) return null
    const start = toMinutes(startTime)
    const end = toMinutes(endTime)

    return (
        dayItems.find((item) => {
            if (item.id === currentItemId || !item.startTime || !item.endTime) {
                return false
            }
            const otherStart = toMinutes(item.startTime)
            const otherEnd = toMinutes(item.endTime)
            return start < otherEnd && end > otherStart
        }) ?? null
    )
}
