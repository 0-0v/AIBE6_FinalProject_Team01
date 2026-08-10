import { apiClient, resolveGooglePlacePhotoUrl } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/client'
import type {
    Place,
    PlaceCategory,
    PlaceStatus,
    PlaceVoteSummary,
} from '../model/types'
import { resolvePlaceCategoryPresentation } from '../model/place-presentation'
import type { PlaceCategoryInfo } from './placeCategoryApi'

type TripPlaceResponse = {
    tripPlaceId: number
    googlePlaceId: string
    name: string
    address: string | null
    latitude: number
    longitude: number
    placeType: string | null
    photoName: string | null
    category: PlaceCategoryInfo
    status: 'SAVED' | 'HOLD' | 'REJECTED'
    addedBy: number
    commentCount: number
}

type AddTripPlaceBody = {
    googlePlaceId: string
    name: string
    address: string | null
    latitude: number
    longitude: number
    placeType: string | null
    photoName: string | null
    placeTypes: string[]
}

export type PlaceVoteSummaryResponse = PlaceVoteSummary & {
    tripPlaceId: number
}

export type PlacePhotoMetadata = {
    photoName: string
    googleMapsUri: string | null
    authorAttributions: Array<{
        displayName: string | null
        uri: string | null
    }>
}

const API_STATUS_MAP: Record<'SAVED' | 'HOLD' | 'REJECTED', PlaceStatus> = {
    SAVED: 'saved',
    HOLD: 'hold',
    REJECTED: 'rejected',
}

export function apiStatusToPlaceStatus(
    apiStatus: 'SAVED' | 'HOLD' | 'REJECTED',
): PlaceStatus {
    return API_STATUS_MAP[apiStatus] ?? 'hold'
}

const FALLBACK_IMAGES: Record<PlaceCategory, string> = {
    cafe: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
    nature: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
    lodging: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    food: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
    bar: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
    attraction: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    shopping: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
    convenience: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
    activity: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    transport: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    other: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
}

export function fromApiToPlace(
    tp: TripPlaceResponse,
    roomId: string,
    voteSummary?: PlaceVoteSummary,
): Place {
    const presentation = resolvePlaceCategoryPresentation(
        tp.category.categoryType,
    )
    const category = presentation.category
    return {
        id: String(tp.tripPlaceId),
        googlePlaceId: tp.googlePlaceId,
        roomId,
        name: tp.name,
        address: tp.address ?? '',
        category,
        categoryId: tp.category.categoryId,
        categoryName: tp.category.name,
        categoryColor: tp.category.markerColor,
        categoryIcon: tp.category.markerIcon,
        placeType: tp.placeType,
        status: apiStatusToPlaceStatus(tp.status),
        image:
            resolveGooglePlacePhotoUrl(tp.photoName) ??
            FALLBACK_IMAGES[category],
        lat: tp.latitude,
        lng: tp.longitude,
        addedBy: String(tp.addedBy),
        voteSummary,
        comments: [],
        commentCount: tp.commentCount ?? 0,
    }
}

export async function updateTripPlaceCategory(
    tripId: number,
    tripPlaceId: number,
    categoryId: number,
): Promise<TripPlaceResponse> {
    const response = await apiClient.put<ApiResponse<TripPlaceResponse>>(
        `/api/trips/${tripId}/places/${tripPlaceId}/category`,
        { categoryId },
    )
    return response.data
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

export async function addTripPlace(
    tripId: number,
    body: AddTripPlaceBody,
): Promise<TripPlaceResponse> {
    const res = await apiClient.post<ApiResponse<TripPlaceResponse>>(
        `/api/trips/${tripId}/places`,
        {
            googlePlaceId: body.googlePlaceId,
            name: body.name,
            address: body.address,
            latitude: body.latitude,
            longitude: body.longitude,
            placeType: body.placeType,
            photoName: body.photoName,
            placeTypes: body.placeTypes,
        },
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

export async function getPlacePhotoMetadata(
    googlePlaceId: string,
    signal?: AbortSignal,
): Promise<PlacePhotoMetadata> {
    const params = new URLSearchParams({ placeId: googlePlaceId })
    const response = await apiClient.get<ApiResponse<PlacePhotoMetadata>>(
        `/api/places/photo/metadata?${params.toString()}`,
        { signal },
    )
    return response.data
}

export async function deleteTripPlace(
    tripId: number,
    tripPlaceId: number,
): Promise<void> {
    await apiClient.delete(`/api/trips/${tripId}/places/${tripPlaceId}`)
}
