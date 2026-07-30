type TransportSummary = {
    transportMinutes: number | null
    transportMeters: number | null
    transportMode: string | null
    transportDetail?: string | null
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
