import { create } from 'zustand'
import type { ActivityLog } from '@/entities/activity-log'
import { fetchActivityLogs } from '../api/activity-log-api'

type ActivityLogState = {
    logs: ActivityLog[]
    tripId: number | null
    page: number
    hasNext: boolean
    isLoading: boolean
    error: string | null
    loadActivityLogs: (tripId: number) => Promise<void>
    loadMoreActivityLogs: () => Promise<void>
    resetActivityLogs: () => void
}

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : '활동 로그를 불러오는 중 오류가 발생했습니다.'
}

export const useActivityLogStore = create<ActivityLogState>((set, get) => ({
    logs: [],
    tripId: null,
    page: 0,
    hasNext: false,
    isLoading: false,
    error: null,

    loadActivityLogs: async (tripId) => {
        set({
            logs: [],
            tripId,
            page: 0,
            hasNext: false,
            isLoading: true,
            error: null,
        })
        try {
            const response = await fetchActivityLogs(tripId, 0)
            if (get().tripId !== tripId) {
                return
            }
            set({
                logs: response.content,
                page: response.page,
                hasNext: !response.last,
                isLoading: false,
            })
        } catch (error) {
            if (get().tripId === tripId) {
                set({ error: errorMessage(error), isLoading: false })
            }
        }
    },

    loadMoreActivityLogs: async () => {
        const { tripId, page, hasNext, isLoading } = get()
        if (tripId === null || !hasNext || isLoading) {
            return
        }
        set({ isLoading: true, error: null })
        try {
            const response = await fetchActivityLogs(tripId, page + 1)
            if (get().tripId !== tripId) {
                return
            }
            set((state) => ({
                logs: [...state.logs, ...response.content],
                page: response.page,
                hasNext: !response.last,
                isLoading: false,
            }))
        } catch (error) {
            if (get().tripId === tripId) {
                set({ error: errorMessage(error), isLoading: false })
            }
        }
    },

    resetActivityLogs: () =>
        set({
            logs: [],
            tripId: null,
            page: 0,
            hasNext: false,
            isLoading: false,
            error: null,
        }),
}))
