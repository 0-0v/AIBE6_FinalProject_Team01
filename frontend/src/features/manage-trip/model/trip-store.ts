import { create } from 'zustand'
import type { Room } from '@/entities/trip'
import { fetchInvitedTrip, fetchTrips, type TripResponse } from '../api/trip-api'

type TripState = {
    trips: TripResponse[]
    rooms: Room[]
    guestRoom: Room | null
    isLoading: boolean
    error: string | null
    loadTrips: () => Promise<void>
    loadInvitedTrip: (inviteCode: string) => Promise<void>
    resetTrips: () => void
}

export function toRoom(trip: TripResponse): Room {
    const date = trip.startDate && trip.endDate
        ? `${trip.startDate} ~ ${trip.endDate}`
        : '날짜 미정'
    const statusLabel = {
        PLANNING: '준비 중',
        CONFIRMED: '확정',
        IN_PROGRESS: '진행 중',
        COMPLETED: '완료',
        CANCELLED: '취소',
    }[trip.status]

    return {
        id: String(trip.id),
        backendId: trip.id,
        title: trip.title,
        date,
        location: trip.destination ?? '장소 미정',
        dday: '일정 미정',
        members: 1,
        progress: 0,
        cover: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
        status: statusLabel,
        color: '#e7657a',
    }
}

export const useTripStore = create<TripState>((set) => ({
    trips: [],
    rooms: [],
    guestRoom: null,
    isLoading: false,
    error: null,
    loadTrips: async () => {
        set({ isLoading: true, error: null })
        try {
            const trips = await fetchTrips()
            set({ trips, rooms: trips.map(toRoom), isLoading: false })
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error
                    ? error.message
                    : '여행방을 불러오지 못했습니다.',
            })
        }
    },
    loadInvitedTrip: async (inviteCode) => {
        set({ guestRoom: null, isLoading: true, error: null })
        try {
            const trip = await fetchInvitedTrip(inviteCode)
            set({ guestRoom: toRoom(trip), isLoading: false })
        } catch (error) {
            set({ isLoading: false, error: error instanceof Error ? error.message : '초대 여행방을 불러오지 못했습니다.' })
        }
    },
    resetTrips: () => set({ trips: [], rooms: [], guestRoom: null, error: null, isLoading: false }),
}))
