import React, { useMemo, useState } from 'react'
import {
    CalendarDaysIcon,
    HistoryIcon,
    ListIcon,
    ReceiptTextIcon,
} from 'lucide-react'
import {
    ActivityLog,
    Expense,
    Place,
    PlaceCategory,
    PlaceStatus,
    Room,
    TravelRecord,
} from '../../data/types'
import { currentUserId, initialLogs } from '../../data/mockData'
import { ActivityLogPanel } from './ActivityLog'
import { CommentSheet } from './CommentSheet'
import { ExpensePanel } from './ExpensePanel'
import { InviteModal } from './InviteModal'
import { ItineraryPanel } from './ItineraryPanel'
import { PlaceCard } from './PlaceCard'
import { PlaceSearch } from './PlaceSearch'
import { RecordPanel } from './RecordPanel'
import { RoomHeader } from './RoomHeader'

type Mode = 'plan' | 'record'
type PlanTab = 'places' | 'itinerary'
type RecordTab = 'records' | 'expenses'

const STATUS_TABS: { key: PlaceStatus | 'all'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'candidate', label: '후보' },
    { key: 'saved', label: '확정' },
    { key: 'hold', label: '보류' },
]

const initialRecords: TravelRecord[] = [
    {
        id: 'r1',
        memberId: 'm3',
        day: 1,
        time: '15:42',
        createdAt: '2026-08-12T15:42:00',
        memo: '협재에서 본 바다색이 정말 예뻤어요. 다음에는 노을 시간에 다시 오고 싶다 🌊',
        placeId: 'p2',
        images: [
            '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
            '/trip-record-2.png',
        ],
    },
    {
        id: 'r2',
        memberId: 'm2',
        day: 1,
        time: '12:18',
        createdAt: '2026-08-12T12:18:00',
        memo: '드디어 고기국수! 웨이팅은 있었지만 만족.',
        placeId: 'p3',
        images: ['/67984159-ee93-4d51-aadd-43522138b92a.jpg'],
    },
]

const initialExpenses: Expense[] = [
    {
        id: 'e1',
        title: '렌터카 비용',
        amount: 180000,
        date: '8월 12일',
        paidBy: 'm1',
        participantCount: 4,
    },
    {
        id: 'e2',
        title: '숙소 예약금',
        amount: 100000,
        date: '8월 10일',
        paidBy: 'm2',
        participantCount: 4,
    },
    {
        id: 'e3',
        title: '점심 식사',
        amount: 40000,
        date: '8월 12일',
        paidBy: 'm3',
        participantCount: 4,
    },
]

type Props = {
    room: Room
    places: Place[]
    selectedId: string | null
    onSelectPlace: (id: string) => void
    onBack: () => void
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
    onUpdatePlace,
    onAddPlace,
    onDeletePlace,
}: Props) {
    const tripHasStarted = false
    const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
    const [records, setRecords] = useState<TravelRecord[]>(initialRecords)
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
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
    const [viewerMode, setViewerMode] = useState(false)

    const canWrite = !viewerMode
    const commentPlace =
        places.find((place) => place.id === commentPlaceId) || null
    const filtered = useMemo(
        () =>
            statusFilter === 'all'
                ? places
                : places.filter((place) => place.status === statusFilter),
        [places, statusFilter],
    )

    function addLog(action: string, target: string, undoable = true) {
        setLogs((current) => [
            {
                id: `l${Date.now()}`,
                memberId: currentUserId,
                action,
                target,
                createdAt: '방금',
                undoable,
            },
            ...current,
        ])
    }

    function switchMode(nextMode: Mode) {
        setMode(nextMode)
        if (nextMode === 'plan') setPlanTab('places')
        else setRecordTab('records')
    }

    function handleVote(id: string, value: 'up' | 'down') {
        const target = places.find((place) => place.id === id)
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
        if (target)
            addLog(
                value === 'up'
                    ? '후보 장소에 찬성했어요'
                    : '후보 장소에 반대했어요',
                target.name,
                false,
            )
    }

    function handleAdd(result: {
        name: string
        address: string
        category: PlaceCategory
    }) {
        const images: Record<PlaceCategory, string> = {
            cafe: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
            nature: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
            food: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
            attraction: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
            shopping: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
        }
        const place: Place = {
            id: `p${Date.now()}`,
            roomId: room.id,
            name: result.name,
            address: result.address,
            category: result.category,
            status: 'candidate',
            image: images[result.category],
            lat: 30 + Math.random() * 50,
            lng: 25 + Math.random() * 55,
            addedBy: currentUserId,
            votes: [],
            comments: [],
        }
        onAddPlace(place)
        addLog('후보 장소를 등록했어요', result.name)
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
                isOwner
                viewerMode={viewerMode}
                onTogglePublic={() => setIsPublic((value) => !value)}
                onToggleViewer={() => setViewerMode((value) => !value)}
                onInvite={() => setInviteOpen(true)}
                onBack={onBack}
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
                    {logs.length > 0 && (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
                    )}
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
                                        addLog(
                                            '투표를 마치고 장소를 확정했어요',
                                            place.name,
                                        )
                                    }}
                                    onHold={() => {
                                        onUpdatePlace(place.id, (item) => ({
                                            ...item,
                                            status: 'hold',
                                        }))
                                        addLog(
                                            '후보 장소를 보류했어요',
                                            place.name,
                                        )
                                    }}
                                    onDelete={() => {
                                        onDeletePlace(place.id)
                                        addLog('장소를 삭제했어요', place.name)
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
                        addLog(
                            '여행 기록을 남겼어요',
                            record.placeId
                                ? places.find(
                                      (place) => place.id === record.placeId,
                                  )?.name || '여행 기록'
                                : '여행 기록',
                        )
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
                        addLog('지출을 추가했어요', expense.title)
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
                        <ActivityLogPanel
                            logs={logs}
                            onUndo={(id) =>
                                setLogs((current) =>
                                    current.filter((log) => log.id !== id),
                                )
                            }
                        />
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
            {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
        </div>
    )
}
