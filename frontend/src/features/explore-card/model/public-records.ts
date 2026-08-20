type PublicRecordLike = {
    tripPlaceId: string | number | null
    visitedAt: string
}

type PublicItineraryDayLike = {
    itineraryDate: string
    items: ReadonlyArray<{
        id: string | number
        tripPlaceId: string | number | null
    }>
}

export type PublicRecordTimelineEntry<TRecord, TItineraryItem> =
    | {
          kind: 'record'
          itineraryItem: TItineraryItem | null
          record: TRecord
      }
    | {
          kind: 'itinerary'
          itineraryItem: TItineraryItem
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
        const matchesDate = record.visitedAt.slice(0, 10) === day.itineraryDate
        const matchesPlace =
            record.tripPlaceId !== null &&
            tripPlaceIds.has(String(record.tripPlaceId))
        return matchesDate || matchesPlace
    })
}

export function mergePublicRecordsWithItinerary<
    TRecord extends PublicRecordLike,
    TItineraryItem extends PublicItineraryDayLike['items'][number],
>(
    records: readonly TRecord[],
    day: Omit<PublicItineraryDayLike, 'items'> & {
        items: readonly TItineraryItem[]
    },
): PublicRecordTimelineEntry<TRecord, TItineraryItem>[] {
    const dayRecords = filterPublicRecordsForDay(records, day)
    const usedRecords = new Set<TRecord>()

    const itineraryEntries = day.items.map((itineraryItem) => {
        const record = dayRecords.find(
            (candidate) =>
                !usedRecords.has(candidate) &&
                candidate.tripPlaceId !== null &&
                itineraryItem.tripPlaceId !== null &&
                String(candidate.tripPlaceId) ===
                    String(itineraryItem.tripPlaceId),
        )

        if (!record) {
            return {
                kind: 'itinerary' as const,
                itineraryItem,
            }
        }

        usedRecords.add(record)
        return {
            kind: 'record' as const,
            itineraryItem,
            record,
        }
    })

    const unlinkedRecordEntries = dayRecords
        .filter((record) => !usedRecords.has(record))
        .map((record) => ({
            kind: 'record' as const,
            itineraryItem: null,
            record,
        }))

    return [...itineraryEntries, ...unlinkedRecordEntries]
}
