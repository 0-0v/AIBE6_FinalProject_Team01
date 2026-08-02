import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRightIcon, HistoryIcon, ListIcon, MapIcon } from 'lucide-react'
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
import { InviteModal } from '@/features/invite-member'
import { fetchTripMembers, type TripMember } from '@/features/manage-trip'
import { PlaceSearch } from '@/features/search-place'
import type {
    AiPlaceSearchRecommendation,
    PlaceSearchResult,
} from '@/features/search-place'
import { getApiErrorMessage } from '@/shared/api/client'
import { globalModal } from '@/shared/model'
import { UNSAVED_DATE_MODAL_COPY } from '../lib/unsaved-date-modal-copy'
import { ActivityLogPanel } from './activity-log'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useNotificationStore } from '@/features/manage-notification'
import { DateVotePanel } from './date-vote-panel'
import { SchedulePanel } from './schedule-panel'
import { PlaceCard } from './place-card'
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

function median(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle]
}

function resolvePlaceSearchCenter(room: Room, places: Place[]) {
    const destinationLat = room.destinationLat
    const destinationLng = room.destinationLng
    if (
        destinationLat != null &&
        destinationLng != null &&
        Number.isFinite(destinationLat) &&
        Number.isFinite(destinationLng)
    ) {
        return {
            latitude: destinationLat,
            longitude: destinationLng,
        }
    }

    const savedPlaces = places.filter(
        (place) =>
            place.status === 'saved' &&
            Number.isFinite(place.lat) &&
            Number.isFinite(place.lng),
    )
    const centerCandidates =
        savedPlaces.length > 0
            ? savedPlaces
            : places.filter(
                  (place) =>
                      Number.isFinite(place.lat) && Number.isFinite(place.lng),
              )
    if (centerCandidates.length === 0) {
        return { latitude: undefined, longitude: undefined }
    }

    return {
        latitude: median(centerCandidates.map((place) => place.lat)),
        longitude: median(centerCandidates.map((place) => place.lng)),
    }
}

type PlanTab = 'places' | 'itinerary' | 'schedule'
export type TripRoomWorkspace = PlanTab

type Props = {
    room: Room
    places: Place[]
    selectedId: string | null
    onSelectPlace: (id: string) => void
    onBack: () => void
    onManage: () => void
    onVisibilityManage: () => void
    onUpdatePlace: (id: string, update: (place: Place) => Place) => void
    onAddPlace: (place: Place) => void
    onDeletePlace: (id: string) => void
    loadError?: string | null
    canManage: boolean
    tripId: number
    initialActivityOpen?: boolean
    onTripDatesChanged?: () => void | Promise<void>
    onItineraryDaysLoaded?: (days: ItineraryDay[]) => void
    itineraryVersion?: number
    realtimeVersion?: number
    showBackButton?: boolean
    guestView?: boolean
    onJoin?: () => void
    onWorkspaceChange?: (workspace: TripRoomWorkspace) => void
    headerContainer?: HTMLElement | null
    aiPlaceRecommendations?: AiPlaceSearchRecommendation[] | null
}

