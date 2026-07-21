import type { PlaceCategory } from './types'

export const CATEGORY_META: Record<
    PlaceCategory,
    { label: string; color: string; emoji: string }
> = {
    cafe: { label: '카페', color: '#b45309', emoji: '☕' },
    food: { label: '맛집', color: '#dc2626', emoji: '🍽️' },
    attraction: { label: '명소', color: '#7c3aed', emoji: '📍' },
    nature: { label: '자연', color: '#0f766e', emoji: '🌿' },
    shopping: { label: '쇼핑', color: '#2563eb', emoji: '🛍️' },
}

// TODO: 실제 Trip API 연동 시 라우트의 여행 ID로 교체한다.
export const TEMP_TRIP_ID = 1
