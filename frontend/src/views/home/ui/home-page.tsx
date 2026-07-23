import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    BellIcon,
    BookmarkCheckIcon,
    CalendarDaysIcon,
    CheckCircle2Icon,
    ChevronRightIcon,
    CopyIcon,
    CreditCardIcon,
    HeartIcon,
    LayoutGridIcon,
    ListIcon,
    MapPinIcon,
    PlusIcon,
    SparklesIcon,
    ThumbsUpIcon,
    WandSparklesIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { exploreCards } from '@/entities/trip'
import { useTripStore } from '@/features/manage-trip'
import { NotificationPanel } from '@/features/manage-notification'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useCurrentUserStore } from '@/shared/model'
import { Avatar } from '@/shared/ui'
import { TravelRooms } from '@/widgets/travel-rooms'

type SurfaceId =
    | 'travel'
    | 'tasks'
    | 'activity'
    | 'calendar'
    | 'insights'
    | 'schedule'
    | 'expenses'
    | 'notifications'
    | 'saved'

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
    insights: '#ffffff',
    schedule: '#ffffff',
    expenses: '#ffffff',
    notifications: '#ffffff',
    saved: '#ffffff',
}

const aiFindings: {
    icon: typeof CopyIcon
    title: string
    description: string
    tone: string
}[] = []

