import React, { useMemo, useState } from 'react'
import {
    CalendarDaysIcon,
    HistoryIcon,
    ListIcon,
    ReceiptTextIcon,
} from 'lucide-react'
import {
    Expense,
    Place,
    PlaceCategory,
    PlaceStatus,
    Room,
    TravelRecord,
    addTripPlace,
    fromApiToPlace,
    TEMP_TRIP_ID,
} from '@/entities/trip'
import { CommentSheet } from '@/features/comment-place'
import { ExpensePanel } from '@/features/manage-expense'
import { InviteModal } from '@/features/invite-member'
import { PlaceSearch } from '@/features/search-place'
import type { PlaceSearchResult } from '@/features/search-place'
import { ActivityLogPanel } from './activity-log'
import { useCurrentUserStore } from '@/shared/model'
import { ItineraryPanel } from './itinerary-panel'
import { PlaceCard } from './place-card'
import { RecordPanel } from './record-panel'
import { RoomHeader } from './room-header'

type Mode = 'plan' | 'record'
type PlanTab = 'places' | 'itinerary'
type RecordTab = 'records' | 'expenses'

const STATUS_TABS: { key: PlaceStatus | 'all'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'candidate', label: '후보' },
    { key: 'saved', label: '확정' },
    { key: 'hold', label: '보류' },
]

type Props = {
    room: Room
    places: Place[]
    selectedId: string | null
    onSelectPlace: (id: string) => void
    onBack: () => void
    onManage: () => void
    isGuest: boolean
    onUpdatePlace: (id: string, update: (place: Place) => Place) => void
    onAddPlace: (place: Place) => void
    onDeletePlace: (id: string) => void
}

export function RoomDetailPanel({
    room,
    places,
    selectedId,
    onSelectPlace,
    onBack,
    onManage,
    isGuest,
    onUpdatePlace,
    onAddPlace,
    onDeletePlace,
}: Props) {
    const currentUserId = String(
        useCurrentUserStore((state) => state.currentUser?.id) ?? '',
    )
    const tripHasStarted = false
    const [records, setRecords] = useState<TravelRecord[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [mode, setMode] = useState<Mode>(() =>
        tripHasStarted ? 'record' : 'plan',
    )
    const [planTab, setPlanTab] = useState<PlanTab>('places')
    const [recordTab, setRecordTab] = useState<RecordTab>('records')
    const [statusFilter, setStatusFilter] = useState<PlaceStatus | 'all'>('all')
    const [activityOpen, setActivityOpen] = useState(false)
    const [commentPlaceId, setCommentPlaceId] = useState<string | null>(null)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [isPublic, setIsPublic] = useState(true)
    const canWrite = !isGuest && Boolean(currentUserId)
    const commentPlace =
        places.find((place) => place.id === commentPlaceId) || null
    const filtered = useMemo(
        () =>
            statusFilter === 'all'
                ? places
                : places.filter((place) => place.status === statusFilter),
        [places, statusFilter],
    )

    function switchMode(nextMode: Mode) {
        setMode(nextMode)
        if (nextMode === 'plan') setPlanTab('places')
        else setRecordTab('records')
    }

    function handleVote(id: string, value: 'up' | 'down') {
        onUpdatePlace(id, (place) => {
            const existing = place.votes.find(
                (vote) => vote.memberId === currentUserId,
            )
            const withoutMine = place.votes.filter(
                (vote) => vote.memberId !== currentUserId,
            )
            return {
                ...place,
                votes:
                    existing?.value === value
                        ? withoutMine
                        : [...withoutMine, { memberId: currentUserId, value }],
            }
        })
    }

    async function handleAdd(result: PlaceSearchResult) {
        try {
            const tripPlace = await addTripPlace(TEMP_TRIP_ID, result)
            onAddPlace(fromApiToPlace(tripPlace, room.id))
            addLog('후보 장소를 등록했어요', result.name)
        } catch {
            // TODO: 에러 토스트 추가
            console.error('장소 추가에 실패했습니다.')
        }
    }

    function focusPlace(placeId: string) {
        setMode('plan')
        setPlanTab('places')
        setStatusFilter('all')
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
                onBack={onBack}
                onManage={onManage}
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
                                  label: '일정',
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
                                onClick={() =>
                                    mode === 'plan'
                                        ? setPlanTab(item.key as PlanTab)
                                        : setRecordTab(item.key as RecordTab)
                                }
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
                        <div className="flex gap-1.5 overflow-x-auto px-3 py-2.5">
                            {STATUS_TABS.map((status) => {
                                const count =
                                    status.key === 'all'
                                        ? places.length
                                        : places.filter(
                                              (place) =>
                                                  place.status === status.key,
                                          ).length
                                return (
                                    <button
                                        key={status.key}
                                        onClick={() =>
                                            setStatusFilter(status.key)
                                        }
                                        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition ${statusFilter === status.key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {status.label} {count}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="mp-scroll flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
                        {filtered.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-400">
                                해당하는 장소가 없어요
                            </p>
                        ) : (
                            filtered.map((place) => (
                                <PlaceCard
                                    key={place.id}
                                    place={place}
                                    selected={selectedId === place.id}
                                    canWrite={canWrite}
                                    onSelect={() => onSelectPlace(place.id)}
                                    onVote={(value) =>
                                        handleVote(place.id, value)
                                    }
                                    onSave={() => {
                                        onUpdatePlace(place.id, (item) => ({
                                            ...item,
                                            status: 'saved',
                                        }))
                                    }}
                                    onHold={() => {
                                        onUpdatePlace(place.id, (item) => ({
                                            ...item,
                                            status: 'hold',
                                        }))
                                    }}
                                    onDelete={() => {
                                        onDeletePlace(place.id)
                                    }}
                                    onOpenComments={() =>
                                        setCommentPlaceId(place.id)
                                    }
                                />
                            ))
                        )}
                    </div>
                </>
            )}
            {mode === 'plan' && planTab === 'itinerary' && (
                <ItineraryPanel places={places} />
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
                <ExpensePanel
                    expenses={expenses}
                    canWrite={canWrite}
                    onAdd={(expense) => {
                        setExpenses((current) => [
                            { ...expense, id: `e${Date.now()}` },
                            ...current,
                        ])
                    }}
                />
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
                        <ActivityLogPanel tripId={room.backendId} />
                    </div>
                </div>
            )}
            {commentPlace && (
                <CommentSheet
                    place={commentPlace}
                    canWrite={canWrite}
                    onClose={() => setCommentPlaceId(null)}
                    onAddComment={(text) =>
                        onUpdatePlace(commentPlace.id, (place) => ({
                            ...place,
                            comments: [
                                ...place.comments,
                                {
                                    id: `c${Date.now()}`,
                                    memberId: currentUserId,
                                    text,
                                    createdAt: '방금',
                                },
                            ],
                        }))
                    }
                />
            )}
            {inviteOpen && room.backendId && (
                <InviteModal
                    tripId={room.backendId}
                    onClose={() => setInviteOpen(false)}
                />
            )}
        </div>
    )
}
