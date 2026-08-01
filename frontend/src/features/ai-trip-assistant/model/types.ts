import type { AiPlaceSearchRecommendation } from '@/features/search-place'

export type AiPlaceRecommendation = AiPlaceSearchRecommendation

export type PendingAiTripAction = {
    kind: 'place-recommendations'
    recommendations: AiPlaceRecommendation[]
}
