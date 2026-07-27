import { apiClient, type ApiResponse } from '@/shared/api/client'

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
export async function fetchPublicCards(page: number, sort: CardSort, query: string) {
    const params = new URLSearchParams({ page: String(page), size: '9', sort })
    if (query.trim()) params.set('query', query.trim())
    return (await apiClient.get<ApiResponse<PublicCardPage>>(`/api/cards/public?${params}`)).data
}
export async function fetchBookmarkedCards() {
    return (await apiClient.get<ApiResponse<PublicCard[]>>('/api/cards/bookmarks')).data
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