const calendarDays = [
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
]

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
    const { rooms, activeTripId, selectTrip, loadTrips, resetTrips } =
        useTripStore()
    const { logs, loadActivityLogs, resetActivityLogs } = useActivityLogStore()
    const [tasks, setTasks] = useState(initialTasks)
    const [view, setView] = useState<'dashboard' | 'list'>('dashboard')
    const [saved, setSaved] = useState<typeof exploreCards>([])
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

    function toggleTask(id: string) {
        setTasks((current) => current.filter((task) => task.id !== id))
    }

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
                        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f8f7] text-slate-500 hover:bg-slate-100"
                        aria-label="알림 열기"
                    >
                        <BellIcon size={18} />
                        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-white" />
                    </button>
                    <button
                        onClick={() => navigate('/app/room')}
                        className="flamingo-gradient flamingo-glow hidden items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 sm:flex"
                    >
                        <PlusIcon size={16} /> 새 여행방
                    </button>
                </div>
            </header>

            {view === 'list' ? (
                <div className="mx-auto mt-6 max-w-[1440px] px-1">
                    <TravelRooms embedded />
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
                                                        <span>
                                                            {
                                                                activeTrip.progress
                                                            }
                                                            %
                                                        </span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-white/25">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${activeTrip.progress}%`,
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
                                                text: '연결된 데이터 없음',
                                                icon: ThumbsUpIcon,
                                                tone: 'bg-amber-100 text-amber-600',
                                            },
                                            {
                                                title: 'AI 정리안',
                                                text: '연결된 데이터 없음',
                                                icon: SparklesIcon,
                                                tone: 'bg-emerald-100 text-emerald-600',
                                            },
                                            {
                                                title: '오늘 일정',
                                                text: '연결된 데이터 없음',
                                                icon: CalendarDaysIcon,
                                                tone: 'bg-sky-100 text-sky-600',
                                            },
                                            {
                                                title: '예산 현황',
                                                text: '연결된 데이터 없음',
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
                                                <button
                                                    key={task.id}
                                                    onClick={() =>
                                                        toggleTask(task.id)
                                                    }
                                                    className="group flex w-full items-center gap-3 py-3 text-left"
                                                >
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 text-transparent transition group-hover:border-brand group-hover:bg-brand">
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
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <button className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-700">
                                        <PlusIcon size={13} /> 할 일 추가
                                    </button>
                                </section>,
                            )}
                            {editable(
                                'activity',
                                '최근 활동',
                                <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                    <SectionTitle
                                        title="최근 활동"
                                        action={
                                            <button className="text-xs font-bold text-slate-400 hover:text-slate-700">
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
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${room.progress}%`,
                                                        backgroundColor:
                                                            room.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </section>

                        {editable(
                            'saved',
                            '저장됨',
                            <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <SectionTitle
                                    title="저장됨"
                                    action={
                                        <button
                                            onClick={() =>
                                                navigate('/app/explore')
                                            }
                                            className="flex items-center gap-0.5 text-xs font-bold text-slate-400 hover:text-slate-700"
                                        >
                                            전체 보기{' '}
                                            <ChevronRightIcon size={14} />
                                        </button>
                                    }
                                />
                                {saved.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <BookmarkCheckIcon
                                            className="mx-auto text-slate-300"
                                            size={28}
                                        />
                                        <p className="mt-2 text-sm font-semibold text-slate-700">
                                            저장한 여행이 없어요
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        {saved.map((card) => (
                                            <div
                                                key={card.title}
                                                className="group relative overflow-hidden rounded-xl border border-slate-100"
                                            >
                                                <img
                                                    src={card.image}
                                                    alt=""
                                                    className="h-24 w-full object-cover"
                                                />
                                                <div className="p-2.5">
                                                    <h3 className="truncate text-xs font-extrabold text-slate-800">
                                                        {card.title}
                                                    </h3>
                                                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                                        {card.tag}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setSaved((current) =>
                                                            current.filter(
                                                                (item) =>
                                                                    item.title !==
                                                                    card.title,
                                                            ),
                                                        )
                                                    }
                                                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm hover:bg-white"
                                                    aria-label="저장 해제"
                                                >
                                                    <HeartIcon
                                                        className="fill-current"
                                                        size={13}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>,
                        )}
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
                                            8월 2026
                                        </h2>
                                        <div className="flex gap-1">
                                            <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[#c94c63] hover:bg-slate-50">
                                                ‹
                                            </button>
                                            <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[#c94c63] hover:bg-slate-50">
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
                                        {calendarDays.map((day, index) => (
                                            <span
                                                key={`${day}-${index}`}
                                                className={`${index >= 16 && index <= 19 ? 'rounded-full bg-[#e7657a] py-1 text-white shadow-sm' : index === 17 ? 'ring-2 ring-[#f2b8c2]' : ''} ${index < 6 || index > 36 ? 'text-slate-300' : ''}`}
                                            >
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>,
                        )}
                        {editable(
                            'insights',
                            'AI 인사이트',
                            <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                <SectionTitle
                                    title="AI가 발견한 것"
                                    action={
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                            <WandSparklesIcon size={15} />
                                        </span>
                                    }
                                />
                                <p className="-mt-1 mb-4 text-xs leading-5 text-slate-500">
                                    여행방을 분석해, 확인이 필요한 항목을
                                    모았어요.
                                </p>
                                <div className="space-y-2.5">
                                    {aiFindings.length === 0 && (
                                        <p className="py-5 text-center text-xs text-slate-400">
                                            연결된 AI 분석 결과가 없습니다.
                                        </p>
                                    )}
                                    {aiFindings.map((finding) => (
                                        <button
                                            onClick={() =>
                                                navigate('/app/room')
                                            }
                                            key={finding.title}
                                            className="flex w-full items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                                        >
                                            <span
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${finding.tone}`}
                                            >
                                                <finding.icon size={15} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <b className="block text-xs text-slate-800">
                                                    {finding.title}
                                                </b>
                                                <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                                                    {finding.description}
                                                </span>
                                            </span>
                                            <ChevronRightIcon
                                                className="mt-1 shrink-0 text-slate-300"
                                                size={14}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </section>,
                        )}
                        {editable(
                            'schedule',
                            '오늘 일정',
                            <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                <SectionTitle
                                    title="오늘 일정"
                                    action={
                                        <button
                                            onClick={() =>
                                                navigate('/app/room')
                                            }
                                            className="text-xs font-bold text-brand-700"
                                        >
                                            전체 일정
                                        </button>
                                    }
                                />
                                <p className="py-6 text-center text-xs text-slate-400">
                                    연결된 일정 데이터가 없습니다.
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
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        연결된 지출 데이터가 없습니다.
                                    </p>
                                </section>,
                            )}
                            {editable(
                                'notifications',
                                '알림',
                                <NotificationPanel />,
                            )}
                        </div>
                    </aside>
                </main>
            )}
        </div>
    )
}
