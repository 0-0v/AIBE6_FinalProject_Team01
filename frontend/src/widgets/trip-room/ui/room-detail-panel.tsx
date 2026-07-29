import React, { useEffect, useState } from 'react'
import {
    CalendarDaysIcon,
    HistoryIcon,
    ListIcon,
    MapIcon,
    ReceiptTextIcon,
} from 'lucide-react'
import {
    Place,
    Room,
    addTripPlace,
    deleteTripPlace,
    startTripPlaceVote,
    respondTripPlaceVote,
    fromApiToPlace,
    apiStatusToPlaceStatus,
    getPlaceComments,
    addPlaceComment,
    deletePlaceComment,
    getPlaceCategories,
    updateTripPlaceCategory,
    type PlaceCategoryInfo,
    type ItineraryDay,
} from '@/entities/trip'
import { CommentSheet, useCommentStore } from '@/features/comment-place'
import { ExpensePanel } from '@/features/manage-expense'
import { InviteModal } from '@/features/invite-member'
import { fetchTripMembers, type TripMember } from '@/features/manage-trip'
import { PlaceSearch } from '@/features/search-place'
import type { PlaceSearchResult } from '@/features/search-place'
import { getApiErrorMessage } from '@/shared/api/client'
import { ActivityLogPanel } from './activity-log'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useNotificationStore } from '@/features/manage-notification'
import { DateVotePanel } from './date-vote-panel'
import { SchedulePanel } from './schedule-panel'
import { PlaceCard } from './place-card'
import { RecordPanel } from './record-panel'
import { RoomHeader } from './room-header'
import type { PlaceCommentResponse } from '@/entities/trip'

function mapApiComment(comment: PlaceCommentResponse) {
    return {
        id: String(comment.id),
        memberId: String(comment.memberId),
        text: comment.content,
        createdAt: comment.createdAt,
    }
}

type Mode = 'plan' | 'record'
type PlanTab = 'places' | 'itinerary' | 'schedule'
type RecordTab = 'records' | 'expenses'
export type TripRoomWorkspace = PlanTab | 'records' | 'expenses'

type Props = {
    room: Room
    places: Place[]
    selectedId: string | null
    onSelectPlace: (id: string) => void
    onBack: () => void
    onManage: () => void
    onUpdatePlace: (id: string, update: (place: Place) => Place) => void
    onAddPlace: (place: Place) => void
    onDeletePlace: (id: string) => void
    loadError?: string | null
    canManage: boolean
    tripId: number
    initialActivityOpen?: boolean
    onTripDatesChanged?: () => void
    onItineraryDaysLoaded?: (days: ItineraryDay[]) => void
    itineraryVersion?: number
    showBackButton?: boolean
    guestView?: boolean
    onJoin?: () => void
    onWorkspaceChange?: (workspace: TripRoomWorkspace) => void
}

