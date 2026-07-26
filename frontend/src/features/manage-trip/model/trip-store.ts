import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room } from '@/entities/trip'
import {
    fetchInvitedTrip,
    fetchTrips,
    type TripResponse,
} from '../api/trip-api'

type TripState = {
    trips: TripResponse[]
    rooms: Room[]
    guestRoom: Room | null
    activeTripId: string | null
    isLoading: boolean
    error: string | null
    loadTrips: () => Promise<void>
    loadInvitedTrip: (inviteCode: string) => Promise<boolean>
    selectTrip: (tripId: string) => void
    resetTrips: () => void
}

export function toRoom(trip: TripResponse): Room {
    const date =
        trip.startDate && trip.endDate
            ? `${trip.startDate} ~ ${trip.endDate}`
            : '날짜 미정'
    const statusLabel = {
        PLANNING: '준비 중',
        CONFIRMED: '확정',
        IN_PROGRESS: '진행 중',
        COMPLETED: '완료',
        CANCELLED: '취소',
    }[trip.status]
    const dday = calculateDday(trip.startDate, trip.endDate)

    return {
        id: String(trip.id),
        apiTripId: trip.id,
        title: trip.title,
        date,
        startDate: trip.startDate,
        endDate: trip.endDate,
        location: trip.destination ?? '장소 미정',
        dday,
        members: trip.memberCount,
        progress: 0,
        cover:
            trip.coverImageUrl ?? '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
        status: statusLabel,
        color: '#e7657a',
    }
}

function calculateDday(startDate: string | null, endDate: string | null) {
    if (!startDate || !endDate) return '일정 미정'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    if (today > end) return '여행 종료'
    if (today >= start) return '여행 중'
    const days = Math.ceil((start.getTime() - today.getTime()) / 86_400_000)
    return `D-${days}`
}

export const useTripStore = create<TripState>()(
    persist(
        (set) => ({
            trips: [],
            rooms: [],
            guestRoom: null,
            activeTripId: null,
            isLoading: false,
            error: null,
            loadTrips: async () => {
                set({ isLoading: true, error: null })
                try {
                    const trips = await fetchTrips()
                    const rooms = trips.map(toRoom)
                    set((state) => ({
                        trips,
                        rooms,
                        activeTripId: rooms.some(
                            (room) => room.id === state.activeTripId,
                        )
                            ? state.activeTripId
                            : (rooms[0]?.id ?? null),
                        isLoading: false,
                    }))
                } catch (error) {
                    set({
                        isLoading: false,
                        error:
                            error instanceof Error
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
                    return true
                } catch (error) {
                    set({
                        isLoading: false,
                        error:
                            error instanceof Error
                                ? error.message
                                : '초대 여행방을 불러오지 못했습니다.',
                    })
                    return false
                }
            },
            selectTrip: (activeTripId) => set({ activeTripId }),
            resetTrips: () =>
                set({
                    trips: [],
                    rooms: [],
                    guestRoom: null,
                    activeTripId: null,
                    error: null,
                    isLoading: false,
                }),
        }),
        {
            name: 'plamingo-active-trip',
            partialize: (state) => ({ activeTripId: state.activeTripId }),
        },
    ),
)
