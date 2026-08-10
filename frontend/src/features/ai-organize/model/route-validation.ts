import type { Place, ItineraryDay } from '@/entities/trip'

export type ValidationLevel = 'error' | 'warning'

export type ValidationIssue = {
    level: ValidationLevel
    code: string
    message: string
    placeNames?: string[]
}

/** Haversine 거리 (km) */
function haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function validateForRoutePlan(
    places: Place[],
    days: ItineraryDay[],
): ValidationIssue[] {
    const saved = places.filter((p) => p.status === 'saved')
    const issues: ValidationIssue[] = []

    // ERROR: 장소 2개 미만
    if (saved.length < 2) {
        issues.push({
            level: 'error',
            code: 'TOO_FEW_PLACES',
            message:
                saved.length === 0
                    ? '저장된 장소가 없어요. 장소를 먼저 추가해주세요.'
                    : '동선을 추천받으려면 장소를 2개 이상 등록해주세요.',
        })
        return issues // error 이후 다른 검사 불필요
    }

    // WARNING: 장소 수 < 날짜 수
    if (days.length > 0 && saved.length < days.length) {
        issues.push({
            level: 'warning',
            code: 'FEWER_PLACES_THAN_DAYS',
            message: `여행 일수(${days.length}일)보다 장소가 적어요. 일부 날은 비어있을 수 있어요.`,
        })
    }

    // WARNING: 좌표 없는 장소
    const noCoord = saved.filter(
        (p) => !p.lat || !p.lng || (p.lat === 0 && p.lng === 0),
    )
    if (noCoord.length > 0) {
        issues.push({
            level: 'warning',
            code: 'MISSING_COORDINATES',
            message: '좌표 정보가 없는 장소는 동선 추천에서 제외됩니다.',
            placeNames: noCoord.map((p) => p.name),
        })
    }

    // WARNING: 이상치 장소 (중심점 80km+)
    const withCoord = saved.filter(
        (p) => p.lat && p.lng && !(p.lat === 0 && p.lng === 0),
    )
    if (withCoord.length >= 2) {
        const meanLat =
            withCoord.reduce((s, p) => s + p.lat, 0) / withCoord.length
        const meanLng =
            withCoord.reduce((s, p) => s + p.lng, 0) / withCoord.length
        const outliers = withCoord.filter(
            (p) => haversineKm(p.lat, p.lng, meanLat, meanLng) > 80,
        )
        if (outliers.length > 0) {
            issues.push({
                level: 'warning',
                code: 'OUTLIER_PLACES',
                message:
                    '여행지와 너무 멀리 떨어진 장소가 있어요. 동선이 부정확할 수 있습니다.',
                placeNames: outliers.map((p) => p.name),
            })
        }
    }

    return issues
}
