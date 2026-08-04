import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
} from 'lucide-react'
import { Room, RoomCard } from '@/entities/trip'
import {
    CreateTripModal,
    PublicScopeModal,
    fetchTripVisibilitySettings,
    updateTripVisibility,
    type PublicScope,
    type TripVisibilitySettings,
} from '@/features/manage-trip'
import { getApiErrorMessage } from '@/shared/api/client'

const PAGE_SIZE = 6
type TripFilter = 'all' | 'upcoming' | 'past'

type Props = {
    rooms: Room[]
    isLoading: boolean
    error: string | null
    onRetry: () => void | Promise<void>
    onSelectRoom: (roomId: string) => void
}

export function RoomListPanel({
    rooms,
    isLoading,
    error,
    onRetry,
    onSelectRoom,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false)
    const [page, setPage] = useState(0)
    const [filter, setFilter] = useState<TripFilter>('all')
    const [selectedYear, setSelectedYear] = useState<number | null>(null)
    const [yearMenuOpen, setYearMenuOpen] = useState(false)
    const [visibilityRoom, setVisibilityRoom] = useState<Room | null>(null)
    const [visibilityNoticeRoom, setVisibilityNoticeRoom] =
        useState<Room | null>(null)
    const [visibilityBusy, setVisibilityBusy] = useState(false)
    const [visibilityError, setVisibilityError] = useState<string | null>(null)
    const [scopeRoom, setScopeRoom] = useState<Room | null>(null)
    const [scopeSettings, setScopeSettings] =
        useState<TripVisibilitySettings | null>(null)
    const [scopeLoading, setScopeLoading] = useState(false)
    const [scopeBusy, setScopeBusy] = useState(false)
    const pastYears = useMemo(
        () =>
            Array.from(
                new Set(
                    rooms
                        .filter(isPastRoom)
                        .map(getRoomYear)
                        .filter((year): year is number => year !== null),
                ),
            ).sort((a, b) => b - a),
        [rooms],
    )
    const filteredRooms = useMemo(
        () =>
            rooms.filter((room) => {
                const past = isPastRoom(room)
                if (filter === 'upcoming' && past) return false
                if (filter === 'past' && !past) return false
                return !selectedYear || getRoomYear(room) === selectedYear
            }),
        [filter, rooms, selectedYear],
    )
    const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE))
    const visiblePage = Math.min(page, totalPages - 1)
    const visibleRooms = filteredRooms.slice(
        visiblePage * PAGE_SIZE,
        (visiblePage + 1) * PAGE_SIZE,
    )

    const selectFilter = (nextFilter: TripFilter) => {
        setFilter(nextFilter)
        setPage(0)
        setYearMenuOpen(false)
        if (nextFilter !== 'past') setSelectedYear(null)
    }

    const toggleVisibility = async () => {
        if (!visibilityRoom?.apiTripId) return
        setVisibilityBusy(true)
        setVisibilityError(null)
        try {
            await updateTripVisibility(visibilityRoom.apiTripId, 'PRIVATE')
            await onRetry()
            setVisibilityRoom(null)
        } catch (cause) {
            setVisibilityError(
                getApiErrorMessage(
                    cause,
                    '여행방 공개 상태를 변경하지 못했습니다.',
                ),
            )
        } finally {
            setVisibilityBusy(false)
        }
    }

    const openPublicScope = async (room: Room) => {
        setScopeRoom(room)
        setScopeLoading(true)
        try {
            if (room.apiTripId) {
                setScopeSettings(
                    await fetchTripVisibilitySettings(room.apiTripId),
                )
            }
        } catch (cause) {
            setScopeRoom(null)
            setVisibilityRoom(room)
            setVisibilityError(
                getApiErrorMessage(cause, '공개 범위 정보를 불러오지 못했습니다.'),
            )
        } finally {
            setScopeLoading(false)
        }
    }

    const selectPublicScope = async (scope: PublicScope) => {
        if (!scopeRoom?.apiTripId) return
        setScopeBusy(true)
        try {
            await updateTripVisibility(scopeRoom.apiTripId, scope)
            await onRetry()
            setScopeRoom(null)
            setScopeSettings(null)
        } catch (cause) {
            setVisibilityError(
                getApiErrorMessage(
                    cause,
                    '여행방 공개 상태를 변경하지 못했습니다.',
                ),
            )
        } finally {
            setScopeBusy(false)
        }
    }
    return (
        <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-3.5 @min-[440px]:px-5 @min-[440px]:py-5 @min-[760px]:px-6">
            <header className="flex flex-col gap-3 @min-[440px]:flex-row @min-[440px]:items-start @min-[440px]:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-bold text-brand-700">MY TRIPS</p>
                    <h1 className="mt-1 text-lg font-extrabold tracking-[-0.03em] text-slate-950 @min-[440px]:text-xl">
                        여행방
                    </h1>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        함께 준비 중인 모든 여행을 한눈에 살펴보고, 필요한
                        여행방을 바로 열어보세요.
                    </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 @min-[440px]:justify-start @min-[440px]:pt-5">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-extrabold text-brand-700">
                        총 {rooms.length}개
                    </span>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flamingo-gradient flamingo-glow flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 @min-[440px]:px-3.5 @min-[440px]:py-2.5 @min-[440px]:text-sm"
                    >
                        <PlusIcon size={16} /> 새 여행방
                    </button>
                </div>
            </header>

            <div className="mt-10 flex flex-wrap items-center gap-1.5 @min-[440px]:gap-2">
                {(
                    [
                        ['all', '전체'],
                        ['upcoming', '예정된 여행'],
                        ['past', '지난 여행'],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => selectFilter(value)}
                        className={`rounded-xl px-3 py-2 text-[11px] font-extrabold transition duration-200 @min-[440px]:px-3.5 @min-[440px]:text-xs ${
                            filter === value
                                ? 'bg-[#213C51] text-white shadow-[0_8px_18px_rgba(33,60,81,0.18)]'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200/80 hover:text-slate-700'
                        }`}
                    >
                        {label}
                    </button>
                ))}

                {filter === 'past' && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setYearMenuOpen((open) => !open)}
                            aria-expanded={yearMenuOpen}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold text-slate-600 shadow-sm transition hover:border-slate-300 @min-[440px]:gap-2 @min-[440px]:px-3.5 @min-[440px]:text-xs"
                        >
                            {selectedYear ?? '전체 기간'}
                            <ChevronDownIcon
                                size={14}
                                className={`transition-transform ${yearMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {yearMenuOpen && (
                            <div className="absolute left-0 top-[calc(100%+8px)] z-30 min-w-32 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                                {[null, ...pastYears].map((year) => (
                                    <button
                                        key={year ?? 'all'}
                                        type="button"
                                        onClick={() => {
                                            setSelectedYear(year)
                                            setPage(0)
                                            setYearMenuOpen(false)
                                        }}
                                        className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                                            selectedYear === year
                                                ? 'bg-slate-100 text-slate-900'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                    >
                                        {year ?? '전체 기간'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-7 @min-[620px]:grid-cols-2">
                {isLoading && (
                    <p className="col-span-full py-12 text-center text-sm text-slate-400">
                        여행방을 불러오는 중입니다.
                    </p>
                )}
                {error && (
                    <div className="col-span-full py-12 text-center text-sm text-red-500">
                        <p>{error}</p>
                        <button
                            onClick={onRetry}
                            className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                        >
                            다시 시도
                        </button>
                    </div>
                )}
                {!isLoading && !error && filteredRooms.length === 0 && (
                    <p className="col-span-full py-12 text-center text-sm text-slate-400">
                        조건에 맞는 여행방이 없습니다.
                    </p>
                )}
                {visibleRooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        compact
                        onOpen={() => onSelectRoom(room.id)}
                        onToggleVisibility={
                            room.lifecycleStatus === 'COMPLETED'
                                ? () => {
                                      if (room.visibility === 'PRIVATE') {
                                          void openPublicScope(room)
                                          return
                                      }
                                      setVisibilityError(null)
                                      setVisibilityRoom(room)
                                  }
                                : undefined
                        }
                        onVisibilityUnavailable={
                            room.lifecycleStatus !== 'COMPLETED'
                                ? () => setVisibilityNoticeRoom(room)
                                : undefined
                        }
                        visibilityBusy={
                            visibilityBusy && visibilityRoom?.id === room.id
                        }
                    />
                ))}
            </div>

            {!isLoading && !error && totalPages > 1 && (
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
                    onCreated={() => {
                        setCreateOpen(false)
                        onRetry()
                    }}
                />
            )}

            {visibilityRoom &&
                createPortal(
                    <VisibilityConfirmDialog
                        room={visibilityRoom}
                        busy={visibilityBusy}
                        error={visibilityError}
                        onCancel={() => {
                            if (visibilityBusy) return
                            setVisibilityRoom(null)
                            setVisibilityError(null)
                        }}
                        onConfirm={() => void toggleVisibility()}
                    />,
                    document.body,
                )}
            {visibilityNoticeRoom &&
                createPortal(
                    <VisibilityUnavailableDialog
                        onClose={() => setVisibilityNoticeRoom(null)}
                    />,
                    document.body,
                )}
            {scopeRoom && !scopeLoading && scopeSettings && (
                <PublicScopeModal
                    photoCount={scopeSettings.photoCount}
                    recordCount={scopeSettings.recordCount}
                    selected={
                        scopeSettings.visibility === 'PRIVATE'
                            ? null
                            : scopeSettings.visibility
                    }
                    busy={scopeBusy}
                    onSelect={(scope) => void selectPublicScope(scope)}
                    onClose={() => {
                        if (scopeBusy) return
                        setScopeRoom(null)
                        setScopeSettings(null)
                    }}
                />
            )}
        </div>
    )
}

function VisibilityUnavailableDialog({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="visibility-unavailable-title"
                aria-describedby="visibility-unavailable-description"
                className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
                <h2
                    id="visibility-unavailable-title"
                    className="text-lg font-black text-slate-900"
                >
                    공개 설정 안내
                </h2>
                <p
                    id="visibility-unavailable-description"
                    className="mt-3 text-sm leading-6 text-slate-600"
                >
                    이 여행방은 아직 공개할 수 없어요.
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                    여행이 끝나고 완료 상태가 되면 공개할 수 있으며, 공개된 여행
                    기록은 둘러보기에 표시됩니다.
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full rounded-xl bg-[#213c51] py-3 text-sm font-extrabold text-white transition hover:bg-[#182f40]"
                >
                    확인
                </button>
            </section>
        </div>
    )
}

function VisibilityConfirmDialog({
    room,
    busy,
    error,
    onCancel,
    onConfirm,
}: {
    room: Room
    busy: boolean
    error: string | null
    onCancel: () => void
    onConfirm: () => void
}) {
    const willBePublic = room.visibility === 'PRIVATE'

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="visibility-confirm-title"
                aria-describedby="visibility-confirm-description"
                className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
                <h2
                    id="visibility-confirm-title"
                    className="text-lg font-black text-slate-900"
                >
                    공개 상태 변경
                </h2>
                <p
                    id="visibility-confirm-description"
                    className="mt-3 text-sm leading-6 text-slate-600"
                >
                    현재 {willBePublic ? '비공개' : '공개'} 상태입니다.{' '}
                    <strong className="text-slate-900">
                        {willBePublic ? '공개' : '비공개'} 상태로
                    </strong>{' '}
                    전환하시겠습니까?
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                    {willBePublic
                        ? '공개하면 둘러보기에서 다른 사용자가 이 여행을 볼 수 있습니다.'
                        : '비공개로 변경하면 둘러보기에서 더 이상 노출되지 않습니다.'}
                </p>

                {error && (
                    <p
                        role="alert"
                        className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600"
                    >
                        {error}
                    </p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        아니오
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="rounded-xl bg-brand py-3 text-sm font-extrabold text-white transition hover:bg-brand-700 disabled:opacity-50"
                    >
                        {busy ? '변경 중...' : '네'}
                    </button>
                </div>
            </section>
        </div>
    )
}

function isPastRoom(room: Room) {
    if (
        room.lifecycleStatus === 'COMPLETED' ||
        room.lifecycleStatus === 'CANCELLED'
    ) {
        return true
    }
    if (!room.endDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(`${room.endDate}T00:00:00`) < today
}

function getRoomYear(room: Room) {
    const date = room.endDate ?? room.startDate
    if (!date) return null
    const year = Number(date.slice(0, 4))
    return Number.isFinite(year) ? year : null
}
