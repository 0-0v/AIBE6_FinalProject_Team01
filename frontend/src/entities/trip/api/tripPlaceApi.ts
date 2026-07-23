import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/client'
import type {
    Place,
    PlaceCategory,
    PlaceStatus,
    PlaceVoteSummary,
} from '../model/types'
import { resolvePlacePresentation } from '../model/place-presentation'

type TripPlaceResponse = {
    tripPlaceId: number
    googlePlaceId: string
    name: string
    address: string | null
    latitude: number
    longitude: number
    placeType: string | null
    imageUrl: string | null
    status: 'CANDIDATE' | 'SAVED' | 'HOLD'
    addedBy: number
}

type AddTripPlaceBody = {
    googlePlaceId: string
    name: string
    address: string | null
    latitude: number
    longitude: number
    placeType: string | null
    imageUrl: string | null
}

type AddTripPlaceInput = AddTripPlaceBody

export type PlaceVoteSummaryResponse = PlaceVoteSummary & {
    tripPlaceId: number
}

export type PlaceVoteNotificationResponse = {
    notificationId: number
    tripId: number
    tripPlaceId: number
    content: string
    read: boolean
    createdAt: string
}

const FALLBACK_IMAGES: Record<PlaceCategory, string> = {
    cafe: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
    nature: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
    food: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
    attraction: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    shopping: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
    other: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
}

export function fromApiToPlace(
    tp: TripPlaceResponse,
    roomId: string,
    voteSummary?: PlaceVoteSummary,
): Place {
    const presentation = resolvePlacePresentation(tp.name, tp.placeType)
    const category = presentation.category
    return {
        id: String(tp.tripPlaceId),
        roomId,
        name: tp.name,
        address: tp.address ?? '',
        category,
        markerEmoji: presentation.emoji,
        status: tp.status.toLowerCase() as PlaceStatus,
        image: tp.imageUrl ?? FALLBACK_IMAGES[category],
        lat: tp.latitude,
        lng: tp.longitude,
        addedBy: String(tp.addedBy),
        voteSummary,
        comments: [],
    }
}

export async function getTripPlaceVotes(
    tripId: number,
    signal?: AbortSignal,
): Promise<PlaceVoteSummaryResponse[]> {
    const res = await apiClient.get<ApiResponse<PlaceVoteSummaryResponse[]>>(
        `/api/trips/${tripId}/places/votes`,
        { signal },
    )
    return res.data
}

export async function startTripPlaceVote(
    tripId: number,
    tripPlaceId: number,
): Promise<PlaceVoteSummaryResponse> {
    const res = await apiClient.post<ApiResponse<PlaceVoteSummaryResponse>>(
        `/api/trips/${tripId}/places/${tripPlaceId}/votes`,
        {},
    )
    return res.data
}

export async function respondTripPlaceVote(
    tripId: number,
    tripPlaceId: number,
    choice: 'AGREE' | 'DISAGREE',
): Promise<PlaceVoteSummaryResponse> {
    const res = await apiClient.put<ApiResponse<PlaceVoteSummaryResponse>>(
        `/api/trips/${tripId}/places/${tripPlaceId}/votes/me`,
        { choice },
    )
    return res.data
}

export async function getPlaceVoteNotifications(
    signal?: AbortSignal,
): Promise<PlaceVoteNotificationResponse[]> {
    const res = await apiClient.get<
        ApiResponse<PlaceVoteNotificationResponse[]>
    >('/api/notifications/place-votes', { signal })
    return res.data
}

export async function markPlaceVoteNotificationRead(
    notificationId: number,
): Promise<void> {
    await apiClient.patch(
        `/api/notifications/place-votes/${notificationId}/read`,
        {},
    )
}

export async function addTripPlace(
    tripId: number,
    result: AddTripPlaceInput,
): Promise<TripPlaceResponse> {
    const body: AddTripPlaceBody = {
        googlePlaceId: result.googlePlaceId,
        name: result.name,
        address: result.address ?? null,
        latitude: result.latitude,
        longitude: result.longitude,
        placeType: result.placeType ?? null,
        imageUrl: result.imageUrl ?? null,
    }
    const res = await apiClient.post<ApiResponse<TripPlaceResponse>>(
        `/api/trips/${tripId}/places`,
        body,
    )
    return res.data
}

export async function getTripPlaces(
    tripId: number,
    signal?: AbortSignal,
): Promise<TripPlaceResponse[]> {
    const res = await apiClient.get<ApiResponse<TripPlaceResponse[]>>(
        `/api/trips/${tripId}/places`,
        { signal },
    )
    return res.data
}

export async function getTripPlaceAccess(
    tripId: number,
    signal?: AbortSignal,
): Promise<boolean> {
    const res = await apiClient.get<ApiResponse<boolean>>(
        `/api/trips/${tripId}/places/access`,
        { signal },
    )
    return res.data
}

export async function deleteTripPlace(
    tripId: number,
    tripPlaceId: number,
): Promise<void> {
    await apiClient.delete(`/api/trips/${tripId}/places/${tripPlaceId}`)
}
