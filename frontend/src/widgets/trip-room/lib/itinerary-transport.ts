import type { ItineraryItem } from '@/entities/trip'

type TransportSummary = {
    transportMinutes: number | null
    transportMeters: number | null
    transportMode: string | null
    transportDetail?: string | null
}

export type SelectableItineraryTransportMode =
    'AUTO' | 'WALKING' | 'DRIVING' | 'TAXI' | 'TRANSIT' | 'BUS' | 'RAIL'

export function resolveSelectableTransportMode(
    item: Pick<ItineraryItem, 'transportModePreference'>,
): SelectableItineraryTransportMode {
    const preference = item.transportModePreference
    if (preference == null || preference === 'AUTO') return 'AUTO'
    if (preference === 'SUBWAY' || preference === 'RAIL') return 'RAIL'
    if (
        preference === 'WALKING' ||
        preference === 'DRIVING' ||
        preference === 'TAXI' ||
        preference === 'TRANSIT' ||
        preference === 'BUS'
    ) {
        return preference
    }
    return 'AUTO'
}

export function isSelectedTransportMode(
    item: Pick<ItineraryItem, 'transportModePreference'>,
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
