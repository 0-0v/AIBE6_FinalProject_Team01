import { apiClient, type ApiResponse } from '@/shared/api/client'
import type { ItineraryDay } from '@/entities/trip'

export type CardSort = 'LATEST' | 'POPULAR' | 'COMMENTS'
export type PublicCard = {
    id: number
    tripId: number
    authorId: number
    authorNickname: string
    title: string
    summary: string | null
    destination: string | null
    coverImageUrl: string | null
    tags: string[]
    bookmarkCount: number
    commentCount: number
    bookmarked: boolean
    ownCard: boolean
    createdAt: string
}
export type PublicCardPage = {
    content: PublicCard[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}
export type CardComment = {
    id: number
    memberId: number
    memberNickname: string
    content: string
    mine: boolean
    createdAt: string
}
export type CopyTarget = {
    tripId: number
    title: string
    destination: string | null
    startDate: string
    endDate: string
    coverImageUrl: string | null
    hasItinerary: boolean
}
export type PublicCardDetail = {
    cardId: number
    tripId: number
    title: string
    summary: string | null
    destination: string | null
    coverImageUrl: string | null
    startDate: string | null
    endDate: string | null
    itinerary: ItineraryDay[]
}
export async function fetchPublicCards(page: number, sort: CardSort, query: string) {
    const params = new URLSearchParams({ page: String(page), size: '9', sort })
    if (query.trim()) params.set('query', query.trim())
    return (await apiClient.get<ApiResponse<PublicCardPage>>(`/api/cards/public?${params}`)).data
}
export async function fetchBookmarkedCards() {
    return (await apiClient.get<ApiResponse<PublicCard[]>>('/api/cards/bookmarks')).data
}
export async function fetchPublicCardDetail(cardId: number) {
    return (
        await apiClient.get<ApiResponse<PublicCardDetail>>(
            `/api/cards/${cardId}/detail`,
        )
    ).data
}
export async function addBookmark(cardId: number) {
    await apiClient.post(`/api/cards/${cardId}/bookmarks`, {})
}
export async function removeBookmark(cardId: number) {
    await apiClient.delete(`/api/cards/${cardId}/bookmarks`)
}
export async function fetchCardComments(cardId: number) {
    return (await apiClient.get<ApiResponse<CardComment[]>>(`/api/cards/${cardId}/comments`)).data
}
export async function addCardComment(cardId: number, content: string) {
    return (await apiClient.post<ApiResponse<CardComment>>(`/api/cards/${cardId}/comments`, { content })).data
}
export async function deleteCardComment(cardId: number, commentId: number) {
    await apiClient.delete(`/api/cards/${cardId}/comments/${commentId}`)
}
export async function fetchCopyTargets() {
    return (
        await apiClient.get<ApiResponse<CopyTarget[]>>('/api/cards/copy-targets')
    ).data
}
export async function copyCardItinerary(
    cardId: number,
    targetTripId: number,
    mode: 'REPLACE' | 'APPEND',
) {
    await apiClient.post(`/api/cards/${cardId}/itinerary-copy`, {
        targetTripId,
        mode,
    })
}
