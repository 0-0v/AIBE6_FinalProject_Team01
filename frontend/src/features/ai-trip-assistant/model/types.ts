import type { PlaceSearchResult } from '@/features/search-place'

export type AiPlaceRecommendation = {
    place: PlaceSearchResult
    reason: string
    routeDeviationMeters: number
}

export type PendingAiTripAction =
    | {
          kind: 'place-recommendations'
          recommendations: AiPlaceRecommendation[]
      }
    | {
          kind: 'itinerary-replan'
          reason: string
      }
