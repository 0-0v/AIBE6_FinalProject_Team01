import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    BellIcon,
    CalendarDaysIcon,
    HistoryIcon,
    LoaderCircleIcon,
    MapIcon,
    PlusIcon,
    ReceiptTextIcon,
} from 'lucide-react'
import { RoomCard } from '@/entities/trip'
import { CreateTripModal, useTripStore } from '@/features/manage-trip'
import { NotificationPanel, useNotificationStore } from '@/features/manage-notification'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useCurrentUserStore } from '@/shared/model'

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
})

export function Home() {
    const navigate = useNavigate()
    const [createOpen, setCreateOpen] = useState(false)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isInitialized = useCurrentUserStore((state) => state.isInitialized)
    const { rooms, trips, isLoading, error, loadTrips, resetTrips } = useTripStore()
    const unreadCount = useNotificationStore((state) => state.unreadCount)
    const loadNotifications = useNotificationStore(
        (state) => state.loadNotifications,
    )
    const resetNotifications = useNotificationStore((state) => state.resetNotifications)
    const {
        logs,
        isLoading: isActivityLoading,
        error: activityError,
        loadActivityLogs,
        resetActivityLogs,
    } = useActivityLogStore()
    const activeTrip = trips[0] ?? null

    useEffect(() => {
        if (currentUser) {
            void loadTrips()
            return
        }
        resetTrips()
        resetNotifications()
        resetActivityLogs()
    }, [currentUser, loadTrips, resetActivityLogs, resetNotifications, resetTrips])

    useEffect(() => {
        if (currentUser && activeTrip) {
            void loadActivityLogs(activeTrip.id)
            return
        }
        resetActivityLogs()
    }, [activeTrip, currentUser, loadActivityLogs, resetActivityLogs])

    if (!isInitialized) {
        return <PageLoading />
    }

    if (!currentUser) {
        return (
            <main className="flex min-h-full items-center justify-center bg-slate-50 p-6">
                <section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
                    <MapIcon className="mx-auto text-brand" size={34} />
                    <h1 className="mt-4 text-2xl font-extrabold">로그인이 필요합니다</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        로그인하면 여행방과 활동 내역을 확인할 수 있습니다.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white"
                    >
                        로그인하기
                    </button>
                </section>
            </main>
        )
    }

    return (
        <main className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[1240px]">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-brand-700">DASHBOARD</p>
                        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-slate-950">
                            안녕하세요, {currentUser.nickname}님 👋
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            실제 여행방과 최근 활동을 확인해 보세요.
                        </p>
                    </div>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white"
                    >
                        <PlusIcon size={16} /> 새 여행방
                    </button>
                </header>

                <section className="mt-7 grid gap-4 sm:grid-cols-3">
                    <SummaryCard icon={MapIcon} label="내 여행방" value={`${rooms.length}개`} />
                    <SummaryCard icon={BellIcon} label="읽지 않은 알림" value={`${unreadCount}개`} />
                    <SummaryCard icon={HistoryIcon} label="최근 여행방 활동" value={`${logs.length}건`} />
                </section>

                {isLoading ? (
                    <PageLoading compact />
                ) : error ? (
                    <ErrorState message={error} onRetry={() => void loadTrips()} />
                ) : rooms.length === 0 ? (
                    <EmptyTripState onCreate={() => setCreateOpen(true)} />
                ) : (
                    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 space-y-6">
                            <section>
                                <SectionHeader
                                    title="내 여행방"
                                    actionLabel="전체 보기"
                                    onAction={() => navigate('/app/room')}
                                />
                                <div className="grid gap-5 md:grid-cols-2">
                                    {rooms.slice(0, 4).map((room) => (
                                        <RoomCard
                                            key={room.id}
                                            room={room}
                                            onOpen={() => navigate(`/app/room/${room.id}`)}
                                        />
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                                <SectionHeader
                                    title={activeTrip ? `${activeTrip.title} 최근 활동` : '최근 활동'}
                                    actionLabel="여행방 열기"
                                    onAction={() => activeTrip && navigate(`/app/room/${activeTrip.id}`)}
                                />
                                {isActivityLoading ? (
                                    <InlineLoading message="활동 로그를 불러오는 중입니다." />
                                ) : activityError ? (
                                    <ErrorState message={activityError} onRetry={() => activeTrip && void loadActivityLogs(activeTrip.id)} compact />
                                ) : logs.length === 0 ? (
                                    <EmptyData icon={HistoryIcon} message="아직 기록된 활동이 없습니다." />
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {logs.slice(0, 6).map((log) => (
                                            <div key={log.id} className="flex items-start gap-3 py-3">
                                                <span className="mt-0.5 rounded-lg bg-brand-50 p-2 text-brand-700"><HistoryIcon size={14} /></span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-700">{log.description}</p>
                                                    <time className="mt-1 block text-xs text-slate-400">{formatDate(log.createdAt)}</time>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className="grid gap-4 sm:grid-cols-2">
                                <UnavailableCard icon={CalendarDaysIcon} title="일정" />
                                <UnavailableCard icon={ReceiptTextIcon} title="지출·정산" />
                            </section>
                        </div>
                        <NotificationPanel />
                    </div>
                )}
            </div>

            {createOpen && (
                <CreateTripModal
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => {
                        setCreateOpen(false)
                        void loadTrips()
                        void loadNotifications()
                    }}
                />
            )}
        </main>
    )
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof MapIcon; label: string; value: string }) {
    return <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon size={17} /></span><p className="mt-4 text-xs font-bold text-slate-400">{label}</p><strong className="mt-1 block text-2xl font-extrabold text-slate-900">{value}</strong></article>
}

function EmptyTripState({ onCreate }: { onCreate: () => void }) {
    return <section className="mt-7 rounded-3xl border border-dashed border-brand-200 bg-white px-6 py-16 text-center"><MapIcon className="mx-auto text-brand" size={32} /><h2 className="mt-4 text-xl font-extrabold">첫 여행방을 만들어 보세요</h2><p className="mt-2 text-sm text-slate-500">여행방을 만들면 장소, 일정, 활동 로그와 알림이 실제 데이터로 표시됩니다.</p><button onClick={onCreate} className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white"><PlusIcon className="mr-1 inline" size={15} /> 여행방 만들기</button></section>
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
    return <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-900">{title}</h2><button onClick={onAction} className="text-xs font-bold text-brand-700">{actionLabel}</button></div>
}

function UnavailableCard({ icon: Icon, title }: { icon: typeof CalendarDaysIcon; title: string }) {
    return <article className="rounded-2xl border border-slate-100 bg-white p-5"><Icon className="text-slate-300" size={22} /><h3 className="mt-3 text-sm font-extrabold">{title}</h3><p className="mt-1 text-xs text-slate-400">연결된 데이터가 아직 없습니다.</p></article>
}

function EmptyData({ icon: Icon, message }: { icon: typeof HistoryIcon; message: string }) {
    return <div className="py-10 text-center text-slate-400"><Icon className="mx-auto" size={22} /><p className="mt-2 text-sm">{message}</p></div>
}

function ErrorState({ message, onRetry, compact = false }: { message: string; onRetry: () => void; compact?: boolean }) {
    return <div className={`${compact ? 'py-6' : 'mt-7 py-12'} rounded-2xl bg-red-50 text-center`}><p className="text-sm text-red-600">{message}</p><button onClick={onRetry} className="mt-2 text-xs font-bold text-red-700 underline">다시 시도</button></div>
}

function PageLoading({ compact = false }: { compact?: boolean }) {
    return <div className={`flex items-center justify-center gap-2 text-sm text-slate-400 ${compact ? 'py-16' : 'min-h-full'}`}><LoaderCircleIcon className="animate-spin" size={18} /> 데이터를 불러오는 중입니다.</div>
}

function InlineLoading({ message }: { message: string }) {
    return <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><LoaderCircleIcon className="animate-spin" size={16} /> {message}</div>
}

function formatDate(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : DATE_FORMATTER.format(date)
}
