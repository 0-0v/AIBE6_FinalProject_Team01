import React, { useState } from 'react'
import {
    CalendarDaysIcon,
    HistoryIcon,
    ListIcon,
    ReceiptTextIcon,
} from 'lucide-react'
import {
    Place,
    Room,
    TravelRecord,
    addTripPlace,
    deleteTripPlace,
    startTripPlaceVote,
    respondTripPlaceVote,
    fromApiToPlace,
    apiStatusToPlaceStatus,
    getPlaceComments,
    addPlaceComment,
    deletePlaceComment,
} from '@/entities/trip'
import { CommentSheet, useCommentStore } from '@/features/comment-place'
import { ExpensePanel } from '@/features/manage-expense'
import { InviteModal } from '@/features/invite-member'
import { PlaceSearch } from '@/features/search-place'
import type { PlaceSearchResult } from '@/features/search-place'
import { getApiErrorMessage } from '@/shared/api/client'
import { ActivityLogPanel } from './activity-log'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useNotificationStore } from '@/features/manage-notification'
import { useCurrentUserStore } from '@/shared/model'
import { ItineraryPanel } from './itinerary-panel'
import { PlaceCard } from './place-card'
import { RecordPanel } from './record-panel'
import { RoomHeader } from './room-header'

type Mode = 'plan' | 'record'
type PlanTab = 'places' | 'itinerary'
type RecordTab = 'records' | 'expenses'

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
}: Props) {
    const currentUserId = String(
        useCurrentUserStore((state) => state.currentUser?.id) ?? '',
    )
    const [records, setRecords] = useState<TravelRecord[]>([])
    const [mode, setMode] = useState<Mode>('plan')
    const [planTab, setPlanTab] = useState<PlanTab>('places')
    const [recordTab, setRecordTab] = useState<RecordTab>('records')
    const [activityOpen, setActivityOpen] = useState(initialActivityOpen)
    const [commentPlaceId, setCommentPlaceId] = useState<string | null>(null)
    const [commentError, setCommentError] = useState<string | null>(null)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [isPublic, setIsPublic] = useState(true)
    const loadActivityLogs = useActivityLogStore(
        (state) => state.loadActivityLogs,
    )
    const loadNotifications = useNotificationStore(
        (state) => state.loadNotifications,
    )
    const [placeError, setPlaceError] = useState<string | null>(null)
    const [dateAvailabilityDirty, setDateAvailabilityDirty] = useState(false)

    const canWrite = canManage
    const commentPlace =
        places.find((place) => place.id === commentPlaceId) || null
    const { setComments, addComment, removeComment } = useCommentStore()

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
            ).map((comment) => ({
                id: String(comment.id),
                memberId: String(comment.memberId),
                text: comment.content,
                createdAt: comment.createdAt,
            }))
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
            const newComment = {
                id: String(comment.id),
                memberId: String(comment.memberId),
                text: comment.content,
                createdAt: comment.createdAt,
            }
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
                isOwner={canWrite}
                canWrite={canWrite}
                onTogglePublic={() => setIsPublic((value) => !value)}
                onInvite={() => setInviteOpen(true)}
                onBack={() => {
                    if (confirmDiscardDateChanges()) onBack()
                }}
                onManage={() => {
                    if (confirmDiscardDateChanges()) onManage()
                }}
            />
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold">
                    <button
                        onClick={() => switchMode('plan')}
                        className={`rounded-md px-1.5 py-1 transition ${mode === 'plan' ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Plan
                    </button>
                    <span className="text-slate-300">/</span>
                    <button
                        onClick={() => switchMode('record')}
                        className={`rounded-md px-1.5 py-1 transition ${mode === 'record' ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Record
                    </button>
                </div>
                <span
                    className="h-4 w-px shrink-0 bg-slate-200"
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
                                className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-extrabold transition ${active ? 'bg-brand text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                            >
                                <item.icon size={14} /> {item.label}
                            </button>
                        )
                    })}
                </div>
                <button
                    onClick={() => setActivityOpen((value) => !value)}
                    className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${activityOpen ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    aria-label="전체 활동 로그 열기"
                >
                    <HistoryIcon size={17} />
                </button>
            </div>

            {mode === 'plan' && planTab === 'places' && (
                <>
                    <div className="border-b border-slate-100">
                        {canWrite && <PlaceSearch onAdd={handleAdd} />}
                        {(loadError || placeError) && (
                            <p
                                role="alert"
                                className="mx-3 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                            >
                                {placeError ?? loadError}
                            </p>
                        )}
                    </div>
                    <div className="mp-scroll flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
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
                                    canWrite={canWrite}
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
                                />
                            ))
                        )}
                    </div>
                </>
            )}
            {mode === 'plan' && planTab === 'itinerary' && (
                <ItineraryPanel
                    tripId={tripId}
                    canWrite={canWrite}
                    onDirtyChange={setDateAvailabilityDirty}
                    onCollaborationChanged={refreshCollaborationData}
                />
            )}
            {mode === 'record' && recordTab === 'records' && (
                <RecordPanel
                    records={records}
                    places={places}
                    canWrite={canWrite}
                    onAdd={(record) => {
                        setRecords((current) => [
                            {
                                ...record,
                                id: `r${Date.now()}`,
                                memberId: currentUserId,
                                createdAt: new Date().toISOString(),
                            },
                            ...current,
                        ])
                    }}
                    onPlaceClick={focusPlace}
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
                        <ActivityLogPanel tripId={room.apiTripId} />
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
