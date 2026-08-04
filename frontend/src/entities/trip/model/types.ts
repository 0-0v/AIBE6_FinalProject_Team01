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
    | 'convenience'
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
    | 'CONVENIENCE'
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
    googlePlaceId?: string
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
    photoAttribution?: string | null
    photoAttributionUrl?: string | null
    photoSourceUrl?: string | null
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
    destinationLat: number | null
    destinationLng: number | null
    destinationEnglishName: string | null
    destinationCountryCode: string | null
    dday: string
    members: number
    cover: string
    status: string
    lifecycleStatus:
        'PLANNING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    visibility: 'PRIVATE' | 'PUBLIC_ROUTE' | 'PUBLIC_RECORD'
    color: string
    companionLabel?: string
    travelStyleLabels?: string[]
}

export type Expense = {
    id: string
    title: string
    amount: number
    date: string
    paidBy: string
    participantCount: number
}

export type ItineraryDayStatus = 'DRAFT' | 'CONFIRMED'

export type ItineraryTransportMode =
    | 'AUTO'
    | 'WALKING'
    | 'DRIVING'
    | 'TAXI'
    | 'TRANSIT'
    | 'SUBWAY'
    | 'BUS'
    | 'RAIL'

export type ItineraryItem = {
    id: string
    tripPlaceId: string | null
    placeName: string | null
    placeAddress: string | null
    categoryName: string | null
    categoryColor: string | null
    categoryIcon: string | null
    lat: number
    lng: number
    startTime: string | null
    endTime: string | null
    sortOrder: number
    transportMinutes: number | null
    transportMeters: number | null
    transportMode: string | null
    transportDetail: string | null
    transportModePreference: ItineraryTransportMode | null
    memo: string | null
}

export type ItineraryDayDeparture = {
    type: 'TRIP_PLACE' | 'CUSTOM'
    name: string
    lat: number
    lng: number
    tripPlaceId: number | null
    travelMinutes: number | null
    travelMeters: number | null
    travelMode: string | null
}

export type ItineraryDay = {
    id: string
    itineraryDate: string
    dayNumber: number
    title: string | null
    status: ItineraryDayStatus
    items: ItineraryItem[]
    departure: ItineraryDayDeparture | null
}

export type RoutePlanItem = {
    tripPlaceId: number
    placeName: string
    categoryName: string
    categoryColor: string
    startTime: string | null
    endTime: string | null
    transportMinutes: number | null
    transportMeters: number | null
    transportMode: string | null
    transportDetail: string | null
    reason: string
}

export type RoutePlanDay = {
    dayId: number
    dayNumber: number
    itineraryDate: string
    totalDistanceMeters: number
    items: RoutePlanItem[]
}

export type RoutePlanPreview = {
    summary: string
    totalPlaceCount: number
    totalDistanceMeters: number
    days: RoutePlanDay[]
}

export type RouteOption = {
    routeLabel: string
    plan: RoutePlanPreview
}
