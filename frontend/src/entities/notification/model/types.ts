export type NotificationType = 'VOTE' | 'AI' | 'ITINERARY' | 'SETTLEMENT'

export type Notification = {
    id: number
    tripId: number | null
    notificationType: NotificationType
    title: string | null
    content: string
    targetType: string | null
    targetId: number | null
    read: boolean
    readAt: string | null
    createdAt: string
}