export function RoomDetailPanel({
    room,
    places,
    selectedId,
    onSelectPlace,
    onBack,
    onManage,
    onUpdatePlace,
    onAddPlace,
    onDeletePlace,
    loadError,
    canManage,
    tripId,
    initialActivityOpen = false,
    onTripDatesChanged,
    onItineraryDaysLoaded,
    itineraryVersion = 0,
    showBackButton = true,
    guestView = false,
    onJoin,
    onWorkspaceChange,
}: Props) {
    const [mode, setMode] = useState<Mode>(
        room.lifecycleStatus === 'COMPLETED' ? 'record' : 'plan',
    )
    const [planTab, setPlanTab] = useState<PlanTab>('places')
    const [recordTab, setRecordTab] = useState<RecordTab>('records')
    const [activityOpen, setActivityOpen] = useState(initialActivityOpen)
    const [commentPlaceId, setCommentPlaceId] = useState<string | null>(null)
    const [commentError, setCommentError] = useState<string | null>(null)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [members, setMembers] = useState<TripMember[]>([])
    const isPublic = room.visibility === 'PUBLIC'
    const loadActivityLogs = useActivityLogStore(
        (state) => state.loadActivityLogs,
    )
    const loadNotifications = useNotificationStore(
        (state) => state.loadNotifications,
    )
    const [placeError, setPlaceError] = useState<string | null>(null)
    const [categoryError, setCategoryError] = useState<string | null>(null)
    const [dateAvailabilityDirty, setDateAvailabilityDirty] = useState(false)
    const [categoryState, setCategoryState] = useState<{
        tripId: number
        items: PlaceCategoryInfo[]
        loading: boolean
    }>({ tripId, items: [], loading: true })
    const categories =
        categoryState.tripId === tripId ? categoryState.items : []
    const categoriesLoading =
        categoryState.tripId !== tripId || categoryState.loading

    const activeWorkspace: TripRoomWorkspace =
        mode === 'plan' ? planTab : recordTab
    const activeWorkspaceInfo = {
        places: {
            eyebrow: '여행 계획',
            title: '장소',
            description: '가고 싶은 장소를 찾고 함께 의견을 모아보세요.',
        },
        itinerary: {
            eyebrow: '여행 계획',
            title: '날짜',
            description:
                '멤버들의 가능한 날짜를 확인하고 여행 기간을 정해보세요.',
        },
        schedule: {
            eyebrow: '여행 계획',
            title: '일정',
            description: '저장한 장소를 날짜와 방문 순서에 맞게 배치해보세요.',
        },
        records: {
            eyebrow: '여행 기록',
            title: '로그',
            description: '여행 중 남긴 사진과 메모를 한곳에서 확인해보세요.',
        },
        expenses: {
            eyebrow: '여행 기록',
            title: '정산',
            description: '멤버별 여행 경비와 정산 내역을 관리해보세요.',
        },
    }[activeWorkspace]

    useEffect(() => {
        onWorkspaceChange?.(activeWorkspace)
    }, [activeWorkspace, onWorkspaceChange])

    useEffect(() => {
        let active = true
        const loadMembers = async () => {
            try {
                const nextMembers = await fetchTripMembers(tripId)
                if (active) setMembers(nextMembers)
            } catch {
                if (active) setMembers([])
            }
        }
        void loadMembers()
        const intervalId = window.setInterval(() => void loadMembers(), 30_000)
        return () => {
            active = false
            window.clearInterval(intervalId)
        }
    }, [tripId])

    const canWrite = canManage
    const canPlanWrite = canWrite && room.lifecycleStatus !== 'COMPLETED'
    const commentPlace =
        places.find((place) => place.id === commentPlaceId) || null
    const { setComments, addComment, removeComment } = useCommentStore()

    useEffect(() => {
        const controller = new AbortController()
        getPlaceCategories(tripId, controller.signal)
            .then((nextCategories) => {
                setCategoryState({
                    tripId,
                    items: nextCategories,
                    loading: false,
                })
                setCategoryError(null)
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setCategoryState({ tripId, items: [], loading: false })
                setCategoryError(
                    getApiErrorMessage(
                        error,
                        '장소 카테고리를 불러오지 못했습니다.',
                    ),
                )
            })
        return () => controller.abort()
    }, [tripId])

    function refreshCollaborationData() {
        void loadActivityLogs(tripId)
        void loadNotifications()
    }

    function switchMode(nextMode: Mode) {
        const alreadyAtDefaultTab =
            nextMode === mode &&
            ((nextMode === 'plan' && planTab === 'places') ||
                (nextMode === 'record' && recordTab === 'records'))
        if (alreadyAtDefaultTab) return
        if (!confirmDiscardDateChanges()) return
        setMode(nextMode)
        if (nextMode === 'plan') setPlanTab('places')
        else setRecordTab('records')
    }

    function confirmDiscardDateChanges() {
        return (
            !dateAvailabilityDirty ||
            window.confirm(
                '저장하지 않은 가능 날짜가 있습니다. 이동하시겠습니까?',
            )
        )
    }

    function handleBack() {
        if (!confirmDiscardDateChanges()) return
        onBack()
    }

    async function withVoteError<T>(
        fn: () => Promise<T>,
        fallbackMessage: string,
    ): Promise<T> {
        setPlaceError(null)
        try {
            return await fn()
        } catch (error) {
            setPlaceError(getApiErrorMessage(error, fallbackMessage))
            throw error
        }
    }

    async function handleStartVote(id: string) {
        const voteSummary = await withVoteError(
            () => startTripPlaceVote(tripId, Number(id)),
            '투표 신청에 실패했습니다.',
        )
        if (voteSummary.placeStatus === 'REJECTED') {
            onDeletePlace(id)
            refreshCollaborationData()
            return
        }
        onUpdatePlace(id, (place) => ({
            ...place,
            status: apiStatusToPlaceStatus(voteSummary.placeStatus),
            voteSummary,
        }))
        refreshCollaborationData()
    }

    async function openCommentSheet(placeId: string) {
        setCommentError(null)
        setCommentPlaceId(placeId)
        try {
            const comments = (
                await getPlaceComments(tripId, Number(placeId))
            ).map(mapApiComment)
            setComments(placeId, comments)
            onUpdatePlace(placeId, (place) => ({
                ...place,
                comments,
                commentCount: comments.length,
            }))
        } catch (error) {
            setCommentError(
                getApiErrorMessage(error, '댓글을 불러오지 못했습니다.'),
            )
        }
    }

    async function handleAddComment(placeId: string, text: string) {
        setCommentError(null)
        try {
            const comment = await addPlaceComment(tripId, Number(placeId), text)
            const newComment = mapApiComment(comment)
            addComment(placeId, newComment)
            onUpdatePlace(placeId, (place) => ({
                ...place,
                comments: [...place.comments, newComment],
                commentCount: place.commentCount + 1,
            }))
            refreshCollaborationData()
        } catch (error) {
            setCommentError(
                getApiErrorMessage(error, '댓글 등록에 실패했습니다.'),
            )
            throw error
        }
    }

    async function handleDeleteComment(placeId: string, commentId: string) {
        setCommentError(null)
        try {
            await deletePlaceComment(tripId, Number(placeId), Number(commentId))
            removeComment(placeId, commentId)
            onUpdatePlace(placeId, (place) => ({
                ...place,
                comments: place.comments.filter((c) => c.id !== commentId),
                commentCount: Math.max(0, place.commentCount - 1),
            }))
            refreshCollaborationData()
        } catch (error) {
            setCommentError(
                getApiErrorMessage(error, '댓글 삭제에 실패했습니다.'),
            )
            throw error
        }
    }

    async function handleVote(id: string, value: 'up' | 'down') {
        const voteSummary = await withVoteError(
            () =>
                respondTripPlaceVote(
                    tripId,
                    Number(id),
                    value === 'up' ? 'AGREE' : 'DISAGREE',
                ),
            '투표 응답에 실패했습니다.',
        )
        if (voteSummary.placeStatus === 'REJECTED') {
            onDeletePlace(id)
            refreshCollaborationData()
            return
        }
        onUpdatePlace(id, (place) => ({
            ...place,
            status: apiStatusToPlaceStatus(voteSummary.placeStatus),
            voteSummary,
        }))
        refreshCollaborationData()
    }

    async function handleAdd(result: PlaceSearchResult) {
        setPlaceError(null)
        try {
            const tripPlace = await addTripPlace(tripId, result)
            onAddPlace(fromApiToPlace(tripPlace, room.id))
            refreshCollaborationData()
        } catch (error) {
            setPlaceError(
                getApiErrorMessage(error, '장소 추가에 실패했습니다.'),
            )
            throw error
        }
    }

    async function handleCategoryChange(placeId: string, categoryId: number) {
        setPlaceError(null)
        try {
            const updated = await updateTripPlaceCategory(
                tripId,
                Number(placeId),
                categoryId,
            )
            const mapped = fromApiToPlace(updated, room.id)
            onUpdatePlace(placeId, (place) => ({
                ...place,
                category: mapped.category,
                categoryId: mapped.categoryId,
                categoryName: mapped.categoryName,
                categoryColor: mapped.categoryColor,
                categoryIcon: mapped.categoryIcon,
            }))
            refreshCollaborationData()
        } catch (error) {
            setPlaceError(
                getApiErrorMessage(
                    error,
                    '장소 카테고리를 변경하지 못했습니다.',
                ),
            )
        }
    }

    function focusPlace(placeId: string) {
        setMode('plan')
        setPlanTab('places')

        onSelectPlace(placeId)
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <RoomHeader
                title={room.title}
                subtitle={`#${room.location} · ${room.date}`}
                isPublic={isPublic}
                canWrite={canWrite}
                members={members}
                onInvite={() => setInviteOpen(true)}
                onJoin={guestView ? onJoin : undefined}
                onBack={handleBack}
                onManage={onManage}
                showBackButton={showBackButton}
            />
            <div className="border-b border-slate-100 px-4 pb-3.5 pt-3.5">
                <div className="mb-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-extrabold tracking-[0.12em] text-brand-600">
                            {activeWorkspaceInfo.eyebrow}
                        </p>
                        <h2 className="mt-0.5 text-[22px] font-black leading-tight tracking-tight text-slate-900">
                            {activeWorkspaceInfo.title}
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                            {activeWorkspaceInfo.description}
                        </p>
                    </div>
                    <button
                        onClick={() => setActivityOpen((value) => !value)}
                        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${activityOpen ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        aria-label="전체 활동 로그 열기"
                    >
                        <HistoryIcon size={18} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-9 shrink-0 items-center rounded-lg bg-slate-100 p-1"
                        role="tablist"
                        aria-label="여행방 모드"
                    >
                        <button
                            onClick={() => switchMode('plan')}
                            role="tab"
                            aria-selected={mode === 'plan'}
                            className={`flex h-7 items-center rounded-md px-2.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand @min-[560px]:px-3 @min-[560px]:text-[13px] ${mode === 'plan' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'}`}
                        >
                            계획
                        </button>
                        <button
                            onClick={() => switchMode('record')}
                            role="tab"
                            aria-selected={mode === 'record'}
                            className={`flex h-7 items-center rounded-md px-2.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand @min-[560px]:px-3 @min-[560px]:text-[13px] ${mode === 'record' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'}`}
                        >
                            기록
                        </button>
                    </div>
                    <span
                        className="h-6 w-px shrink-0 bg-slate-200"
                        aria-hidden="true"
                    />
                    <div
                        className="flex min-w-0 flex-1 items-center gap-1"
                        role="tablist"
                        aria-label={`${mode === 'plan' ? '계획' : '기록'} 화면`}
                    >
                        {(mode === 'plan'
                            ? [
                                  {
                                      key: 'places' as const,
                                      label: '장소',
                                      icon: ListIcon,
                                  },
                                  {
                                      key: 'itinerary' as const,
                                      label: '날짜',
                                      icon: CalendarDaysIcon,
                                  },
                                  ...(room.startDate && room.endDate
                                      ? [
                                            {
                                                key: 'schedule' as const,
                                                label: '일정',
                                                icon: MapIcon,
                                            },
                                        ]
                                      : []),
                              ]
                            : [
                                  {
                                      key: 'records' as const,
                                      label: '로그',
                                      icon: HistoryIcon,
                                  },
                                  {
                                      key: 'expenses' as const,
                                      label: '정산',
                                      icon: ReceiptTextIcon,
                                  },
                              ]
                        ).map((item) => {
                            const active =
                                mode === 'plan'
                                    ? planTab === (item.key as PlanTab)
                                    : recordTab === (item.key as RecordTab)
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        if (active) return
                                        if (!confirmDiscardDateChanges()) return
                                        if (mode === 'plan') {
                                            setPlanTab(item.key as PlanTab)
                                        } else {
                                            setRecordTab(item.key as RecordTab)
                                        }
                                    }}
                                    role="tab"
                                    aria-selected={active}
                                    className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[13px] font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand @min-[560px]:px-3 @min-[560px]:text-sm ${active ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                                >
                                    <item.icon
                                        size={16}
                                        strokeWidth={active ? 2.5 : 2}
                                    />{' '}
                                    {item.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {mode === 'plan' && planTab === 'places' && (
                <>
                    <div className="border-b border-slate-100">
                        {canPlanWrite && <PlaceSearch onAdd={handleAdd} />}
                        {(loadError || categoryError || placeError) && (
                            <p
                                role="alert"
                                className="mx-3 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                            >
                                {placeError ?? categoryError ?? loadError}
                            </p>
                        )}
                    </div>
                    <div className="mp-scroll grid flex-1 auto-rows-max grid-cols-1 gap-2.5 overflow-y-auto px-3 py-3 @min-[760px]:grid-cols-2">
                        {places.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-400">
                                해당하는 장소가 없어요
                            </p>
                        ) : (
                            places.map((place) => (
                                <PlaceCard
                                    key={place.id}
                                    place={place}
                                    selected={selectedId === place.id}
                                    canWrite={canPlanWrite}
                                    onSelect={() => onSelectPlace(place.id)}
                                    onVote={(value) =>
                                        handleVote(place.id, value)
                                    }
                                    onStartVote={() =>
                                        handleStartVote(place.id)
                                    }
                                    onDelete={async () => {
                                        setPlaceError(null)
                                        try {
                                            await deleteTripPlace(
                                                tripId,
                                                Number(place.id),
                                            )
                                            onDeletePlace(place.id)
                                            refreshCollaborationData()
                                        } catch (error) {
                                            setPlaceError(
                                                getApiErrorMessage(
                                                    error,
                                                    '장소 삭제에 실패했습니다.',
                                                ),
                                            )
                                        }
                                    }}
                                    onOpenComments={() =>
                                        void openCommentSheet(place.id)
                                    }
                                    categories={categories}
                                    categoriesLoading={categoriesLoading}
                                    onCategoryChange={(categoryId) =>
                                        handleCategoryChange(
                                            place.id,
                                            categoryId,
                                        )
                                    }
                                />
                            ))
                        )}
                    </div>
                </>
            )}
            {mode === 'plan' && planTab === 'itinerary' && (
                <DateVotePanel
                    tripId={tripId}
                    canWrite={canPlanWrite}
                    onDirtyChange={setDateAvailabilityDirty}
                    onCollaborationChanged={refreshCollaborationData}
                    onTripDatesChanged={onTripDatesChanged}
                />
            )}
            {mode === 'plan' && planTab === 'schedule' && (
                <SchedulePanel
                    key={`schedule-${itineraryVersion}`}
                    tripId={tripId}
                    roomId={room.id}
                    places={places}
                    canWrite={canPlanWrite}
                    onDaysLoaded={onItineraryDaysLoaded}
                    onPlaceFocus={onSelectPlace}
                />
            )}
            {mode === 'record' && recordTab === 'records' && (
                <RecordPanel
                    tripId={tripId}
                    places={places}
                    canWrite={canWrite}
                    startDate={room.startDate}
                    endDate={room.endDate}
                    onPlaceClick={focusPlace}
                    onChanged={refreshCollaborationData}
                    guestView={guestView}
                />
            )}
            {mode === 'record' && recordTab === 'expenses' && (
                <ExpensePanel tripId={tripId} canWrite={canWrite} />
            )}
            {activityOpen && (
                <div className="absolute inset-0 z-40 flex flex-col bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <p className="text-xs font-bold text-brand-700">
                                GLOBAL
                            </p>
                            <h3 className="mt-0.5 text-sm font-extrabold">
                                전체 활동
                            </h3>
                        </div>
                        <button
                            onClick={() => setActivityOpen(false)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200"
                        >
                            닫기
                        </button>
                    </div>
                    <div className="mp-scroll flex-1 overflow-y-auto">
                        <ActivityLogPanel
                            tripId={room.apiTripId}
                            allowGuest={guestView}
                        />
                    </div>
                </div>
            )}
            {commentPlace && (
                <CommentSheet
                    place={commentPlace}
                    canWrite={canWrite}
                    error={commentError}
                    onClose={() => {
                        setCommentPlaceId(null)
                        setCommentError(null)
                    }}
                    onAddComment={(text) =>
                        handleAddComment(commentPlace.id, text)
                    }
                    onDeleteComment={(commentId) =>
                        handleDeleteComment(commentPlace.id, commentId)
                    }
                />
            )}
            {inviteOpen && room.apiTripId && (
                <InviteModal
                    tripId={room.apiTripId}
                    onClose={() => setInviteOpen(false)}
                />
            )}
        </div>
    )
}
