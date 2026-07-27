import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarDaysIcon,
    BookmarkIcon,
    CheckCircle2Icon,
    ChevronRightIcon,
    CreditCardIcon,
    LayoutGridIcon,
    ListIcon,
    MapPinIcon,
    PlusIcon,
    ThumbsUpIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { getTripPlaces, getTripPlaceVotes } from '@/entities/trip'
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
import { NotificationPanel } from '@/features/manage-notification'
import {
    fetchBookmarkedCards,
    type PublicCard,
} from '@/features/explore-card'
import { useActivityLogStore } from '@/features/view-activity-log'
import { resolveMediaUrl } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { Avatar } from '@/shared/ui'
import { TravelRooms } from '@/widgets/travel-rooms'

type SurfaceId =
    | 'travel'
    | 'tasks'
    | 'activity'
    | 'calendar'
    | 'schedule'
    | 'expenses'
    | 'notifications'

const initialTasks: {
    id: string
    label: string
    meta: string
    urgent: boolean
}[] = []

const initialColors: Record<SurfaceId, string> = {
    travel: '#fff3f5',
    tasks: '#ffffff',
    activity: '#ffffff',
    calendar: '#ffffff',
    schedule: '#ffffff',
    expenses: '#ffffff',
    notifications: '#ffffff',
}

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
    const [view, setView] = useState<'dashboard' | 'list'>('dashboard')
    const [createTripOpen, setCreateTripOpen] = useState(false)
    const [placeCount, setPlaceCount] = useState(0)
    const [pendingVoteCount, setPendingVoteCount] = useState(0)
    const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
    const [settlement, setSettlement] = useState<SettlementSummary | null>(null)
    const [dashboardError, setDashboardError] = useState<string | null>(null)
    const [bookmarkedCards, setBookmarkedCards] = useState<PublicCard[]>([])
    const activeTripData =
        trips.find((trip) => String(trip.id) === activeTripId) ?? trips[0]
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
            progress: 0,
            cover: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
            status: '준비 전',
            color: '#e7657a',
        }

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
                setPlaceCount(0)
                setPendingVoteCount(0)
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
                const openVotes = votes.filter(
                    (vote) => vote.status === 'OPEN',
                ).length
                setPlaceCount(places.length)
                setPendingVoteCount(openVotes)
                setExpenses(expenseData.expenses)
                setSettlement(expenseData.settlement)
                setTasks(
                    createDashboardTasks({
                        trip: activeTripData,
                        placeCount: places.length,
                        pendingVoteCount: openVotes,
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
    }, [activeTrip.apiTripId, activeTripData, currentUser])

    useEffect(() => {
        if (!currentUser) {
            Promise.resolve().then(() => setBookmarkedCards([]))
            return
        }
        void fetchBookmarkedCards()
            .then(setBookmarkedCards)
            .catch(() => setBookmarkedCards([]))
    }, [currentUser])

    const progress = calculatePreparationProgress({
        trip: activeTripData,
        placeCount,
        pendingVoteCount,
        expenseCount: expenses.length,
    })

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
        <div className="min-h-full bg-white px-4 py-5 sm:px-7 sm:py-7 xl:px-8">
            <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-slate-950 sm:text-[30px]">
                        안녕하세요, {currentUser?.nickname ?? '여행자'}님{' '}
                        <span aria-hidden="true">👋</span>
                    </h1>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        오늘의 여행 준비 현황을 확인해 보세요
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <label className="hidden h-11 w-[250px] items-center gap-2 rounded-full bg-[#f4f8f7] px-4 text-slate-400 lg:flex">
                        <span className="text-lg">⌕</span>
                        <input
                            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                            placeholder="여행방이나 장소 검색"
                        />
                    </label>
                    <div className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                        <button
                            onClick={() => setView('dashboard')}
                            aria-pressed={view === 'dashboard'}
                            className={`flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-extrabold transition ${view === 'dashboard' ? 'bg-[#fff0f2] text-[#c94c63]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGridIcon size={15} /> 대시보드
                        </button>
                        <button
                            onClick={() => setView('list')}
                            aria-pressed={view === 'list'}
                            className={`flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-extrabold transition ${view === 'list' ? 'bg-[#fff0f2] text-[#c94c63]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ListIcon size={15} /> 리스트
                        </button>
                    </div>
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
                <div className="mx-auto mt-6 max-w-[1440px] space-y-8 px-1">
                    <TravelRooms embedded />
                    <section>
                        <SectionTitle title="북마크한 여행 카드" />
                        {bookmarkedCards.length === 0 ? (
                            <div className="rounded-2xl border border-dashed bg-white py-10 text-center text-sm text-slate-400">
                                둘러보기에서 저장한 여행 카드가 없습니다.
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {bookmarkedCards.map((card) => (
                                    <article
                                        key={card.id}
                                        className="rounded-2xl border bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-extrabold text-slate-900">
                                                    {card.title}
                                                </h3>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {card.authorNickname} ·{' '}
                                                    {card.destination ??
                                                        '여행지 미정'}
                                                </p>
                                            </div>
                                            <BookmarkIcon
                                                size={18}
                                                fill="currentColor"
                                                className="text-brand-700"
                                            />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            ) : (
                <main className="mx-auto mt-6 grid max-w-[1440px] gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
                    <div className="min-w-0 space-y-5">
                        {editable(
                            'travel',
                            '여행 현황',
                            <motion.section
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.32 }}
                                className="overflow-hidden rounded-[28px] border p-5 sm:p-6"
                                style={{ borderColor: `${activeTrip.color}33` }}
                            >
                                <div className="grid gap-5 lg:grid-cols-[1.06fr_0.94fr]">
                                    <div className="relative min-h-[250px] overflow-hidden rounded-[22px] bg-slate-950 p-6 text-white">
                                        <img
                                            src={activeTrip.cover}
                                            alt={activeTrip.title}
                                            className="absolute inset-0 h-full w-full object-cover opacity-55"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />
                                        <div className="relative flex h-full flex-col justify-between">
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                                                    <MapPinIcon size={12} />{' '}
                                                    진행 중인 여행
                                                </span>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <h2 className="text-2xl font-extrabold tracking-[-0.04em]">
                                                        {activeTrip.title}
                                                    </h2>
                                                    <span
                                                        className="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                                                        style={{
                                                            backgroundColor: `${activeTrip.color}22`,
                                                            color: activeTrip.color,
                                                        }}
                                                    >
                                                        {activeTrip.dday}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-xs font-medium text-white/75">
                                                    {activeTrip.date} ·{' '}
                                                    {activeTrip.location}
                                                </p>
                                            </div>
                                            <div className="flex items-end gap-4">
                                                <div>
                                                    <span className="mt-1.5 block text-[11px] font-medium text-white/75">
                                                        {activeTrip.members}명
                                                        함께 준비 중
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="mb-1.5 flex justify-between text-[11px] font-bold">
                                                        <span>여행 준비도</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-white/25">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${progress}%`,
                                                                backgroundColor:
                                                                    activeTrip.color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            {
                                                title: '투표 대기',
                                                text: `${pendingVoteCount}건`,
                                                icon: ThumbsUpIcon,
                                                tone: 'bg-amber-100 text-amber-600',
                                            },
                                            {
                                                title: '후보 장소',
                                                text: `${placeCount}곳`,
                                                icon: MapPinIcon,
                                                tone: 'bg-emerald-100 text-emerald-600',
                                            },
                                            {
                                                title: '여행 일정',
                                                text: getTripScheduleLabel(
                                                    activeTripData?.startDate,
                                                    activeTripData?.endDate,
                                                ),
                                                icon: CalendarDaysIcon,
                                                tone: 'bg-sky-100 text-sky-600',
                                            },
                                            {
                                                title: '누적 지출',
                                                text: currency(
                                                    settlement?.totalExpense ??
                                                        0,
                                                ),
                                                icon: CreditCardIcon,
                                                tone: 'bg-violet-100 text-violet-600',
                                            },
                                        ].map((item) => (
                                            <button
                                                onClick={() =>
                                                    navigate('/app/room')
                                                }
                                                key={item.title}
                                                className="flex flex-col items-start rounded-[22px] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                            >
                                                <span
                                                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}
                                                >
                                                    <item.icon size={17} />
                                                </span>
                                                <b className="mt-auto pt-5 text-sm text-slate-800">
                                                    {item.title}
                                                </b>
                                                <span className="mt-1 text-[11px] font-medium text-slate-400">
                                                    {item.text}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.section>,
                            'overflow-visible rounded-[28px]',
                        )}

                        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
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

                        <section>
                            <SectionTitle
                                title="내 여행방"
                                action={
                                    <button className="flex items-center gap-0.5 text-xs font-bold text-slate-400 hover:text-slate-700">
                                        전체 보기 <ChevronRightIcon size={14} />
                                    </button>
                                }
                            />
                            <div className="grid gap-4 sm:grid-cols-3">
                                {rooms.length === 0 && (
                                    <button
                                        onClick={() => navigate('/app/room')}
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
                                            rotate: index === 1 ? 0.4 : -0.4,
                                        }}
                                        onClick={() => selectTrip(room.id)}
                                        aria-pressed={room.id === activeTrip.id}
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
                                                {room.members}명 · {room.dday}
                                            </p>
                                            <p className="mt-2 truncate text-[10px] text-slate-400">
                                                {room.location} · {room.date}
                                            </p>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside className="min-w-0 space-y-5 border-l border-slate-100 pl-0 xl:pl-6">
                        {editable(
                            'calendar',
                            '캘린더',
                            <section className="rounded-[24px] p-1">
                                <div className="flex items-center gap-3 px-3 pb-5 pt-2">
                                    <Avatar
                                        name={currentUser?.nickname ?? '여행자'}
                                        color="#e7657a"
                                        imageUrl={resolveMediaUrl(
                                            currentUser?.profileImageUrl,
                                        )}
                                        size={44}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-extrabold text-slate-900">
                                            {currentUser?.nickname ?? '여행자'}
                                            님
                                        </p>
                                        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                                            여행 플래너
                                        </p>
                                    </div>
                                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                        ⌄
                                    </button>
                                </div>
                                <div className="border-t border-slate-100 px-3 pb-3 pt-5">
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
                                        {createCalendarDays(calendarMonth).map(
                                            (day) => (
                                                <span
                                                    key={toDateKey(day)}
                                                    className={`${isTripDate(day, activeTripData?.startDate, activeTripData?.endDate) ? 'rounded-full bg-[#e7657a] py-1 text-white shadow-sm' : ''} ${day.getMonth() !== calendarMonth.getMonth() ? 'text-slate-300' : ''}`}
                                                >
                                                    {day.getDate()}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </section>,
                        )}
                        {editable(
                            'schedule',
                            '여행 일정 상태',
                            <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                <SectionTitle
                                    title="여행 일정 상태"
                                    action={
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/app/room/${activeTrip.id}`,
                                                )
                                            }
                                            disabled={!activeTrip.id}
                                            className="text-xs font-bold text-brand-700"
                                        >
                                            전체 일정
                                        </button>
                                    }
                                />
                                <p className="py-6 text-center text-xs text-slate-400">
                                    {getTodayTripStatus(
                                        activeTripData?.startDate,
                                        activeTripData?.endDate,
                                    )}
                                </p>
                            </section>,
                        )}
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
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
                                                            {expense.dayNumber}{' '}
                                                            · {expense.title}
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
                                    onViewAll={() => navigate('/app/updates')}
                                />,
                            )}
                        </div>
                    </aside>
                </main>
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

function calculatePreparationProgress({
    trip,
    placeCount,
    pendingVoteCount,
    expenseCount,
}: {
    trip: TripResponse | undefined
    placeCount: number
    pendingVoteCount: number
    expenseCount: number
}) {
    if (!trip) return 0
    if (trip.status === 'COMPLETED') return 100
    const completed = [
        Boolean(trip.destination),
        Boolean(trip.startDate && trip.endDate),
        placeCount > 0,
        placeCount > 0 && pendingVoteCount === 0,
        expenseCount > 0,
    ].filter(Boolean).length
    return completed * 20
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

function getTodayTripStatus(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
) {
    if (!startDate || !endDate) return '여행 기간이 아직 정해지지 않았습니다.'
    const today = toDateKey(new Date())
    if (today < startDate)
        return `여행 시작일까지 ${daysBetween(today, startDate)}일 남았습니다.`
    if (today > endDate) return '완료된 여행입니다.'
    return `오늘은 여행 DAY ${daysBetween(startDate, today) + 1}입니다.`
}

function daysBetween(from: string, to: string) {
    return Math.round(
        (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) /
            86_400_000,
    )
}

function currency(value: number) {
    return `${Number(value).toLocaleString('ko-KR')}원`
}
