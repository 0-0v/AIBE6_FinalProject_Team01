export type TripCoverPreset = {
    key: string
    url: string
}

// 백엔드 TripCoverImagePreset(PRESET_1~PRESET_11) 화이트리스트와 key를 반드시 맞춰야 한다.
// 이미지 실물은 frontend/public/assets/trip-covers/ 에 trip-cover-01.jpg ~ trip-cover-11.jpg 로 배치한다.
export const TRIP_COVER_PRESETS: TripCoverPreset[] = [
    { key: 'PRESET_1', url: '/assets/trip-covers/trip-cover-01.jpg' },
    { key: 'PRESET_2', url: '/assets/trip-covers/trip-cover-02.jpg' },
    { key: 'PRESET_3', url: '/assets/trip-covers/trip-cover-03.jpg' },
    { key: 'PRESET_4', url: '/assets/trip-covers/trip-cover-04.jpg' },
    { key: 'PRESET_5', url: '/assets/trip-covers/trip-cover-05.jpg' },
    { key: 'PRESET_6', url: '/assets/trip-covers/trip-cover-06.jpg' },
    { key: 'PRESET_7', url: '/assets/trip-covers/trip-cover-07.jpg' },
    { key: 'PRESET_8', url: '/assets/trip-covers/trip-cover-08.jpg' },
    { key: 'PRESET_9', url: '/assets/trip-covers/trip-cover-09.jpg' },
    { key: 'PRESET_10', url: '/assets/trip-covers/trip-cover-10.jpg' },
    { key: 'PRESET_11', url: '/assets/trip-covers/trip-cover-11.jpg' },
]

/** 기본 이미지 중 하나를 무작위로 고른다. exclude를 주면 같은 이미지가 다시 뽑히지 않는다. */
export function pickRandomTripCoverPreset(
    exclude?: string,
    presets: TripCoverPreset[] = TRIP_COVER_PRESETS,
): TripCoverPreset {
    const candidates = exclude
        ? presets.filter((preset) => preset.key !== exclude)
        : presets
    if (candidates.length === 0) return presets[0] ?? TRIP_COVER_PRESETS[0]
    return candidates[Math.floor(Math.random() * candidates.length)]
}

export function findTripCoverPreset(key: string): TripCoverPreset | undefined {
    return TRIP_COVER_PRESETS.find((preset) => preset.key === key)
}
