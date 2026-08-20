type PublicRecordLike = {
    tripPlaceId: string | number | null
    visitedAt: string
}

type PublicItineraryDayLike = {
    itineraryDate: string
    items: ReadonlyArray<{
        tripPlaceId: string | number | null
    }>
}

export function filterPublicRecordsForDay<T extends PublicRecordLike>(
    records: readonly T[],
    day: PublicItineraryDayLike,
) {
    const tripPlaceIds = new Set(
        day.items
            .map((item) => item.tripPlaceId)
            .filter((id): id is string | number => id !== null)
            .map(String),
    )

    return records.filter((record) => {
        const matchesDate =
            record.visitedAt.slice(0, 10) === day.itineraryDate
        const matchesPlace =
            record.tripPlaceId !== null &&
            tripPlaceIds.has(String(record.tripPlaceId))
        return matchesDate || matchesPlace
    })
}
