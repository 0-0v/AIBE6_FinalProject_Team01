export type ActivityLogMetadata = Record<string, unknown>

export type ActivityLog = {
    id: number
    tripId: number
    memberId: number | null
    agentRunId: number | null
    actionType: string
    targetType: string | null
    targetId: number | null
    description: string
    metadata: ActivityLogMetadata | null
    createdAt: string
}
