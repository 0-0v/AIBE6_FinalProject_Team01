import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarDaysIcon,
    BookmarkIcon,
    CheckCircle2Icon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CreditCardIcon,
    MapIcon,
    MapPinIcon,
    MessageCircleIcon,
    PlaneIcon,
    PlusIcon,
    ThumbsUpIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
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
import {
    CreateTripModal,
    useTripStore,
    type TripResponse,
} from '@/features/manage-trip'
import { AiDashboardActions } from '@/features/ai-trip-assistant'
import {
    NotificationPanel,
    useNotificationStore,
} from '@/features/manage-notification'
import { fetchBookmarkedCards, type PublicCard } from '@/features/explore-card'
import { useActivityLogStore } from '@/features/view-activity-log'
import { resolveMediaUrl } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { Avatar } from '@/shared/ui'
import { KanbanMapPanel } from '@/widgets/trip-room'
import { TravelRooms } from '@/widgets/travel-rooms'

type SurfaceId =
    | 'travel'
    | 'tasks'
    | 'activity'
    | 'calendar'
    | 'schedule'
    | 'expenses'
    | 'notifications'

type OpenPlaceVote = {
    voteRequestId: number
    placeName: string
    categoryName: string
    responseCount: number
    requiredResponseCount: number
    myChoice: 'AGREE' | 'DISAGREE' | null
}

const initialTasks: {
    id: string
    label: string
    meta: string
    urgent: boolean
}[] = []

const initialColors: Record<SurfaceId, string> = {
    travel: '#213C51',
    tasks: '#ffffff',
    activity: '#ffffff',
    calendar: '#ffffff',
    schedule: '#ffffff',
    expenses: '#ffffff',
    notifications: '#ffffff',
}

const DASHBOARD_SCHEDULE_ITEM_LIMIT = 6

function SectionTitle({
    title,
    action,
}: {
    title: string
    action?: React.ReactNode
}) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                {title}
            </h2>
            {action}
        </div>
    )
}

