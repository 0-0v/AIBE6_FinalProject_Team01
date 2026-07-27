import type { ItineraryItem } from '@/entities/trip'

function toMinutes(value: string): number {
    const [hour = 0, minute = 0] = value.split(':').map(Number)
    return hour * 60 + minute
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
            if (
                item.id === currentItemId ||
                !item.startTime ||
                !item.endTime
            ) {
                return false
            }
            const otherStart = toMinutes(item.startTime)
            const otherEnd = toMinutes(item.endTime)
            return start < otherEnd && end > otherStart
        }) ?? null
    )
}
