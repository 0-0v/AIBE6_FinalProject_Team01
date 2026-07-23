import type { PlaceCategory } from './types'

export type PlacePresentation = {
    category: PlaceCategory
    label: string
    color: string
    emoji: string
}

export const CATEGORY_META: Record<PlaceCategory, PlacePresentation> = {
    cafe: { category: 'cafe', label: '카페', color: '#b45309', emoji: '☕️' },
    food: { category: 'food', label: '맛집', color: '#dc2626', emoji: '🍽️' },
    attraction: {
        category: 'attraction',
        label: '명소',
        color: '#7c3aed',
        emoji: '🏛️',
    },
    nature: {
        category: 'nature',
        label: '자연',
        color: '#0f766e',
        emoji: '🌿',
    },
    shopping: {
        category: 'shopping',
        label: '쇼핑',
        color: '#2563eb',
        emoji: '🛍️',
    },
    other: {
        category: 'other',
        label: '장소',
        color: '#64748b',
        emoji: '📍',
    },
}

type PresentationRule = {
    keywords: readonly string[]
    category: PlaceCategory
    emoji: string
}

const NAME_RULES: readonly PresentationRule[] = [
    {
        keywords: ['라멘', '라면', '국수', '냉면', '밀면', '우동', '소바'],
        category: 'food',
        emoji: '🍜',
    },
    { keywords: ['피자', 'pizza'], category: 'food', emoji: '🍕' },
    {
        keywords: ['햄버거', '버거', 'burger'],
        category: 'food',
        emoji: '🍔',
    },
    {
        keywords: ['초밥', '스시', 'sushi'],
        category: 'food',
        emoji: '🍣',
    },
    {
        keywords: ['베이커리', '빵집', '제과점', 'bakery'],
        category: 'food',
        emoji: '🥐',
    },
    {
        keywords: ['카페', '커피', '로스터리', 'cafe', 'coffee'],
        category: 'cafe',
        emoji: '☕️',
    },
    {
        keywords: ['펍', '호프', '맥주', '와인바', 'pub'],
        category: 'food',
        emoji: '🍺',
    },
    {
        keywords: ['호텔', '리조트', '게스트하우스', 'hotel', 'resort'],
        category: 'attraction',
        emoji: '🏨',
    },
    {
        keywords: ['해수욕장', '해변', '비치', 'beach'],
        category: 'nature',
        emoji: '🏖️',
    },
    {
        keywords: ['산악', '등산로', 'mountain'],
        category: 'nature',
        emoji: '⛰️',
    },
    {
        keywords: ['공원', '수목원', '정원', 'park', 'garden'],
        category: 'nature',
        emoji: '🌿',
    },
    {
        keywords: ['박물관', '미술관', 'museum', 'gallery'],
        category: 'attraction',
        emoji: '🏛️',
    },
    {
        keywords: ['사찰', 'temple', 'shrine'],
        category: 'attraction',
        emoji: '⛩️',
    },
    {
        keywords: ['시장', '백화점', '아울렛', '쇼핑몰', 'market', 'mall'],
        category: 'shopping',
        emoji: '🛍️',
    },
    {
        keywords: ['공항', 'airport'],
        category: 'attraction',
        emoji: '✈️',
    },
]

const TYPE_RULES: readonly PresentationRule[] = [
    {
        keywords: ['ramen', 'noodle'],
        category: 'food',
        emoji: '🍜',
    },
    { keywords: ['pizza'], category: 'food', emoji: '🍕' },
    { keywords: ['hamburger'], category: 'food', emoji: '🍔' },
    { keywords: ['sushi'], category: 'food', emoji: '🍣' },
    { keywords: ['bakery'], category: 'food', emoji: '🥐' },
    {
        keywords: ['cafe', 'coffee'],
        category: 'cafe',
        emoji: '☕️',
    },
    { keywords: ['bar', 'pub'], category: 'food', emoji: '🍺' },
    {
        keywords: ['restaurant', 'food'],
        category: 'food',
        emoji: '🍽️',
    },
    {
        keywords: ['hotel', 'lodging'],
        category: 'attraction',
        emoji: '🏨',
    },
    { keywords: ['beach'], category: 'nature', emoji: '🏖️' },
    {
        keywords: ['park', 'garden', 'natural_feature'],
        category: 'nature',
        emoji: '🌿',
    },
    {
        keywords: ['shopping', 'store', 'market', 'mall'],
        category: 'shopping',
        emoji: '🛍️',
    },
    {
        keywords: ['museum', 'gallery', 'tourist_attraction'],
        category: 'attraction',
        emoji: '🏛️',
    },
    { keywords: ['airport'], category: 'attraction', emoji: '✈️' },
]

export function resolvePlacePresentation(
    name: string | null | undefined,
    placeType: string | null | undefined,
): PlacePresentation {
    const normalizedName = name?.trim().toLocaleLowerCase('ko-KR') ?? ''
    const normalizedType = placeType?.trim().toLowerCase() ?? ''
    const rule =
        findRule(NAME_RULES, normalizedName) ?? findTypeRule(normalizedType)

    if (!rule) return CATEGORY_META.other
    return { ...CATEGORY_META[rule.category], emoji: rule.emoji }
}

function findTypeRule(value: string): PresentationRule | undefined {
    if (!value) return undefined
    return TYPE_RULES.find((rule) =>
        rule.keywords.some((keyword) => hasTypeToken(value, keyword)),
    )
}

function hasTypeToken(value: string, keyword: string): boolean {
    return (
        value === keyword ||
        value.startsWith(`${keyword}_`) ||
        value.endsWith(`_${keyword}`) ||
        value.includes(`_${keyword}_`)
    )
}

function findRule(
    rules: readonly PresentationRule[],
    value: string,
): PresentationRule | undefined {
    if (!value) return undefined
    return rules.find((rule) =>
        rule.keywords.some((keyword) => value.includes(keyword)),
    )
}
