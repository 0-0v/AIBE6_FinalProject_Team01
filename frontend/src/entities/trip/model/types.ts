export type Role = 'OWNER' | 'EDITOR' | 'VIEWER'

export type Member = {
    id: string
    name: string
    avatarColor: string
    role: Role
}

export type PlaceCategory =
    'cafe' | 'food' | 'attraction' | 'nature' | 'shopping'

export type PlaceStatus = 'candidate' | 'saved' | 'hold'

export type Vote = {
    memberId: string
    value: 'up' | 'down'
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
    status: PlaceStatus
    image: string
    lat: number
    lng: number
    addedBy: string
    note?: string
    priority?: number
    votes: Vote[]
    comments: Comment[]
    duplicateOf?: string
}

export type TravelRecord = {
    id: string
    memberId: string
    day: 1 | 2 | 3
    time: string
    createdAt: string
    memo?: string
    placeId?: string
    images: string[]
}

export type Room = {
    id: string
    backendId?: number
    title: string
    date: string
    location: string
    dday: string
    members: number
    progress: number
    cover: string
    status: string
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
