'use client'

import React, { useEffect, useState } from 'react'
import { AlignLeftIcon, ArrowLeftIcon, LayoutDashboardIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    fromApiToPlace,
    getTripPlaceAccess,
    getTripPlaceVotes,
    latestVoteByPlaceId,
    getTripPlaces,
    type Place,
} from '@/entities/trip'
import { useCommentStore } from '@/features/comment-place'
import { useTripStore } from '@/features/manage-trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { REALTIME_EVENT_NAME, type RealtimeEvent } from '@/shared/lib'
import { useCurrentUserStore } from '@/shared/model'
import {
    KanbanSchedulePanel,
    TimetableSchedulePanel,
} from '@/widgets/trip-room'

export function ScheduleKanbanPage() {
    const { roomId } = useParams<{ roomId: string }>()
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const currentUserId = currentUser?.id ?? null
    const isUserInitialized = useCurrentUserStore(
        (state) => state.isInitialized,
    )
    const { rooms, isLoading, loadTrips, selectTrip } = useTripStore()

    const room = rooms.find((r) => r.id === roomId)
    const tripId = room?.apiTripId

    const [places, setPlaces] = useState<Place[]>([])
    const [canManage, setCanManage] = useState(false)
    const [placesError, setPlacesError] = useState<string | null>(null)
    const [view, setView] = useState<'kanban' | 'timetable'>('kanban')
    const [realtimeVersion, setRealtimeVersion] = useState(0)

    useEffect(() => {
        if (roomId) selectTrip(roomId)
    }, [roomId, selectTrip])

    useEffect(() => {
        const handleRealtimeChange = (event: Event) => {
            const detail = (event as CustomEvent<RealtimeEvent>).detail
            if (detail.tripId !== tripId) return
            setRealtimeVersion((current) => current + 1)
        }
        window.addEventListener(REALTIME_EVENT_NAME, handleRealtimeChange)
        return () =>
            window.removeEventListener(
                REALTIME_EVENT_NAME,
                handleRealtimeChange,
            )
    }, [tripId])

    // trips 미로드 상태에서 직접 접근한 경우 로드
    useEffect(() => {
        if (!isUserInitialized) return
        if (currentUserId != null && rooms.length === 0) {
            void loadTrips(currentUserId)
        }
    }, [currentUserId, isUserInitialized, rooms.length, loadTrips])

    // 장소 데이터 로드
    useEffect(() => {
        if (!room?.id || !tripId) return
        const controller = new AbortController()
        Promise.all([
            getTripPlaces(tripId, controller.signal),
            getTripPlaceVotes(tripId, controller.signal),
            getTripPlaceAccess(tripId, controller.signal),
        ])
            .then(([tripPlaces, voteSummaries, canEdit]) => {
                setPlacesError(null)
                setCanManage(canEdit)
                const votesByPlaceId = latestVoteByPlaceId(
                    voteSummaries.filter((vote) => vote.status === 'CLOSED'),
                )
                const cachedComments =
                    useCommentStore.getState().commentsByPlaceId
                setPlaces(
                    tripPlaces
                        .filter((tp) => tp.status !== 'REJECTED')
                        .map((tp) => {
                            const place = fromApiToPlace(
                                tp,
                                room.id,
                                votesByPlaceId.get(tp.tripPlaceId),
                            )
                            return {
                                ...place,
                                comments:
                                    cachedComments[place.id] ?? place.comments,
                            }
                        }),
                )
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return
                setPlaces([])
                setCanManage(false)
                setPlacesError(
                    getApiErrorMessage(err, '장소를 불러오지 못했습니다.'),
                )
            })
        return () => controller.abort()
    }, [realtimeVersion, room?.id, tripId])

    const canPlanWrite =
        canManage && room != null && room.lifecycleStatus !== 'COMPLETED'

    // 초기화 또는 trips 로딩 중
    if (!isUserInitialized || (isLoading && rooms.length === 0)) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-white">
                <p className="text-sm text-slate-400">불러오는 중...</p>
            </div>
        )
    }

    // 방을 찾을 수 없음
    if (!room || !tripId) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white">
                <p className="text-sm text-slate-400">
                    여행방을 찾을 수 없습니다.
                </p>
                <button
                    type="button"
                    onClick={() => navigate(`/app/room/${roomId ?? ''}`)}
                    className="text-sm font-bold text-brand hover:underline"
                >
                    여행방으로 돌아가기
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col bg-slate-50">
            {/* 헤더 */}
            <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <button
                    type="button"
                    onClick={() => navigate(`/app/room/${roomId}`)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
                >
                    <ArrowLeftIcon size={16} />
                    돌아가기
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <h1 className="truncate text-sm font-bold text-slate-800">
                    {room.title}
                </h1>
                <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                    일정 보드
                </span>
                {/* 뷰 전환 토글 */}
                <div className="ml-auto flex items-center rounded-lg border border-slate-200 p-0.5">
                    <button
                        type="button"
                        onClick={() => setView('kanban')}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold transition ${
                            view === 'kanban'
                                ? 'bg-white text-slate-700 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <LayoutDashboardIcon size={11} />
                        칸반
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('timetable')}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold transition ${
                            view === 'timetable'
                                ? 'bg-white text-slate-700 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <AlignLeftIcon size={11} />
                        시간표
                    </button>
                </div>
                {placesError && (
                    <p className="text-xs text-red-500">{placesError}</p>
                )}
            </header>

            {/* 뷰 패널 */}
            {view === 'kanban' ? (
                <KanbanSchedulePanel
                    key={`kanban-${tripId}`}
                    tripId={tripId}
                    places={places}
                    canWrite={canPlanWrite}
                    realtimeVersion={realtimeVersion}
                />
            ) : (
                <TimetableSchedulePanel
                    key={`timetable-${tripId}-${realtimeVersion}`}
                    tripId={tripId}
                    canWrite={canPlanWrite}
                />
            )}
        </div>
    )
}
