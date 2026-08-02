import type { PlaceCategoryType } from '@/entities/trip'

export type PlaceSearchResult = {
    googlePlaceId: string
    name: string
    address: string
    latitude: number
    longitude: number
    placeType: string | null
    placeTypes: string[]
    recommendedCategoryType: PlaceCategoryType
    photoName: string | null
    rating: number | null
    userRatingCount: number | null
    openNow: boolean | null
    weekdayDescriptions: string[] | null
    phoneNumber: string | null
    websiteUri: string | null
    editorialSummary: string | null
    topReviewText: string | null
    topReviewRating: number | null
    topReviewAuthor: string | null
    topReviewTime: string | null
}

export type PlaceSearchCategory = {
    key: string
    label: string
    placeholder: string
    categoryKey:
        | 'lodging'
        | 'attraction'
        | 'food'
        | 'cafe'
        | 'shopping'
        | 'transport'
        | null
    suggestions: string[]
}

export type AiPlaceSearchRecommendation = {
    place: PlaceSearchResult
    reason: string
    routeDeviationMeters: number
    styleCompatibility: number
}
