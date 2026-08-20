import { useEffect, useState } from 'react'
import {
    getItinerary,
    getTripPlaces,
    getTripPlaceVotes,
    type ItineraryDay,
} from '@/entities/trip'
import {
    fetchExpenseData,
    type ExpenseResponse,
    type SettlementSummary,
} from '@/features/manage-expense'
import { fetchBookmarkedCards, type PublicCard } from '@/features/explore-card'
import { useNotificationStore } from '@/features/manage-notification'
import { type TripResponse, useTripStore } from '@/features/manage-trip'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useCurrentUserStore } from '@/shared/model'
import { createDashboardTasks, type DashboardTask } from './dashboard-helpers'

export type OpenPlaceVote = {
    voteRequestId: number
    placeName: string
    categoryName: string
    responseCount: number
    requiredResponseCount: number
    myChoice: 'AGREE' | 'DISAGREE' | 'OPTION_A' | 'OPTION_B' | null
}

export function useDashboardData({
    activeTrip,
    activeTripApiId,
}: {
    activeTrip: TripResponse | undefined
    activeTripApiId: number | undefined
}) {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const currentUserId = currentUser?.id ?? null
    const isInitialized = useCurrentUserStore((state) => state.isInitialized)
    const loadTrips = useTripStore((state) => state.loadTrips)
    const loadedForMemberId = useTripStore(
        (state) => state.loadedForMemberId,
    )
    const tripDataReady =
        currentUserId != null && loadedForMemberId === currentUserId
    const resetTrips = useTripStore((state) => state.resetTrips)
    const loadActivityLogs = useActivityLogStore(
        (state) => state.loadActivityLogs,
    )
    const resetActivityLogs = useActivityLogStore(
        (state) => state.resetActivityLogs,
    )
    const voteRevision = useNotificationStore((state) =>
        state.notifications
            .filter(
                (item) =>
                    item.notificationType === 'VOTE' &&
                    item.tripId === activeTrip?.id,
            )
            .map((item) => item.id)
            .join(','),
    )
    const [tasks, setTasks] = useState<DashboardTask[]>([])
    const [pendingVoteCount, setPendingVoteCount] = useState(0)
    const [openPlaceVotes, setOpenPlaceVotes] = useState<OpenPlaceVote[]>([])
    const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
    const [settlement, setSettlement] = useState<SettlementSummary | null>(null)
    const [dashboardError, setDashboardError] = useState<string | null>(null)
    const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([])
    const [bookmarkedCards, setBookmarkedCards] = useState<PublicCard[]>([])

    useEffect(() => {
        if (!isInitialized) return
        if (currentUserId != null) void loadTrips(currentUserId)
        else {
            resetTrips()
            resetActivityLogs()
        }
    }, [currentUserId, isInitialized, loadTrips, resetActivityLogs, resetTrips])

    useEffect(() => {
        if (tripDataReady && activeTripApiId)
            void loadActivityLogs(activeTripApiId)
        else resetActivityLogs()
    }, [activeTripApiId, loadActivityLogs, resetActivityLogs, tripDataReady])

    useEffect(() => {
        if (!tripDataReady || !activeTripApiId) {
            Promise.resolve().then(() => {
                setPendingVoteCount(0)
                setOpenPlaceVotes([])
                setExpenses([])
                setSettlement(null)
                setTasks([])
            })
            return
        }
        const controller = new AbortController()
        const isCompletedTrip = activeTrip?.status === 'COMPLETED'
        Promise.all([
            getTripPlaces(activeTripApiId, controller.signal),
            isCompletedTrip
                ? Promise.resolve([])
                : getTripPlaceVotes(activeTripApiId, controller.signal),
            fetchExpenseData(activeTripApiId, controller.signal),
        ])
            .then(([places, votes, expenseData]) => {
                if (controller.signal.aborted) return
                const openVotes = isCompletedTrip
                    ? []
                    : votes.filter((vote) => vote.status === 'OPEN')
                const pendingVotes = openVotes.filter(
                    (vote) => vote.myChoice === null,
                )
                setPendingVoteCount(pendingVotes.length)
                setOpenPlaceVotes(
                    openVotes.map((vote) => {
                        const place = places.find(
                            (candidate) =>
                                candidate.tripPlaceId === vote.tripPlaceId,
                        )
                        return {
                            voteRequestId: vote.voteRequestId,
                            placeName: place?.name ?? '장소 정보 없음',
                            categoryName: place?.category.name ?? '기타',
                            responseCount: vote.responseCount,
                            requiredResponseCount: vote.requiredResponseCount,
                            myChoice: vote.myChoice,
                        }
                    }),
                )
                setExpenses(expenseData.expenses)
                setSettlement(expenseData.settlement)
                setTasks(
                    createDashboardTasks({
                        trip: activeTrip,
                        placeCount: places.length,
                        pendingVoteCount: pendingVotes.length,
                        pendingSettlementCount:
                            expenseData.settlement.pendingExpenseCount,
                    }),
                )
                setDashboardError(null)
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    setDashboardError(
                        error instanceof Error
                            ? error.message
                            : '대시보드 데이터를 불러오지 못했습니다.',
                    )
                }
            })
        return () => controller.abort()
    }, [activeTrip, activeTripApiId, tripDataReady, voteRevision])

    useEffect(() => {
        if (!tripDataReady || !activeTripApiId) {
            Promise.resolve().then(() => setItineraryDays([]))
            return
        }
        const controller = new AbortController()
        void getItinerary(activeTripApiId, controller.signal)
            .then((days) => {
                if (!controller.signal.aborted) setItineraryDays(days)
            })
            .catch(() => {
                if (!controller.signal.aborted) setItineraryDays([])
            })
        return () => controller.abort()
    }, [activeTripApiId, tripDataReady])

    useEffect(() => {
        if (currentUserId == null) {
            Promise.resolve().then(() => setBookmarkedCards([]))
            return
        }
        void fetchBookmarkedCards()
            .then(setBookmarkedCards)
            .catch(() => setBookmarkedCards([]))
    }, [currentUserId])

    return {
        tasks,
        pendingVoteCount,
        openPlaceVotes,
        expenses,
        setExpenses,
        settlement,
        setSettlement,
        dashboardError,
        itineraryDays,
        setItineraryDays,
        bookmarkedCards,
    }
}
