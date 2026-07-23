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
