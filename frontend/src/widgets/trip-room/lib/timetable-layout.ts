type TimedItem = {
    startTime?: string | null
    endTime?: string | null
}

export type TimetableHourRange = {
    startHour: number
    endHour: number
}

export const DEFAULT_TIMETABLE_START_HOUR = 9
export const DEFAULT_TIMETABLE_END_HOUR = 21

function parseHour(time: string): { hour: number; minute: number } {
    const [hour = 0, minute = 0] = time.split(':').map(Number)
    return { hour, minute }
}

export function getTimetableHourRange(items: TimedItem[]): TimetableHourRange {
    let startHour = DEFAULT_TIMETABLE_START_HOUR
    let endHour = DEFAULT_TIMETABLE_END_HOUR

    for (const item of items) {
        if (!item.startTime) continue

        const start = parseHour(item.startTime)
        startHour = Math.min(startHour, start.hour)

        if (item.endTime) {
            const end = parseHour(item.endTime)
            endHour = Math.max(endHour, end.hour + (end.minute > 0 ? 1 : 0))
        } else {
            endHour = Math.max(endHour, start.hour + 1)
        }
    }

    return {
        startHour: Math.max(0, startHour),
        endHour: Math.min(24, Math.max(startHour + 1, endHour)),
    }
}
