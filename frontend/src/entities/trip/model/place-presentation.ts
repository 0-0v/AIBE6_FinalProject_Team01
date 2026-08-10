import type { PlaceCategory, PlaceCategoryType } from './types'
import type { PlaceMarkerIcon } from './place-marker-icon'
import { DESIGN_COLORS } from '@/shared/config'

export type PlacePresentation = {
    category: PlaceCategory
    label: string
    color: string
    icon: PlaceMarkerIcon
}

export const CATEGORY_META: Record<PlaceCategory, PlacePresentation> = {
    cafe: {
        category: 'cafe',
        label: '카페',
        color: DESIGN_COLORS.category.cafe,
        icon: 'COFFEE',
    },
    food: {
        category: 'food',
        label: '음식점',
        color: DESIGN_COLORS.category.food,
        icon: 'UTENSILS',
    },
    bar: {
        category: 'bar',
        label: '술집',
        color: DESIGN_COLORS.category.bar,
        icon: 'BEER',
    },
    attraction: {
        category: 'attraction',
        label: '명소',
        color: DESIGN_COLORS.category.attraction,
        icon: 'LANDMARK',
    },
    nature: {
        category: 'nature',
        label: '자연',
        color: DESIGN_COLORS.category.nature,
        icon: 'TREES',
    },
    lodging: {
        category: 'lodging',
        label: '숙소',
        color: DESIGN_COLORS.category.lodging,
        icon: 'HOTEL',
    },
    shopping: {
        category: 'shopping',
        label: '쇼핑',
        color: DESIGN_COLORS.category.shopping,
        icon: 'SHOPPING_BAG',
    },
    convenience: {
        category: 'convenience',
        label: '편의점',
        color: DESIGN_COLORS.category.convenience,
        icon: 'STORE',
    },
    activity: {
        category: 'activity',
        label: '액티비티',
        color: DESIGN_COLORS.category.activity,
        icon: 'STAR',
    },
    transport: {
        category: 'transport',
        label: '교통',
        color: DESIGN_COLORS.category.transport,
        icon: 'PLANE',
    },
    other: {
        category: 'other',
        label: '기타',
        color: DESIGN_COLORS.category.other,
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
    CONVENIENCE: 'convenience',
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
