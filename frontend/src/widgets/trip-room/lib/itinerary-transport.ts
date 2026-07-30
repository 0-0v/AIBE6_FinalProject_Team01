import type { ItineraryItem } from '@/entities/trip'

type TransportSummary = {
    transportMinutes: number | null
    transportMeters: number | null
    transportMode: string | null
    transportDetail?: string | null
}

export type SelectableItineraryTransportMode =
    | 'WALKING'
    | 'DRIVING'
    | 'TAXI'
    | 'BUS'
    | 'RAIL'

export function resolveSelectableTransportMode(
    item: Pick<ItineraryItem, 'transportMode' | 'transportModePreference'>,
): SelectableItineraryTransportMode {
    const preference = item.transportModePreference
    if (preference === 'SUBWAY' || preference === 'RAIL') return 'RAIL'
    if (
        preference === 'WALKING' ||
        preference === 'DRIVING' ||
        preference === 'TAXI' ||
        preference === 'BUS'
    ) {
        return preference
    }
    if (item.transportMode === '자동차') return 'DRIVING'
    if (item.transportMode === '택시') return 'TAXI'
    if (item.transportMode === '버스') return 'BUS'
    if (
        item.transportMode === '지하철' ||
        item.transportMode === '기차' ||
        item.transportMode === '트램' ||
        item.transportMode === '철도'
    ) {
        return 'RAIL'
    }
    return 'WALKING'
}

export function isSelectedTransportMode(
    item: Pick<ItineraryItem, 'transportMode' | 'transportModePreference'>,
    mode: SelectableItineraryTransportMode,
): boolean {
    return resolveSelectableTransportMode(item) === mode
}

export function formatTransportSummary({
    transportMinutes,
    transportMeters,
    transportMode,
    transportDetail,
}: TransportSummary): string {
    if (
        transportMinutes == null &&
        transportMeters == null &&
        transportMode == null
    ) {
        return '이동 정보 미설정'
    }
    const distance =
        transportMeters == null
            ? null
            : transportMeters >= 1000
              ? `${(transportMeters / 1000).toFixed(1)}km`
              : `${transportMeters}m`
    return [
        transportMode,
        transportMinutes == null ? null : `예상 ${transportMinutes}분`,
        distance,
        transportDetail,
    ]
        .filter(Boolean)
        .join(' · ')
}
