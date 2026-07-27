import type { PlaceMarkerIcon } from './place-marker-icon'

export type Role = 'OWNER' | 'EDITOR' | 'VIEWER'

export type Member = {
    id: string
    name: string
    avatarColor: string
    role: Role
}

export type PlaceCategory =
    | 'cafe'
    | 'food'
    | 'bar'
    | 'attraction'
    | 'nature'
    | 'lodging'
    | 'shopping'
    | 'activity'
    | 'transport'
    | 'other'

export type PlaceCategoryType =
    | 'FOOD'
    | 'CAFE'
    | 'BAR'
    | 'ATTRACTION'
    | 'NATURE'
    | 'LODGING'
    | 'SHOPPING'
    | 'ACTIVITY'
    | 'TRANSPORT'
    | 'OTHER'
    | 'CUSTOM'

export type PlaceStatus = 'saved' | 'hold' | 'rejected'

export type PlaceVoteSummary = {
    voteRequestId: number
    status: 'OPEN' | 'CLOSED'
    agreeCount: number
    disagreeCount: number
    responseCount: number
    requiredResponseCount: number
    totalMemberCount: number
    myChoice: 'AGREE' | 'DISAGREE' | null
    placeStatus: 'SAVED' | 'HOLD' | 'REJECTED'
    expiresAt: string
}

export type Comment = {
    id: string
    memberId: string
    text: string
    createdAt: string
}

export type Place = {
    id: string
    roomId: string
    name: string
    address: string
    category: PlaceCategory
    categoryId: number | null
    categoryName: string
    categoryColor: string
    categoryIcon: PlaceMarkerIcon
    status: PlaceStatus
    image: string
    lat: number
    lng: number
    addedBy: string
    voteSummary?: PlaceVoteSummary
    comments: Comment[]
    commentCount: number
    duplicateOf?: string
}

export type Room = {
    id: string
    apiTripId?: number
    title: string
    date: string
    startDate: string | null
    endDate: string | null
    location: string
    dday: string
    members: number
    progress: number
    cover: string
    status: string
    lifecycleStatus:
        | 'PLANNING'
        | 'CONFIRMED'
        | 'IN_PROGRESS'
        | 'COMPLETED'
        | 'CANCELLED'
    color: string
}

export type Expense = {
    id: string
    title: string
    amount: number
    date: string
    paidBy: string
    participantCount: number
}
