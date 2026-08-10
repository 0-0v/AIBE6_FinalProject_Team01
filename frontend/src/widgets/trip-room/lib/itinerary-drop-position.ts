type OrderedItem = {
    id: string | number
}

const DROP_ZONE_PREFIX = 'itinerary-drop'

export function buildItineraryDropZoneId(
    dayId: string | number,
    insertionIndex: number,
): string {
    return `${DROP_ZONE_PREFIX}:${dayId}:${insertionIndex}`
}

export function parseItineraryDropZoneId(
    id: string,
): { dayId: string; insertionIndex: number } | null {
    const [prefix, dayId, indexValue] = id.split(':')
    const insertionIndex = Number(indexValue)
    if (
        prefix !== DROP_ZONE_PREFIX ||
        !dayId ||
        !Number.isInteger(insertionIndex) ||
        insertionIndex < 0
    ) {
        return null
    }
    return { dayId, insertionIndex }
}

export function getCrossDayInsertionIndex(
    items: OrderedItem[],
    overId: string,
    placeAfterOverItem: boolean,
): number {
    const overIndex = items.findIndex((item) => String(item.id) === overId)
    if (overIndex < 0) return items.length
    return overIndex + (placeAfterOverItem ? 1 : 0)
}

export function getSameDayInsertionIndex(
    items: OrderedItem[],
    activeId: string,
    overId: string,
    placeAfterOverItem: boolean,
): number {
    const activeIndex = items.findIndex((item) => String(item.id) === activeId)
    const overIndex = items.findIndex((item) => String(item.id) === overId)
    if (activeIndex < 0 || overIndex < 0) return activeIndex

    const insertionBoundary = overIndex + (placeAfterOverItem ? 1 : 0)
    const indexAfterRemoval =
        activeIndex < insertionBoundary
            ? insertionBoundary - 1
            : insertionBoundary

    return Math.max(0, Math.min(indexAfterRemoval, items.length - 1))
}

export function getSameDayInsertionIndexAtBoundary(
    items: OrderedItem[],
    activeId: string,
    insertionBoundary: number,
): number {
    const activeIndex = items.findIndex((item) => String(item.id) === activeId)
    if (activeIndex < 0) return activeIndex
    const indexAfterRemoval =
        activeIndex < insertionBoundary
            ? insertionBoundary - 1
            : insertionBoundary
    return Math.max(0, Math.min(indexAfterRemoval, items.length - 1))
}