export function RoomDetailPanel({
    room,
    places,
    selectedId,
    onSelectPlace,
    onBack,
    onManage,
    onVisibilityManage,
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
    realtimeVersion = 0,
    showBackButton = true,
    guestView = false,
    onJoin,
    onWorkspaceChange,
    headerContainer,
    aiPlaceRecommendations,
}: Props) {
    const [planTab, setPlanTab] = useState<PlanTab>('places')
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
    const placeSearchCenter = useMemo(
        () => resolvePlaceSearchCenter(room, places),
        [room, places],
    )

    const handlePhotoResolved = useCallback(
        (
            placeId: string,
            photoUrl: string,
            attribution: string | null,
            attributionUrl: string | null,
            sourceUrl: string,
        ) => {
            onUpdatePlace(placeId, (place) => ({
                ...place,
                image: photoUrl,
                photoAttribution: attribution,
                photoAttributionUrl: attributionUrl,
                photoSourceUrl: sourceUrl,
            }))
        },
        [onUpdatePlace],
    )

    const activeWorkspace: TripRoomWorkspace = planTab

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
    const hasConfirmedDates = Boolean(room.startDate && room.endDate)
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

    function requestDiscardDateChanges(onDiscard: () => void) {
        if (!dateAvailabilityDirty) {
            onDiscard()
            return
        }
        globalModal.open({
            ...UNSAVED_DATE_MODAL_COPY,
            showCancel: true,
            onConfirm: onDiscard,
        })
    }

    function handleBack() {
        requestDiscardDateChanges(onBack)
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
            const addedPlace = fromApiToPlace(tripPlace, room.id)
            onAddPlace(addedPlace)
            onSelectPlace(addedPlace.id)
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

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            {(() => {
                const header = (
                    <RoomHeader
                        title={room.title}
                        location={room.location}
                        date={room.date}
                        isPublic={isPublic}
                        isCompleted={room.lifecycleStatus === 'COMPLETED'}
                        canWrite={canWrite}
                        members={members}
                        onInvite={() => setInviteOpen(true)}
                        onJoin={guestView ? onJoin : undefined}
                        onBack={handleBack}
                        onManage={onManage}
                        onVisibilityManage={onVisibilityManage}
                        showBackButton={showBackButton}
                    />
                )

                return headerContainer
                    ? createPortal(header, headerContainer)
                    : header
            })()}
            <div className="border-b border-slate-100 px-4 pb-3.5 pt-6">
                <div className="mb-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[22px] font-black leading-8 tracking-tight text-slate-900">
                            Plan
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                            가고 싶은 장소를 찾고 함께 여행 계획을 준비해보세요.
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
                <div className="flex items-center">
                    <div
                        className="flex min-w-0 flex-1 items-center gap-1"
                        role="tablist"
                        aria-label="계획 화면"
                    >
                        {[
                            {
                                key: 'places' as const,
                                label: '장소',
                                icon: ListIcon,
                            },
                            {
                                key: 'schedule' as const,
                                label: '일정',
                                icon: MapIcon,
                            },
                        ].map((item) => {
                            const active =
                                item.key === 'schedule'
                                    ? planTab === 'itinerary' ||
                                      planTab === 'schedule'
                                    : planTab === item.key
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        if (active) return
                                        requestDiscardDateChanges(() => {
                                            setPlanTab(
                                                item.key === 'schedule' &&
                                                    !hasConfirmedDates
                                                    ? 'itinerary'
                                                    : item.key,
                                            )
                                        })
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

            {planTab !== 'places' && (
                <div className="border-b border-slate-100 px-6 py-4.5">
                    <nav
                        className="flex items-center gap-2 text-xs font-bold"
                        aria-label="일정 준비 단계"
                    >
                        <button
                            type="button"
                            onClick={() => setPlanTab('itinerary')}
                            className={
                                planTab === 'itinerary'
                                    ? 'text-brand-700'
                                    : 'text-slate-400 hover:text-slate-700'
                            }
                        >
                            날짜
                        </button>
                        <ChevronRightIcon
                            size={14}
                            className="text-slate-300"
                        />
                        <button
                            type="button"
                            disabled={!hasConfirmedDates}
                            onClick={() => setPlanTab('schedule')}
                            className={
                                planTab === 'schedule'
                                    ? 'text-brand-700'
                                    : hasConfirmedDates
                                      ? 'text-slate-400 hover:text-slate-700'
                                      : 'cursor-not-allowed text-slate-200'
                            }
                        >
                            일정
                        </button>
                    </nav>
                    <h3 className="mt-3 text-base font-extrabold text-slate-900">
                        {planTab === 'itinerary'
                            ? '멤버들의 가능한 날짜를 모아볼게요'
                            : '확정된 날짜에 맞춰 일정을 준비해요'}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {planTab === 'itinerary'
                            ? '가능 날짜를 눌러 투표해주세요'
                            : '저장한 장소를 날짜와 방문 순서에 맞게 배치해보세요'}
                    </p>
                </div>
            )}

            {planTab === 'places' && (
                <>
                    <div className="border-b border-slate-100">
                        {canPlanWrite && (
                            <PlaceSearch
                                onAdd={handleAdd}
                                location={room.location || undefined}
                                latitude={placeSearchCenter.latitude}
                                longitude={placeSearchCenter.longitude}
                                existingGooglePlaceIds={
                                    new Set(
                                        places
                                            .map((p) => p.googlePlaceId)
                                            .filter((id): id is string => !!id),
                                    )
                                }
                                aiRecommendations={aiPlaceRecommendations}
                            />
                        )}
                        {(loadError || categoryError || placeError) && (
                            <p
                                role="alert"
                                className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                            >
                                {placeError ?? categoryError ?? loadError}
                            </p>
                        )}
                    </div>
                    <div className="mp-scroll grid flex-1 auto-rows-max grid-cols-1 gap-2.5 overflow-y-auto px-4 py-3 @min-[760px]:grid-cols-2">
                        {places.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-400">
                                해당하는 장소가 없어요
                            </p>
                        ) : (
                            places.map((place) => (
                                <PlaceCard
                                    key={place.id}
                                    place={place}
                                    addedByNickname={
                                        members.find(
                                            (member) =>
                                                member.memberId ===
                                                Number(place.addedBy),
                                        )?.nickname
                                    }
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
                                    onPhotoResolved={handlePhotoResolved}
                                />
                            ))
                        )}
                    </div>
                </>
            )}
            {planTab === 'itinerary' && (
                <div className="m-4 flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-50/70">
                    <DateVotePanel
                        tripId={tripId}
                        canWrite={canPlanWrite}
                        onDirtyChange={setDateAvailabilityDirty}
                        onCollaborationChanged={refreshCollaborationData}
                        onTripDatesChanged={() => {
                            void Promise.resolve(onTripDatesChanged?.()).then(
                                () => setPlanTab('schedule'),
                            )
                        }}
                        realtimeVersion={realtimeVersion}
                    />
                </div>
            )}
            {planTab === 'schedule' && (
                <div className="m-4 flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-50/70">
                    <SchedulePanel
                        key={`schedule-${itineraryVersion}-${realtimeVersion}`}
                        tripId={tripId}
                        roomId={room.id}
                        places={places}
                        canWrite={canPlanWrite}
                        onDaysLoaded={onItineraryDaysLoaded}
                        onPlaceFocus={onSelectPlace}
                    />
                </div>
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
