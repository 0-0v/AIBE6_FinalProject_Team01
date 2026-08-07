import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'
import { RoomCard } from '@/entities/trip'
import { CreateTripModal, useTripStore } from '@/features/manage-trip'
import { useCurrentUserStore } from '@/shared/model'

type Props = {
    embedded?: boolean
    compact?: boolean
}

export function TravelRooms({ embedded = false, compact = false }: Props) {
    const navigate = useNavigate()
    const [createOpen, setCreateOpen] = React.useState(false)
    const [page, setPage] = React.useState(0)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const { rooms, isLoading, error, loadTrips, resetTrips, selectTrip } =
        useTripStore()

    useEffect(() => {
        if (currentUser) void loadTrips()
        else resetTrips()
    }, [currentUser, loadTrips, resetTrips])

    const pageSize = compact ? 4 : rooms.length || 1
    const totalPages = Math.max(1, Math.ceil(rooms.length / pageSize))
    const visiblePage = Math.min(page, totalPages - 1)
    const visibleRooms = compact
        ? rooms.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize)
        : rooms

    const content = (
        <>
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    {!compact && (
                        <p className="text-sm font-bold text-brand-700">
                            MY TRIPS
                        </p>
                    )}
                    <h1
                        className={`${compact ? 'text-lg' : 'mt-1 text-3xl'} font-extrabold tracking-[-0.05em] text-slate-950`}
                    >
                        여행방
                    </h1>
                    {!compact && (
                        <p className="mt-2 text-sm text-slate-500">
                            함께 준비 중인 모든 여행을 한눈에 살펴보고, 필요한
                            여행방을 바로 열어보세요.
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
                        총 {rooms.length}개
                    </span>
                    {!embedded && (
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white"
                        >
                            <PlusIcon size={14} /> 새 여행방
                        </button>
                    )}
                </div>
            </header>

            <section
                className={`${compact ? 'mt-4 grid-cols-4 gap-4' : 'mt-8 grid-cols-3 gap-5'} grid`}
            >
                {isLoading && (
                    <p className="text-sm text-slate-400">
                        여행방을 불러오는 중입니다.
                    </p>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
                {!isLoading && !error && rooms.length === 0 && (
                    <p className="text-sm text-slate-400">
                        아직 생성된 여행방이 없습니다.
                    </p>
                )}
                {visibleRooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        onOpen={() => navigate(`/app/room/${room.id}`)}
                        compact={compact}
                    />
                ))}
            </section>
            {compact && totalPages > 1 && (
                <nav
                    aria-label="여행방 페이지"
                    className="mt-4 flex items-center justify-center gap-3"
                >
                    <button
                        type="button"
                        onClick={() => setPage(visiblePage - 1)}
                        disabled={visiblePage === 0}
                        aria-label="이전 여행방"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <ChevronLeftIcon size={15} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-500">
                        {visiblePage + 1} / {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage(visiblePage + 1)}
                        disabled={visiblePage + 1 >= totalPages}
                        aria-label="다음 여행방"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <ChevronRightIcon size={15} />
                    </button>
                </nav>
            )}

            {createOpen && (
                <CreateTripModal
                    onClose={() => setCreateOpen(false)}
                    onCreated={async (tripId) => {
                        setCreateOpen(false)
                        await loadTrips()
                        const roomId = String(tripId)
                        selectTrip(roomId)
                        navigate(`/app/room/${roomId}`)
                    }}
                />
            )}
        </>
    )

    if (embedded) {
        return content
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[1240px]">{content}</div>
        </div>
    )
}
