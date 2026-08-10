export type DashboardTask = {
    id: string
    label: string
    meta: string
    urgent: boolean
}

type DashboardTrip = {
    startDate: string | null
    endDate: string | null
}

export type TicketDestination = {
    location: string
    destinationEnglishName: string | null
    destinationCountryCode: string | null
}

export function parseLocalDate(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

export function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function createCalendarDays(month: Date) {
    const firstDay = startOfMonth(month)
    const calendarStart = new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        1 - firstDay.getDay(),
    )
    return Array.from(
        { length: 42 },
        (_, index) =>
            new Date(
                calendarStart.getFullYear(),
                calendarStart.getMonth(),
                calendarStart.getDate() + index,
            ),
    )
}

export function toDateKey(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-')
}

export function isTripDate(
    date: Date,
    startDate: string | null | undefined,
    endDate: string | null | undefined,
) {
    if (!startDate || !endDate) return false
    const dateKey = toDateKey(date)
    return dateKey >= startDate && dateKey <= endDate
}

export function getTripCountdownLabel(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    status: string | null | undefined,
    todayDateKey: string,
) {
    if (!startDate || !endDate) return 'UNDEFINED'
    if (status === 'COMPLETED' || todayDateKey > endDate) return 'COMPLETED'
    if (todayDateKey >= startDate) return 'ONGOING'

    const remainingDays = Math.ceil(
        (parseLocalDate(startDate).getTime() -
            parseLocalDate(todayDateKey).getTime()) /
            86_400_000,
    )
    return remainingDays === 0 ? 'D-DAY' : `D-${remainingDays}`
}

export function getDefaultDashboardDate(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    todayDateKey: string,
) {
    if (!startDate) return null
    if (endDate && todayDateKey >= startDate && todayDateKey <= endDate) {
        return todayDateKey
    }
    return startDate
}

export function getTripStatusLabel(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    status: string | null | undefined,
    todayDateKey: string,
    fallback: string,
) {
    if (status === 'COMPLETED' || (endDate && todayDateKey > endDate)) {
        return '완료'
    }
    if (
        startDate &&
        endDate &&
        todayDateKey >= startDate &&
        todayDateKey <= endDate
    ) {
        return '여행 중'
    }
    return fallback
}

export function createDashboardTasks({
    trip,
    placeCount,
    pendingVoteCount,
    pendingSettlementCount,
}: {
    trip: DashboardTrip | undefined
    placeCount: number
    pendingVoteCount: number
    pendingSettlementCount: number
}): DashboardTask[] {
    if (!trip) return []
    const tasks: DashboardTask[] = []
    if (!trip.startDate || !trip.endDate) {
        tasks.push({
            id: 'schedule',
            label: '여행 기간 정하기',
            meta: '여행방 설정에서 시작일과 종료일을 입력해 주세요.',
            urgent: true,
        })
    }
    if (placeCount === 0) {
        tasks.push({
            id: 'places',
            label: '후보 장소 등록하기',
            meta: '여행방 지도에서 가고 싶은 장소를 추가해 주세요.',
            urgent: false,
        })
    }
    if (pendingVoteCount > 0) {
        tasks.push({
            id: 'votes',
            label: `대기 중인 장소 투표 ${pendingVoteCount}건 확인하기`,
            meta: '여행방에서 멤버들의 장소 투표를 확인해 주세요.',
            urgent: true,
        })
    }
    if (pendingSettlementCount > 0) {
        tasks.push({
            id: 'settlement',
            label: `미정산 지출 ${pendingSettlementCount}건 확인하기`,
            meta: '지출·정산 화면에서 정산 대기 중인 지출을 확인해 주세요.',
            urgent: true,
        })
    }
    return tasks
}

export function formatTripDateRange(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
) {
    if (!startDate || !endDate) return '여행 날짜 미정'
    return `${startDate.replaceAll('-', '. ')} - ${endDate.replaceAll('-', '. ')}`
}

export function getDestinationCode(destination: string | null | undefined) {
    if (!destination || destination === '장소 미정') return '...'

    const normalized = destination.replaceAll(' ', '').toLowerCase()
    const destinationCodes: Record<string, string> = {
        제주도: 'CJU',
        제주: 'CJU',
        화성시: 'HWASEONG',
        화성: 'HWASEONG',
        수원시: 'SUWON',
        수원: 'SUWON',
        대전광역시: 'DAEJEON',
        대전: 'DAEJEON',
        부산: 'PUS',
        서울: 'SEL',
        도쿄: 'TYO',
        동경: 'TYO',
        오사카: 'OSA',
        후쿠오카: 'FUK',
        다낭: 'DAD',
        방콕: 'BKK',
        파리: 'PAR',
        런던: 'LON',
        로마: 'ROM',
        뉴욕: 'NYC',
    }
    const matchedDestination = Object.entries(destinationCodes).find(([name]) =>
        normalized.includes(name),
    )
    return matchedDestination?.[1] ?? destination.trim().toUpperCase()
}

export function getOriginCode(destination: TicketDestination) {
    if (destination.destinationCountryCode) {
        return destination.destinationCountryCode === 'KR' ? 'HOME' : 'KOR'
    }
    return [
        '괌',
        '도쿄',
        '오사카',
        '후쿠오카',
        '다낭',
        '방콕',
        '파리',
        '런던',
        '로마',
        '뉴욕',
    ].some((name) => destination.location.includes(name))
        ? 'KOR'
        : 'HOME'
}

export function getTicketDestinationCode(destination: TicketDestination) {
    const countryCode = destination.destinationCountryCode
    if (countryCode && countryCode !== 'KR') return countryCode

    if (countryCode === 'KR' && destination.destinationEnglishName) {
        const domesticAirportCodes: Record<string, string> = {
            jeju: 'CJU',
            busan: 'PUS',
            seoul: 'SEL',
        }
        const englishName = destination.destinationEnglishName
            .trim()
            .replace(/[-\s]+si$/i, '')
        if (/[가-힣]/.test(englishName)) {
            return getDestinationCode(destination.location)
        }
        return (
            domesticAirportCodes[englishName.toLowerCase()] ??
            englishName.replaceAll(' ', '').toUpperCase()
        )
    }
    return getDestinationCode(destination.location)
}

export function isDestinationSet(destination: string | null | undefined) {
    if (!destination?.trim()) return false
    return !['장소 미정', '미정'].includes(destination.trim())
}

export function currency(value: number) {
    return `${Number(value).toLocaleString('ko-KR')}원`
}
