import type { PlaceCategory, PlaceCategoryType } from './types'
import type { PlaceMarkerIcon } from './place-marker-icon'

export type PlacePresentation = {
    category: PlaceCategory
    label: string
    color: string
    icon: PlaceMarkerIcon
}

export const CATEGORY_META: Record<PlaceCategory, PlacePresentation> = {
    cafe: { category: 'cafe', label: '카페', color: '#b45309', icon: 'COFFEE' },
    food: {
        category: 'food',
        label: '음식점',
        color: '#dc2626',
        icon: 'UTENSILS',
    },
    bar: {
        category: 'bar',
        label: '술집',
        color: '#be123c',
        icon: 'BEER',
    },
    attraction: {
        category: 'attraction',
        label: '명소',
        color: '#7c3aed',
        icon: 'LANDMARK',
    },
    nature: {
        category: 'nature',
        label: '자연',
        color: '#0f766e',
        icon: 'TREES',
    },
    lodging: {
        category: 'lodging',
        label: '숙소',
        color: '#0891b2',
        icon: 'HOTEL',
    },
    shopping: {
        category: 'shopping',
        label: '쇼핑',
        color: '#2563eb',
        icon: 'SHOPPING_BAG',
    },
    activity: {
        category: 'activity',
        label: '액티비티',
        color: '#ea580c',
        icon: 'STAR',
    },
    transport: {
        category: 'transport',
        label: '교통',
        color: '#475569',
        icon: 'PLANE',
    },
    other: {
        category: 'other',
        label: '기타',
        color: '#64748b',
        icon: 'MAP_PIN',
    },
}

const API_CATEGORY_MAP: Record<PlaceCategoryType, PlaceCategory> = {
    FOOD: 'food',
    CAFE: 'cafe',
    BAR: 'bar',
    ATTRACTION: 'attraction',
    NATURE: 'nature',
    LODGING: 'lodging',
    SHOPPING: 'shopping',
    ACTIVITY: 'activity',
    TRANSPORT: 'transport',
    OTHER: 'other',
    CUSTOM: 'other',
}

export function resolvePlaceCategoryPresentation(
    categoryType: PlaceCategoryType | null | undefined,
): PlacePresentation {
    return CATEGORY_META[
        categoryType ? API_CATEGORY_MAP[categoryType] : 'other'
    ]
}
