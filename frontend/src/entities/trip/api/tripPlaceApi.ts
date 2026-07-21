import { apiClient } from '@/shared/api/client'
import type { Place, PlaceCategory, PlaceStatus } from '../model/types'
import type { PlaceSearchResult } from '@/features/search-place'

// TODO: A 도메인(trips) 완성 후 실제 tripId로 교체
export const TEMP_TRIP_ID = 1

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

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
    userNote: string | null
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
    userNote?: string | null
}

const FALLBACK_IMAGES: Record<PlaceCategory, string> = {
    cafe: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
    nature: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
    food: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
    attraction: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    shopping: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
}

export function mapPlaceTypeToCategory(placeType: string | null): PlaceCategory {
    if (!placeType) return 'attraction'
    if (placeType.includes('restaurant') || placeType.includes('food')) return 'food'
    if (placeType.includes('cafe') || placeType.includes('coffee')) return 'cafe'
    if (placeType.includes('shopping') || placeType.includes('store')) return 'shopping'
    if (placeType.includes('park') || placeType.includes('garden')) return 'nature'
    return 'attraction'
}

export function fromApiToPlace(tp: TripPlaceResponse, roomId: string): Place {
    const category = mapPlaceTypeToCategory(tp.placeType)
    return {
        id: String(tp.tripPlaceId),
        roomId,
        name: tp.name,
        address: tp.address ?? '',
        category,
        status: tp.status.toLowerCase() as PlaceStatus,
        image: tp.imageUrl ?? FALLBACK_IMAGES[category],
        lat: tp.latitude,
        lng: tp.longitude,
        addedBy: String(tp.addedBy),
        note: tp.userNote ?? undefined,
        votes: [],
        comments: [],
    }
}

export async function addTripPlace(
    tripId: number,
    result: PlaceSearchResult,
    userNote?: string,
): Promise<TripPlaceResponse> {
    const body: AddTripPlaceBody = {
        googlePlaceId: result.googlePlaceId,
        name: result.name,
        address: result.address ?? null,
        latitude: result.latitude,
        longitude: result.longitude,
        placeType: result.placeType ?? null,
        imageUrl: result.imageUrl ?? null,
        userNote: userNote ?? null,
    }
    const res = await apiClient.post<ApiResponse<TripPlaceResponse>>(
        `/api/trips/${tripId}/places`,
        body,
    )
    return res.data
}

export async function getTripPlaces(tripId: number): Promise<TripPlaceResponse[]> {
    const res = await apiClient.get<ApiResponse<TripPlaceResponse[]>>(
        `/api/trips/${tripId}/places`,
    )
    return res.data
}

export async function deleteTripPlace(tripId: number, tripPlaceId: number): Promise<void> {
    await apiClient.delete(`/api/trips/${tripId}/places/${tripPlaceId}`)
}

export async function updateTripPlaceStatus(
    tripId: number,
    tripPlaceId: number,
    status: 'CANDIDATE' | 'SAVED' | 'HOLD',
): Promise<TripPlaceResponse> {
    const res = await apiClient.patch<ApiResponse<TripPlaceResponse>>(
        `/api/trips/${tripId}/places/${tripPlaceId}/status`,
        { status },
    )
    return res.data
}

export async function updateTripPlaceNote(
    tripId: number,
    tripPlaceId: number,
    userNote: string | null,
): Promise<TripPlaceResponse> {
    const res = await apiClient.patch<ApiResponse<TripPlaceResponse>>(
        `/api/trips/${tripId}/places/${tripPlaceId}/note`,
        { userNote },
    )
    return res.data
}