export function Home() {
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isUserInitialized = useCurrentUserStore(
        (state) => state.isInitialized,
    )
    const { trips, rooms, activeTripId, selectTrip, loadTrips, resetTrips } =
        useTripStore()
    const { logs, loadActivityLogs, resetActivityLogs } = useActivityLogStore()
    const [tasks, setTasks] = useState(initialTasks)
    const [view] = useState<'dashboard' | 'list'>('dashboard')
    const [todayDateKey, setTodayDateKey] = useState(() =>
        toDateKey(new Date()),
    )
    const [createTripOpen, setCreateTripOpen] = useState(false)
    const [pendingVoteCount, setPendingVoteCount] = useState(0)
    const [openPlaceVotes, setOpenPlaceVotes] = useState<OpenPlaceVote[]>([])
    const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
    const [settlement, setSettlement] = useState<SettlementSummary | null>(null)
    const [dashboardError, setDashboardError] = useState<string | null>(null)
    const [bookmarkedCards, setBookmarkedCards] = useState<PublicCard[]>([])
    const [bookmarkPage, setBookmarkPage] = useState(0)
    const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([])
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
    const [insightSlide, setInsightSlide] = useState(0)
    const [isTripSelectorOpen, setIsTripSelectorOpen] = useState(false)
    const tripSelectorRef = useRef<HTMLDivElement>(null)
    const activeTripData =
        trips.find((trip) => String(trip.id) === activeTripId) ?? trips[0]
    const voteNotificationRevision = useNotificationStore((state) =>
        state.notifications
            .filter(
                (notification) =>
                    notification.notificationType === 'VOTE' &&
                    notification.tripId === activeTripData?.id,
            )
            .map((notification) => notification.id)
            .join(','),
    )
    const [calendarCursor, setCalendarCursor] = useState<{
        tripId: number | null
        month: Date
    }>(() => ({ tripId: null, month: startOfMonth(new Date()) }))
    const defaultCalendarMonth = activeTripData?.startDate
        ? startOfMonth(parseLocalDate(activeTripData.startDate))
        : startOfMonth(new Date())
    const calendarMonth =
        calendarCursor.tripId === (activeTripData?.id ?? null)
            ? calendarCursor.month
            : defaultCalendarMonth
    const activeTrip = rooms.find((room) => room.id === activeTripId) ??
        rooms[0] ?? {
            id: '',
            title: '아직 여행방이 없습니다',
            date: '날짜 미정',
            location: '장소 미정',
            dday: '일정 미정',
            members: 0,
            cover: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
            status: '준비 전',
            color: '#e7657a',
        }
    const tripCountdownLabel = getTripCountdownLabel(
        activeTripData?.startDate,
        activeTripData?.endDate,
        activeTripData?.status,
        todayDateKey,
    )

    useEffect(() => {
        if (!isUserInitialized) return
        if (currentUser) void loadTrips()
        else {
            resetTrips()
            resetActivityLogs()
        }
    }, [
        currentUser,
        isUserInitialized,
        loadTrips,
        resetActivityLogs,
        resetTrips,
    ])

    useEffect(() => {
        if (currentUser && activeTrip.apiTripId) {
            void loadActivityLogs(activeTrip.apiTripId)
        } else {
            resetActivityLogs()
        }
    }, [activeTrip.apiTripId, currentUser, loadActivityLogs, resetActivityLogs])

    useEffect(() => {
        if (!currentUser || !activeTrip.apiTripId) {
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
        Promise.all([
            getTripPlaces(activeTrip.apiTripId, controller.signal),
            getTripPlaceVotes(activeTrip.apiTripId, controller.signal),
            fetchExpenseData(activeTrip.apiTripId),
        ])
            .then(([places, votes, expenseData]) => {
                if (controller.signal.aborted) return
                const openVotes = votes.filter((vote) => vote.status === 'OPEN')
                const pendingVotes = openVotes.filter(
                    (vote) => vote.myChoice === null,
                )
                const openPlaceVoteItems = openVotes.map((vote) => {
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
                })
                setPendingVoteCount(pendingVotes.length)
                setOpenPlaceVotes(openPlaceVoteItems)
                setExpenses(expenseData.expenses)
                setSettlement(expenseData.settlement)
                setTasks(
                    createDashboardTasks({
                        trip: activeTripData,
                        placeCount: places.length,
                        pendingVoteCount: pendingVotes.length,
                        transferCount: expenseData.settlement.transfers.length,
                    }),
                )
                setDashboardError(null)
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setDashboardError(
                    error instanceof Error
                        ? error.message
                        : '대시보드 데이터를 불러오지 못했습니다.',
                )
            })
        return () => controller.abort()
    }, [
        activeTrip.apiTripId,
        activeTripData,
        currentUser,
        voteNotificationRevision,
    ])

    useEffect(() => {
        Promise.resolve().then(() => {
            setSelectedDate(activeTripData?.startDate ?? null)
            setFocusedItemId(null)
        })
    }, [activeTripData?.id, activeTripData?.startDate])

    useEffect(() => {
        if (!currentUser || !activeTrip.apiTripId) {
            Promise.resolve().then(() => setItineraryDays([]))
            return
        }

        let cancelled = false
        void getItinerary(activeTrip.apiTripId)
            .then((days) => {
                if (!cancelled) setItineraryDays(days)
            })
            .catch(() => {
                if (!cancelled) setItineraryDays([])
            })

        return () => {
            cancelled = true
        }
    }, [activeTrip.apiTripId, currentUser])

    useEffect(() => {
        if (!currentUser) {
            Promise.resolve().then(() => setBookmarkedCards([]))
            return
        }
        void fetchBookmarkedCards()
            .then(setBookmarkedCards)
            .catch(() => setBookmarkedCards([]))
    }, [currentUser])

    const selectedItineraryDay =
        itineraryDays.find((day) => day.itineraryDate === selectedDate) ?? null
    const selectedDayFocusedItemId =
        selectedItineraryDay?.items.some(
            (item) => String(item.id) === focusedItemId,
        ) === true
            ? focusedItemId
            : selectedItineraryDay?.items[0] != null
              ? String(selectedItineraryDay.items[0].id)
              : null
    const insightSlideCount = logs.length > 0 ? 2 : 1
    const visibleInsightSlide = insightSlide % insightSlideCount
    const bookmarkPageSize = 4
    const bookmarkPageCount = Math.max(
        1,
        Math.ceil(bookmarkedCards.length / bookmarkPageSize),
    )
    const visibleBookmarkPage = Math.min(bookmarkPage, bookmarkPageCount - 1)
    const visibleBookmarkedCards = bookmarkedCards.slice(
        visibleBookmarkPage * bookmarkPageSize,
        (visibleBookmarkPage + 1) * bookmarkPageSize,
    )

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setTodayDateKey(toDateKey(new Date()))
        }, 60_000)
        return () => window.clearInterval(intervalId)
    }, [])

    useEffect(() => {
        if (!isTripSelectorOpen) return

        function closeTripSelector(event: MouseEvent) {
            if (
                event.target instanceof Node &&
                !tripSelectorRef.current?.contains(event.target)
            ) {
                setIsTripSelectorOpen(false)
            }
        }

        function closeTripSelectorOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsTripSelectorOpen(false)
        }

        document.addEventListener('mousedown', closeTripSelector)
        document.addEventListener('keydown', closeTripSelectorOnEscape)
        return () => {
            document.removeEventListener('mousedown', closeTripSelector)
            document.removeEventListener('keydown', closeTripSelectorOnEscape)
        }
    }, [isTripSelectorOpen])

    function editable(
        id: SurfaceId,
        label: string,
        children: React.ReactNode,
        className = '',
    ) {
        const color = initialColors[id]
        return (
            <div
                className={className}
                style={{ backgroundColor: color }}
                aria-label={label}
            >
                {children}
            </div>
        )
    }

    return (
        <div className="min-h-full bg-[#f9fafb] px-4 py-5 sm:px-7 sm:py-7 xl:px-8">
            <header className="mx-auto grid max-w-[1440px] items-center gap-4 px-1 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-slate-950 sm:text-[30px]">
                        안녕하세요, {currentUser?.nickname ?? '여행자'}님
                    </h1>
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
                        <span className="text-xs font-semibold text-slate-500">
                            오늘 여행지는
                        </span>
                        <div
                            ref={tripSelectorRef}
                            className="relative w-fit max-w-full"
                        >
                            <button
                                type="button"
                                aria-haspopup="listbox"
                                aria-expanded={isTripSelectorOpen}
                                aria-label="여행방 선택"
                                disabled={rooms.length === 0}
                                onClick={() =>
                                    setIsTripSelectorOpen((open) => !open)
                                }
                                className="group flex min-h-10 w-fit max-w-full items-center gap-2 rounded-lg px-2 text-left transition hover:bg-rose-50/70 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="min-w-0 break-keep font-['JejuStoneWall'] text-2xl font-normal tracking-[-0.02em] text-[#c94c63] [text-shadow:0_3px_10px_rgba(201,76,99,0.2)] sm:text-[28px]">
                                    {rooms.length > 0
                                        ? activeTrip.location
                                        : '아직 미정'}
                                </span>
                                <ChevronDownIcon
                                    size={17}
                                    className={`shrink-0 text-[#cc788a] transition-transform group-hover:text-[#c94c63] ${
                                        isTripSelectorOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                            {isTripSelectorOpen && rooms.length > 0 && (
                                <div
                                    role="listbox"
                                    aria-label="여행방 목록"
                                    className="mp-scroll absolute left-0 top-[calc(100%+8px)] z-50 max-h-64 min-w-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                                >
                                    {rooms.map((room) => {
                                        const isSelected =
                                            room.id === activeTrip.id
                                        return (
                                            <button
                                                key={room.id}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() => {
                                                    selectTrip(room.id)
                                                    setIsTripSelectorOpen(false)
                                                }}
                                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold transition ${
                                                    isSelected
                                                        ? 'bg-[#fff0f2] text-[#c94c63]'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                <span className="min-w-0 flex-1 truncate">
                                                    {room.title}
                                                </span>
                                                {isSelected && (
                                                    <CheckCircle2Icon
                                                        size={16}
                                                        className="shrink-0"
                                                    />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                            입니다
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-5 xl:justify-end">
                    <strong className="min-w-32 text-center text-3xl font-black tracking-[-0.06em] text-[#c94c63] [text-shadow:0_4px_14px_rgba(201,76,99,0.24)] sm:text-4xl">
                        {tripCountdownLabel}
                    </strong>
                    <button
                        onClick={() => setCreateTripOpen(true)}
                        className="flamingo-gradient flamingo-glow hidden items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 sm:flex"
                    >
                        <PlusIcon size={16} /> 새 여행방
                    </button>
                </div>
            </header>

            {dashboardError && (
                <p
                    role="alert"
                    className="mx-auto mt-4 max-w-[1440px] rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600"
                >
                    {dashboardError}
                </p>
            )}

            {view === 'list' ? (
                <div className="mx-auto mt-6 max-w-[1440px] space-y-5 px-1">
                    <section className="rounded-[24px] border border-slate-100 bg-white/60 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5">
                        <TravelRooms embedded compact />
                    </section>
                    <section className="rounded-[24px] border border-slate-100 bg-white/60 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5">
                        <SectionTitle
                            title="북마크한 여행 카드"
                            action={
                                bookmarkedCards.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/app/explore')}
                                        className="flex items-center gap-1 text-xs font-extrabold text-brand-700 hover:text-brand-800"
                                    >
                                        모두 보기
                                        <ChevronRightIcon size={14} />
                                    </button>
                                ) : undefined
                            }
                        />
                        {bookmarkedCards.length === 0 ? (
                            <div className="flex min-h-40 flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                                    <BookmarkIcon size={18} />
                                </span>
                                <p className="mt-3 text-sm font-extrabold text-slate-700">
                                    저장한 여행 카드가 없습니다
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/app/explore')}
                                    className="mt-2 text-xs font-bold text-brand-700 hover:underline"
                                >
                                    둘러보기에서 여행 찾기
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    {visibleBookmarkedCards.map((card) => (
                                        <article
                                            key={card.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                navigate(
                                                    `/app/explore/${card.id}`,
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === 'Enter' ||
                                                    event.key === ' '
                                                ) {
                                                    navigate(
                                                        `/app/explore/${card.id}`,
                                                    )
                                                }
                                            }}
                                            className="group min-w-0 cursor-pointer overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md"
                                        >
                                            <img
                                                src={
                                                    resolveMediaUrl(
                                                        card.coverImageUrl,
                                                    ) ??
                                                    '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg'
                                                }
                                                alt={`${card.title} 여행 카드`}
                                                className="aspect-[16/8] w-full object-cover transition duration-500 group-hover:scale-105"
                                            />
                                            <div className="flex min-w-0 flex-col p-3.5">
                                                <div className="flex min-w-0 items-start justify-between gap-2">
                                                    <h3 className="truncate text-sm font-extrabold text-slate-900">
                                                        {card.title}
                                                    </h3>
                                                    <BookmarkIcon
                                                        size={15}
                                                        fill="currentColor"
                                                        className="shrink-0 text-brand-700"
                                                    />
                                                </div>
                                                <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                                                    {card.destination ??
                                                        '여행지 미정'}{' '}
                                                    · {card.authorNickname}
                                                </p>
                                                {card.tags.length > 0 && (
                                                    <div className="mt-2 flex min-w-0 gap-1 overflow-hidden">
                                                        {card.tags
                                                            .slice(0, 2)
                                                            .map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="max-w-24 truncate rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700"
                                                                >
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                    </div>
                                                )}
                                                <div className="mt-auto flex items-center gap-3 pt-2 text-[10px] font-bold text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <BookmarkIcon
                                                            size={11}
                                                        />
                                                        {card.bookmarkCount}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageCircleIcon
                                                            size={11}
                                                        />
                                                        {card.commentCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                {bookmarkPageCount > 1 && (
                                    <nav
                                        aria-label="북마크 여행 카드 페이지"
                                        className="mt-4 flex items-center justify-center gap-3"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setBookmarkPage(
                                                    visibleBookmarkPage - 1,
                                                )
                                            }
                                            disabled={visibleBookmarkPage === 0}
                                            aria-label="이전 북마크 카드"
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <ChevronLeftIcon size={15} />
                                        </button>
                                        <span className="text-xs font-extrabold text-slate-500">
                                            {visibleBookmarkPage + 1} /{' '}
                                            {bookmarkPageCount}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setBookmarkPage(
                                                    visibleBookmarkPage + 1,
                                                )
                                            }
                                            disabled={
                                                visibleBookmarkPage + 1 >=
                                                bookmarkPageCount
                                            }
                                            aria-label="다음 북마크 카드"
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <ChevronRightIcon size={15} />
                                        </button>
                                    </nav>
                                )}
                            </>
                        )}
                    </section>
                </div>
            ) : (
                <>
                    <main className="mx-auto mt-6 grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="min-w-0 space-y-4">
                            <div className="grid items-start gap-4 lg:h-[360px] lg:grid-cols-[minmax(0,1fr)_290px] lg:items-stretch">
                                {editable(
                                    'travel',
                                    '여행 현황',
                                    <motion.section
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.32 }}
                                        className="relative h-auto overflow-hidden rounded-[22px] border border-[#29485E] bg-[linear-gradient(135deg,#213C51_0%,#29485E_60%,#315A75_100%)] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.12)] lg:h-full"
                                    >
                                        <div className="relative">
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <p className="font-['JejuStoneWall'] text-2xl font-normal uppercase tracking-[0.08em] text-[#eeeeee] sm:text-3xl">
                                                    Upcoming trip
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(
                                                            `/app/room/${activeTrip.id}`,
                                                        )
                                                    }
                                                    disabled={!activeTrip.id}
                                                    className="flex items-center gap-1 rounded-full border border-[#EEEEEE]/35 bg-[#EEEEEE]/10 px-3 py-2 text-xs font-extrabold text-[#EEEEEE] transition hover:bg-[#EEEEEE]/20 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    여행방 열기
                                                    <ChevronRightIcon
                                                        size={14}
                                                    />
                                                </button>
                                            </div>

                                            <div className="mt-7">
                                                <p className="font-['JejuStoneWall'] text-xs font-normal uppercase tracking-[0.2em] text-[#EEEEEE]/70">
                                                    Your destination
                                                </p>
                                                <h2 className="mt-2 flex flex-wrap items-center text-4xl font-black tracking-[-0.06em] text-[#EEEEEE] sm:text-5xl xl:text-[58px]">
                                                    <span>ICN</span>
                                                    <span
                                                        className="mx-4 inline-flex items-center gap-2"
                                                        aria-hidden="true"
                                                    >
                                                        <span className="w-7 border-t-2 border-dotted border-[#EEEEEE]/65 sm:w-10" />
                                                        <PlaneIcon
                                                            size={30}
                                                            className="rotate-45 text-[#E7657A]"
                                                            strokeWidth={2.4}
                                                        />
                                                        <span className="w-7 border-t-2 border-dotted border-[#EEEEEE]/65 sm:w-10" />
                                                    </span>
                                                    <span>
                                                        {getDestinationCode(
                                                            activeTrip.location,
                                                        )}
                                                    </span>
                                                </h2>
                                                <p className="mt-3 flex items-center gap-2 text-base font-extrabold text-[#EEEEEE]">
                                                    <MapPinIcon
                                                        size={18}
                                                        className="text-[#E7657A]"
                                                    />
                                                    {activeTrip.location}
                                                    <span className="text-[#EEEEEE]/45">
                                                        ·
                                                    </span>
                                                    <span className="truncate text-[#EEEEEE]/80">
                                                        {activeTrip.title}
                                                    </span>
                                                </p>
                                            </div>

                                            <div className="mt-8 grid gap-6 border-t border-[#EEEEEE]/25 pt-5 sm:grid-cols-[minmax(150px,0.65fr)_minmax(260px,1.35fr)] sm:items-end">
                                                <div>
                                                    <p className="font-['JejuStoneWall'] text-xs font-normal uppercase tracking-[0.16em] text-[#EEEEEE]">
                                                        People
                                                    </p>
                                                    <div className="mt-3 flex items-center">
                                                        <span className="rounded-full bg-[#EEEEEE] p-1 shadow-sm">
                                                            <Avatar
                                                                name={
                                                                    currentUser?.nickname ??
                                                                    '여행자'
                                                                }
                                                                color="#e7657a"
                                                                imageUrl={resolveMediaUrl(
                                                                    currentUser?.profileImageUrl,
                                                                )}
                                                                size={42}
                                                            />
                                                        </span>
                                                        <span className="ml-3 text-sm font-extrabold text-[#EEEEEE]">
                                                            {activeTrip.members}
                                                            명
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="sm:border-l sm:border-[#EEEEEE]/25 sm:pl-8">
                                                    <p className="font-['JejuStoneWall'] text-xs font-normal uppercase tracking-[0.16em] text-[#EEEEEE]">
                                                        Travel date
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEEEEE]/10 text-[#EEEEEE]">
                                                            <CalendarDaysIcon
                                                                size={20}
                                                            />
                                                        </span>
                                                        <strong className="text-2xl font-black text-[#EEEEEE]">
                                                            {getTripScheduleLabel(
                                                                activeTripData?.startDate,
                                                                activeTripData?.endDate,
                                                            )}
                                                        </strong>
                                                        <span className="text-sm font-bold text-[#EEEEEE]/80">
                                                            {formatTripDateRange(
                                                                activeTripData?.startDate,
                                                                activeTripData?.endDate,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.section>,
                                    'overflow-hidden rounded-[22px] lg:h-full',
                                )}

                                {editable(
                                    'tasks',
                                    '투표 대기',
                                    <section
                                        className={`flex h-[300px] min-h-0 flex-col overflow-hidden rounded-[22px] border p-5 shadow-[0_12px_30px_rgba(15,23,42,0.07)] transition-colors duration-500 lg:h-full ${
                                            visibleInsightSlide === 0
                                                ? 'border-rose-200 bg-[#fff7f8]'
                                                : 'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <div className="min-h-0 flex-1 overflow-hidden">
                                            <div
                                                className="flex h-full transition-transform duration-500 ease-out"
                                                style={{
                                                    transform: `translateX(-${visibleInsightSlide * 100}%)`,
                                                }}
                                            >
                                                <div
                                                    aria-hidden={
                                                        visibleInsightSlide !==
                                                        0
                                                    }
                                                    className={`flex w-full shrink-0 flex-col overflow-hidden transition-opacity duration-300 ${
                                                        visibleInsightSlide ===
                                                        0
                                                            ? 'opacity-100'
                                                            : 'pointer-events-none opacity-0'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="relative h-11 w-11 shrink-0">
                                                            <span className="absolute bottom-0 left-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ec6680] text-white">
                                                                <ThumbsUpIcon
                                                                    size={18}
                                                                />
                                                            </span>
                                                            {pendingVoteCount >
                                                                0 && (
                                                                <span className="absolute right-0 top-0 z-20 block h-3.5 w-3.5 rounded-full border-2 border-[#fff7f8] bg-orange-400 shadow-sm" />
                                                            )}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-base font-black text-[#a94359]">
                                                                투표 대기{' '}
                                                                {
                                                                    pendingVoteCount
                                                                }
                                                                건
                                                            </p>
                                                            <p className="mt-0.5 text-[11px] font-semibold text-[#cc788a]">
                                                                내 투표를
                                                                기다리고 있어요
                                                            </p>
                                                        </div>
                                                        {pendingVoteCount >
                                                            0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/app/room/${activeTrip.id}`,
                                                                    )
                                                                }
                                                                className="ml-auto inline-flex shrink-0 items-center gap-1 pt-1 text-xs font-black text-[#d84f68]"
                                                            >
                                                                투표하기
                                                                <ChevronRightIcon
                                                                    size={16}
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {openPlaceVotes.length >
                                                    0 ? (
                                                        <div className="mp-scroll mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                                                            {openPlaceVotes.map(
                                                                (vote) => {
                                                                    const hasVoted =
                                                                        vote.myChoice !==
                                                                        null
                                                                    const requiredCount =
                                                                        Math.max(
                                                                            vote.requiredResponseCount,
                                                                            1,
                                                                        )
                                                                    const voteProgress =
                                                                        Math.min(
                                                                            100,
                                                                            (vote.responseCount /
                                                                                requiredCount) *
                                                                                100,
                                                                        )

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                vote.voteRequestId
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                navigate(
                                                                                    `/app/room/${activeTrip.id}`,
                                                                                )
                                                                            }
                                                                            className={`flex w-full items-center gap-4 rounded-[18px] px-4 py-3 text-left transition ${
                                                                                hasVoted
                                                                                    ? 'bg-white/65 hover:bg-white/80'
                                                                                    : 'bg-white/90 hover:bg-white'
                                                                            }`}
                                                                        >
                                                                            <span className="min-w-0 flex-1">
                                                                                <span className="block truncate text-sm font-black text-slate-800">
                                                                                    {
                                                                                        vote.placeName
                                                                                    }
                                                                                </span>
                                                                                <span className="mt-1 block truncate text-xs font-semibold text-slate-400">
                                                                                    {
                                                                                        vote.categoryName
                                                                                    }
                                                                                </span>
                                                                            </span>
                                                                            <span className="w-20 shrink-0">
                                                                                {hasVoted ? (
                                                                                    <span className="flex items-center justify-end gap-1 text-xs font-black text-emerald-600">
                                                                                        <CheckCircle2Icon
                                                                                            size={
                                                                                                15
                                                                                            }
                                                                                        />
                                                                                        투표
                                                                                        완료
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="block text-right text-sm font-black text-[#d84f68]">
                                                                                        {
                                                                                            vote.responseCount
                                                                                        }

                                                                                        /
                                                                                        {
                                                                                            vote.requiredResponseCount
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-rose-100">
                                                                                    <span
                                                                                        className="block h-full rounded-full bg-[#e7657a]"
                                                                                        style={{
                                                                                            width: `${voteProgress}%`,
                                                                                        }}
                                                                                    />
                                                                                </span>
                                                                            </span>
                                                                        </button>
                                                                    )
                                                                },
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-4 flex flex-1 items-center justify-center rounded-[18px] bg-white/85 px-4 text-center">
                                                            <div>
                                                                <p className="text-xs font-extrabold leading-5 text-slate-700">
                                                                    현재 참여할
                                                                    투표가
                                                                    없습니다.
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/app/room/${activeTrip.id}`,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !activeTrip.id
                                                                    }
                                                                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#d84f68] disabled:opacity-40"
                                                                >
                                                                    투표하러
                                                                    가기
                                                                    <ChevronRightIcon
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {logs.length > 0 && (
                                                    <div
                                                        aria-hidden={
                                                            visibleInsightSlide !==
                                                            1
                                                        }
                                                        className={`flex w-full shrink-0 flex-col overflow-hidden transition-opacity duration-300 ${
                                                            visibleInsightSlide ===
                                                            1
                                                                ? 'opacity-100'
                                                                : 'pointer-events-none opacity-0'
                                                        }`}
                                                    >
                                                        <h2 className="shrink-0 text-base font-black text-slate-900">
                                                            최근 활동
                                                        </h2>
                                                        <div className="mp-scroll mt-5 min-h-0 flex-1 overflow-y-auto pr-2">
                                                            <div className="relative ml-2 border-l border-slate-200 pl-5">
                                                                {logs.map(
                                                                    (log) => (
                                                                        <article
                                                                            key={
                                                                                log.id
                                                                            }
                                                                            className="relative pb-5 last:pb-1"
                                                                        >
                                                                            <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-[#e7657a] ring-2 ring-white" />
                                                                            <time className="block text-xs font-semibold text-slate-400">
                                                                                {new Intl.DateTimeFormat(
                                                                                    'ko-KR',
                                                                                    {
                                                                                        month: 'long',
                                                                                        day: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit',
                                                                                    },
                                                                                ).format(
                                                                                    new Date(
                                                                                        log.createdAt,
                                                                                    ),
                                                                                )}
                                                                            </time>
                                                                            <p className="mt-1.5 text-[13px] font-medium leading-5 text-slate-600">
                                                                                {
                                                                                    log.description
                                                                                }
                                                                            </p>
                                                                        </article>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {insightSlideCount > 1 && (
                                            <div
                                                className="mt-3 flex justify-center gap-2"
                                                role="tablist"
                                                aria-label="투표 및 활동 슬라이드"
                                            >
                                                {Array.from({
                                                    length: insightSlideCount,
                                                }).map((_, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={
                                                            visibleInsightSlide ===
                                                            index
                                                        }
                                                        aria-label={`${index + 1}번 슬라이드 보기`}
                                                        onClick={() =>
                                                            setInsightSlide(
                                                                index,
                                                            )
                                                        }
                                                        className={`h-2 rounded-full transition-all ${
                                                            visibleInsightSlide ===
                                                            index
                                                                ? 'w-5 bg-[#e7657a]'
                                                                : 'w-2 bg-rose-200 hover:bg-rose-300'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </section>,
                                    'h-[300px] min-h-0 overflow-hidden rounded-[22px] lg:h-full',
                                )}
                            </div>

                            <section className="flex flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.06)] xl:h-[560px]">
                                <div className="flex items-center justify-between px-6 py-5">
                                    <div>
                                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#d84f68]">
                                            Selected day
                                        </p>
                                        <h2 className="mt-1 text-lg font-black text-slate-900">
                                            {selectedItineraryDay
                                                ? `Day ${selectedItineraryDay.dayNumber} · ${selectedItineraryDay.title ?? '여행 일정'}`
                                                : '날짜를 선택하면 지도가 표시됩니다'}
                                        </h2>
                                    </div>
                                    {activeTrip.apiTripId ? (
                                        <AiDashboardActions
                                            tripId={activeTrip.apiTripId}
                                            days={itineraryDays}
                                            startDate={
                                                activeTrip.startDate ?? null
                                            }
                                            endDate={activeTrip.endDate ?? null}
                                            selectedDayId={
                                                selectedItineraryDay
                                                    ? Number(
                                                          selectedItineraryDay.id,
                                                      )
                                                    : null
                                            }
                                            onReplanApplied={setItineraryDays}
                                        />
                                    ) : (
                                        <MapIcon
                                            className="text-slate-300"
                                            size={22}
                                        />
                                    )}
                                </div>
                                {selectedItineraryDay ? (
                                    <div className="min-h-[430px] flex-1 [&>div]:h-full [&>div]:border-0 [&>div>button]:hidden [&>div>div]:h-full">
                                        <KanbanMapPanel
                                            days={[selectedItineraryDay]}
                                            places={[]}
                                            activeDragId={null}
                                            previewDayId={null}
                                            hoveredItemId={null}
                                            onItemHoverChange={() => undefined}
                                            focusedItemId={
                                                selectedDayFocusedItemId
                                            }
                                            focusedPlaceId={null}
                                            onItemFocus={setFocusedItemId}
                                            onPlaceFocus={() => undefined}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex min-h-[430px] flex-1 items-center justify-center bg-slate-50">
                                        <p className="text-sm font-semibold text-slate-400">
                                            오른쪽 달력에서 여행 날짜를 선택해
                                            주세요.
                                        </p>
                                    </div>
                                )}
                            </section>

                            <div className="hidden">
                                {editable(
                                    'tasks',
                                    '오늘 할 일',
                                    <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <SectionTitle
                                            title="오늘 해야 하는 일"
                                            action={
                                                <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700">
                                                    {tasks.length}개 남음
                                                </span>
                                            }
                                        />
                                        <div className="divide-y divide-slate-100">
                                            {tasks.length === 0 ? (
                                                <div className="py-10 text-center">
                                                    <CheckCircle2Icon
                                                        className="mx-auto text-brand"
                                                        size={28}
                                                    />
                                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                                        연결된 할 일 데이터가
                                                        없습니다.
                                                    </p>
                                                </div>
                                            ) : (
                                                tasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        className="flex w-full items-center gap-3 py-3 text-left"
                                                    >
                                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-brand bg-brand text-white">
                                                            <CheckCircle2Icon
                                                                size={14}
                                                            />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-semibold text-slate-700">
                                                                {task.label}
                                                            </span>
                                                            <span className="mt-0.5 block truncate text-xs text-slate-400">
                                                                {task.meta}
                                                            </span>
                                                        </span>
                                                        {task.urgent && (
                                                            <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </section>,
                                )}
                                {editable(
                                    'activity',
                                    '최근 활동',
                                    <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                        <SectionTitle
                                            title="최근 활동"
                                            action={
                                                <button
                                                    type="button"
                                                    disabled={!activeTrip.id}
                                                    onClick={() =>
                                                        navigate(
                                                            `/app/room/${activeTrip.id}?activity=open`,
                                                        )
                                                    }
                                                    className="text-xs font-bold text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    모두 보기
                                                </button>
                                            }
                                        />
                                        <div className="relative ml-2 border-l border-slate-200 pl-5">
                                            {logs.length === 0 ? (
                                                <p className="py-6 text-sm text-slate-400">
                                                    아직 기록된 활동이 없습니다.
                                                </p>
                                            ) : (
                                                logs.slice(0, 3).map((log) => (
                                                    <div
                                                        className="relative pb-4 last:pb-0"
                                                        key={log.id}
                                                    >
                                                        <span className="absolute -left-[25px] top-1 flex h-3 w-3 rounded-full border-2 border-white bg-brand" />
                                                        <p className="text-xs text-slate-400">
                                                            {new Intl.DateTimeFormat(
                                                                'ko-KR',
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                },
                                                            ).format(
                                                                new Date(
                                                                    log.createdAt,
                                                                ),
                                                            )}
                                                        </p>
                                                        <p className="mt-0.5 text-sm leading-5 text-slate-600">
                                                            {log.description}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </section>,
                                )}
                            </div>

                            <section className="hidden">
                                <SectionTitle
                                    title="내 여행방"
                                    action={
                                        <button className="flex items-center gap-0.5 text-xs font-bold text-slate-400 hover:text-slate-700">
                                            전체 보기{' '}
                                            <ChevronRightIcon size={14} />
                                        </button>
                                    }
                                />
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {rooms.length === 0 && (
                                        <button
                                            onClick={() =>
                                                navigate('/app/room')
                                            }
                                            className="col-span-full rounded-2xl border border-dashed border-brand-200 bg-brand-50 px-5 py-12 text-center"
                                        >
                                            <PlusIcon
                                                className="mx-auto text-brand"
                                                size={24}
                                            />
                                            <b className="mt-3 block text-sm text-slate-800">
                                                첫 여행방을 만들어 보세요
                                            </b>
                                            <span className="mt-1 block text-xs text-slate-500">
                                                여행방 생성 화면으로 이동합니다.
                                            </span>
                                        </button>
                                    )}
                                    {rooms.map((room, index) => (
                                        <motion.button
                                            key={room.id}
                                            whileHover={{
                                                y: -3,
                                                rotate:
                                                    index === 1 ? 0.4 : -0.4,
                                            }}
                                            onClick={() => selectTrip(room.id)}
                                            aria-pressed={
                                                room.id === activeTrip.id
                                            }
                                            className={`group relative min-h-[205px] overflow-hidden rounded-sm border bg-white p-3 text-left shadow-[0_7px_14px_rgba(15,23,42,0.08)] transition hover:shadow-md ${room.id === activeTrip.id ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200'}`}
                                        >
                                            <div className="absolute left-1/2 top-0 h-5 w-16 -translate-x-1/2 rounded-b bg-[#d9d4c6]/90" />
                                            <img
                                                src={room.cover}
                                                alt=""
                                                className="h-[116px] w-full rounded-sm object-cover"
                                            />
                                            <div className="px-1 pt-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="truncate text-sm font-extrabold">
                                                        {room.title}
                                                    </h3>
                                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                                        {room.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    {room.members}명 ·{' '}
                                                    {room.dday}
                                                </p>
                                                <p className="mt-2 truncate text-[10px] text-slate-400">
                                                    {room.location} ·{' '}
                                                    {room.date}
                                                </p>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <aside className="min-w-0 space-y-4">
                            {editable(
                                'calendar',
                                '캘린더',
                                <section className="h-full rounded-[22px] bg-white p-5">
                                    <div className="px-1 pb-2">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-extrabold tracking-tight">
                                                {calendarMonth.getFullYear()}년{' '}
                                                {calendarMonth.getMonth() + 1}월
                                            </h2>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() =>
                                                        setCalendarCursor({
                                                            tripId:
                                                                activeTripData?.id ??
                                                                null,
                                                            month: addMonths(
                                                                calendarMonth,
                                                                -1,
                                                            ),
                                                        })
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[#c94c63] hover:bg-slate-50"
                                                    aria-label="이전 달"
                                                >
                                                    ‹
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setCalendarCursor({
                                                            tripId:
                                                                activeTripData?.id ??
                                                                null,
                                                            month: addMonths(
                                                                calendarMonth,
                                                                1,
                                                            ),
                                                        })
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[#c94c63] hover:bg-slate-50"
                                                    aria-label="다음 달"
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-7 gap-y-3 text-center text-[10px] font-bold text-slate-400">
                                            <span>일</span>
                                            <span>월</span>
                                            <span>화</span>
                                            <span>수</span>
                                            <span>목</span>
                                            <span>금</span>
                                            <span>토</span>
                                            {createCalendarDays(
                                                calendarMonth,
                                            ).map((day) => {
                                                const dateKey = toDateKey(day)
                                                const isAvailable = isTripDate(
                                                    day,
                                                    activeTripData?.startDate,
                                                    activeTripData?.endDate,
                                                )
                                                const isSelected =
                                                    selectedDate === dateKey
                                                return (
                                                    <button
                                                        type="button"
                                                        key={dateKey}
                                                        disabled={!isAvailable}
                                                        onClick={() => {
                                                            setSelectedDate(
                                                                dateKey,
                                                            )
                                                            setFocusedItemId(
                                                                null,
                                                            )
                                                        }}
                                                        aria-pressed={
                                                            isSelected
                                                        }
                                                        aria-label={`${dateKey}${isAvailable ? ' 여행 일정 선택' : ''}`}
                                                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full transition ${
                                                            isSelected
                                                                ? 'bg-[#e7657a] text-white shadow-sm'
                                                                : isAvailable
                                                                  ? 'bg-[#fff0f3] text-[#d84f68] hover:bg-rose-200'
                                                                  : ''
                                                        } ${day.getMonth() !== calendarMonth.getMonth() ? 'text-slate-300' : ''}`}
                                                    >
                                                        {day.getDate()}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </section>,
                                'overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)] xl:h-[360px]',
                            )}
                            {editable(
                                'schedule',
                                '여행 일정 상태',
                                <section className="flex h-full flex-col overflow-hidden rounded-[30px] bg-white p-6">
                                    <SectionTitle
                                        title={
                                            selectedItineraryDay
                                                ? `Day ${selectedItineraryDay.dayNumber}`
                                                : '선택 날짜 일정'
                                        }
                                        action={
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/app/room/${activeTrip.id}/schedule`,
                                                    )
                                                }
                                                disabled={!activeTrip.id}
                                                className="text-xs font-bold text-brand-700"
                                            >
                                                전체 일정
                                            </button>
                                        }
                                    />
                                    {selectedItineraryDay == null ? (
                                        <p className="flex flex-1 items-center justify-center text-center text-xs text-slate-400">
                                            달력에서 여행 날짜를 선택해 주세요.
                                        </p>
                                    ) : (
                                        <>
                                            <ol className="flex min-h-0 flex-1 flex-col justify-center gap-2 pt-3">
                                                {Array.from({
                                                    length: DASHBOARD_SCHEDULE_ITEM_LIMIT,
                                                }).map((_, index, slots) => {
                                                    const item =
                                                        selectedItineraryDay
                                                            .items[index]
                                                    return (
                                                        <li
                                                            key={
                                                                item?.id ??
                                                                `empty-${index}`
                                                            }
                                                            className="relative flex gap-4"
                                                        >
                                                            <div className="relative flex w-9 shrink-0 justify-center">
                                                                {index <
                                                                    slots.length -
                                                                        1 && (
                                                                    <span
                                                                        aria-hidden="true"
                                                                        className="absolute left-1/2 top-8 h-[calc(100%+0.5rem)] -translate-x-1/2 border-l-2 border-dotted border-slate-200"
                                                                    />
                                                                )}
                                                                <span
                                                                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-xs font-black ${
                                                                        item ==
                                                                        null
                                                                            ? 'border-slate-200 bg-slate-50 text-slate-300'
                                                                            : 'shadow-sm'
                                                                    } ${
                                                                        focusedItemId ===
                                                                        String(
                                                                            item?.id,
                                                                        )
                                                                            ? 'border-[#e7657a] text-[#e7657a]'
                                                                            : item
                                                                              ? 'border-slate-400 text-slate-600'
                                                                              : ''
                                                                    }`}
                                                                >
                                                                    {index + 1}
                                                                </span>
                                                            </div>
                                                            {item ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setFocusedItemId(
                                                                            focusedItemId ===
                                                                                String(
                                                                                    item.id,
                                                                                )
                                                                                ? null
                                                                                : String(
                                                                                      item.id,
                                                                                  ),
                                                                        )
                                                                    }
                                                                    className={`min-w-0 flex-1 rounded-2xl px-4 py-2.5 text-left transition ${
                                                                        focusedItemId ===
                                                                        String(
                                                                            item.id,
                                                                        )
                                                                            ? 'bg-[#fff0f3]'
                                                                            : 'bg-slate-50 hover:bg-slate-100'
                                                                    }`}
                                                                >
                                                                    <b className="block truncate text-sm text-slate-800">
                                                                        {item.placeName ??
                                                                            '장소 미정'}
                                                                    </b>
                                                                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                                                                        {item.placeAddress ??
                                                                            item.categoryName ??
                                                                            '상세 정보 없음'}
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <div
                                                                    className="flex min-h-[55px] min-w-0 flex-1 flex-col justify-center rounded-2xl bg-slate-50 px-4"
                                                                    aria-label={`${index + 1}번째 빈 일정`}
                                                                >
                                                                    <span className="h-2.5 w-2/5 rounded-full bg-slate-200/80" />
                                                                    <span className="mt-2 h-2 w-3/4 rounded-full bg-slate-200/55" />
                                                                </div>
                                                            )}
                                                        </li>
                                                    )
                                                })}
                                            </ol>
                                            {selectedItineraryDay.items.length >
                                                DASHBOARD_SCHEDULE_ITEM_LIMIT && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(
                                                            `/app/room/${activeTrip.id}/schedule`,
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-xl bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-700 transition hover:bg-brand-100"
                                                >
                                                    +
                                                    {selectedItineraryDay.items
                                                        .length -
                                                        DASHBOARD_SCHEDULE_ITEM_LIMIT}
                                                    개의 일정이 더 있어요 · 전체
                                                    일정에서 보기
                                                </button>
                                            )}
                                        </>
                                    )}
                                </section>,
                                'min-h-[330px] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.07)] xl:h-[560px]',
                            )}
                            <div className="hidden">
                                {editable(
                                    'expenses',
                                    '지출',
                                    <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                        <SectionTitle
                                            title="지출"
                                            action={
                                                <CreditCardIcon
                                                    size={16}
                                                    className="text-slate-400"
                                                />
                                            }
                                        />
                                        <p className="text-xl font-extrabold text-slate-900">
                                            {currency(
                                                settlement?.totalExpense ?? 0,
                                            )}
                                        </p>
                                        {expenses.length === 0 ? (
                                            <p className="py-5 text-center text-xs text-slate-400">
                                                등록된 지출이 없습니다.
                                            </p>
                                        ) : (
                                            <div className="mt-3 space-y-2">
                                                {expenses
                                                    .slice(-3)
                                                    .reverse()
                                                    .map((expense) => (
                                                        <div
                                                            key={expense.id}
                                                            className="flex justify-between gap-3 text-xs"
                                                        >
                                                            <span className="truncate text-slate-500">
                                                                DAY{' '}
                                                                {
                                                                    expense.dayNumber
                                                                }{' '}
                                                                ·{' '}
                                                                {expense.title}
                                                            </span>
                                                            <b className="shrink-0 text-slate-700">
                                                                {currency(
                                                                    expense.totalAmount,
                                                                )}
                                                            </b>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </section>,
                                )}
                                {editable(
                                    'notifications',
                                    '알림',
                                    <NotificationPanel
                                        maxItems={4}
                                        onViewAll={() =>
                                            navigate('/app/updates')
                                        }
                                    />,
                                )}
                            </div>
                        </aside>
                    </main>
                </>
            )}
            {createTripOpen && (
                <CreateTripModal
                    onClose={() => setCreateTripOpen(false)}
                    onCreated={() => {
                        setCreateTripOpen(false)
                        void loadTrips()
                    }}
                />
            )}
        </div>
    )
}

function parseLocalDate(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function createCalendarDays(month: Date) {
    const firstDay = startOfMonth(month)
    const calendarStart = new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        1 - firstDay.getDay(),
    )
    return Array.from(
        { length: 42 },
        (_, index) =>
            new Date(
                calendarStart.getFullYear(),
                calendarStart.getMonth(),
                calendarStart.getDate() + index,
            ),
    )
}

function toDateKey(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-')
}

function isTripDate(
    date: Date,
    startDate: string | null | undefined,
    endDate: string | null | undefined,
) {
    if (!startDate || !endDate) return false
    const dateKey = toDateKey(date)
    return dateKey >= startDate && dateKey <= endDate
}

function getTripCountdownLabel(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    status: string | null | undefined,
    todayDateKey: string,
) {
    if (!startDate || !endDate) return '날짜 미정'
    if (status === 'COMPLETED' || todayDateKey > endDate) return '여행 끝'
    if (todayDateKey >= startDate) return '여행 중'

    const remainingDays = Math.ceil(
        (parseLocalDate(startDate).getTime() -
            parseLocalDate(todayDateKey).getTime()) /
            86_400_000,
    )
    return remainingDays === 0 ? 'D-DAY' : `D-${remainingDays}`
}

function createDashboardTasks({
    trip,
    placeCount,
    pendingVoteCount,
    transferCount,
}: {
    trip: TripResponse | undefined
    placeCount: number
    pendingVoteCount: number
    transferCount: number
}) {
    if (!trip) return []
    const tasks = []
    if (!trip.startDate || !trip.endDate) {
        tasks.push({
            id: 'schedule',
            label: '여행 기간 정하기',
            meta: '여행방 설정에서 시작일과 종료일을 입력해 주세요.',
            urgent: true,
        })
    }
    if (placeCount === 0) {
        tasks.push({
            id: 'places',
            label: '후보 장소 등록하기',
            meta: '여행방 지도에서 가고 싶은 장소를 추가해 주세요.',
            urgent: false,
        })
    }
    if (pendingVoteCount > 0) {
        tasks.push({
            id: 'votes',
            label: `대기 중인 장소 투표 ${pendingVoteCount}건 확인하기`,
            meta: '여행방에서 멤버들의 장소 투표를 확인해 주세요.',
            urgent: true,
        })
    }
    if (transferCount > 0) {
        tasks.push({
            id: 'settlement',
            label: `미정산 송금 ${transferCount}건 확인하기`,
            meta: '지출·정산 화면에서 최종 송금 내역을 확인해 주세요.',
            urgent: true,
        })
    }
    return tasks
}

function getTripScheduleLabel(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
) {
    if (!startDate || !endDate) return '미정'
    const days =
        Math.round(
            (parseLocalDate(endDate).getTime() -
                parseLocalDate(startDate).getTime()) /
                86_400_000,
        ) + 1
    return `${days}일`
}

function formatTripDateRange(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
) {
    if (!startDate || !endDate) return '여행 날짜 미정'
    return `${startDate.replaceAll('-', '. ')} - ${endDate.replaceAll('-', '. ')}`
}

function getDestinationCode(destination: string | null | undefined) {
    if (!destination || destination === '장소 미정') return '...'

    const normalized = destination.replaceAll(' ', '').toLowerCase()
    const destinationCodes: Record<string, string> = {
        제주: 'JEJU',
        제주도: 'JEJU',
        부산: 'PUS',
        서울: 'SEL',
        도쿄: 'TYO',
        동경: 'TYO',
        오사카: 'OSA',
        후쿠오카: 'FUK',
        다낭: 'DAD',
        방콕: 'BKK',
        파리: 'PAR',
        런던: 'LON',
        로마: 'ROM',
        뉴욕: 'NYC',
    }

    return destinationCodes[normalized] ?? destination.trim().toUpperCase()
}

function currency(value: number) {
    return `${Number(value).toLocaleString('ko-KR')}원`
}
