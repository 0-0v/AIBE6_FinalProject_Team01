import React, { useMemo, useState } from 'react'
import {
    CalendarDaysIcon,
    HistoryIcon,
    ListIcon,
    ReceiptTextIcon,
    SparklesIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
    ActivityLog,
    Expense,
    Place,
    PlaceCategory,
    PlaceStatus,
    TravelRecord,
} from '../data/types'
import { currentUserId, initialLogs, initialPlaces } from '../data/mockData'
import { ActivityLogPanel } from '../components/room/ActivityLog'
import { AiAgentPanel } from '../components/room/AiAgentPanel'
import { CommentSheet } from '../components/room/CommentSheet'
import { ExpensePanel } from '../components/room/ExpensePanel'
import { InviteModal } from '../components/room/InviteModal'
import { ItineraryPanel } from '../components/room/ItineraryPanel'
import { MapCanvas } from '../components/room/MapCanvas'
import { PlaceCard } from '../components/room/PlaceCard'
import { PlaceSearch } from '../components/room/PlaceSearch'
import { RecordPanel } from '../components/room/RecordPanel'
import { RoomHeader } from '../components/room/RoomHeader'

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

export function TripRoom() {
    const navigate = useNavigate()
    // Replace this UI hook with the room's start-date calculation when trip metadata is connected.
    const tripHasStarted = false
    const [places, setPlaces] = useState<Place[]>(initialPlaces)
    const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
    const [records, setRecords] = useState<TravelRecord[]>(initialRecords)
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [mode, setMode] = useState<Mode>(() =>
        tripHasStarted ? 'record' : 'plan',
    )
    const [planTab, setPlanTab] = useState<PlanTab>('places')
    const [recordTab, setRecordTab] = useState<RecordTab>('records')
    const [statusFilter, setStatusFilter] = useState<PlaceStatus | 'all'>('all')
    const [aiOpen, setAiOpen] = useState(false)
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

    function updatePlace(id: string, update: (place: Place) => Place) {
        setPlaces((current) =>
            current.map((place) => (place.id === id ? update(place) : place)),
        )
    }

    function switchMode(nextMode: Mode) {
        setMode(nextMode)
        if (nextMode === 'plan') setPlanTab('places')
        else setRecordTab('records')
    }

    function handleVote(id: string, value: 'up' | 'down') {
        const target = places.find((place) => place.id === id)
        updatePlace(id, (place) => {
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
            cafe: initialPlaces[0].image,
            nature: initialPlaces[1].image,
            food: initialPlaces[2].image,
            attraction: initialPlaces[3].image,
            shopping: initialPlaces[4].image,
        }
        const place: Place = {
            id: `p${Date.now()}`,
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
        setPlaces((current) => [place, ...current])
        addLog('후보 장소를 등록했어요', result.name)
    }

    function focusPlace(placeId: string) {
        setMode('plan')
        setPlanTab('places')
        setStatusFilter('all')
        setSelectedId(placeId)
    }

    return (
        <div className="flex h-full w-full flex-col">
            <RoomHeader
                isPublic={isPublic}
                isOwner
                viewerMode={viewerMode}
                onTogglePublic={() => setIsPublic((value) => !value)}
                onToggleViewer={() => setViewerMode((value) => !value)}
                onInvite={() => setInviteOpen(true)}
                onBack={() => navigate('/app/room')}
            />
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="relative h-[34vh] min-h-[250px] min-w-0 flex-1 lg:h-auto">
                    <MapCanvas
                        places={places}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                    {!aiOpen && (
                        <button
                            onClick={() => setAiOpen(true)}
                            className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-[#5b32ea] px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-[#4825c7]"
                        >
                            <SparklesIcon size={17} /> AI로 지도 정리
                        </button>
                    )}
                </div>

                <aside className="relative flex min-h-0 w-full shrink-0 flex-1 flex-col border-t border-slate-200 bg-white lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                        <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold">
                            <button
                                onClick={() => switchMode('plan')}
                                className={`rounded-md px-1.5 py-1 transition ${mode === 'plan' ? 'bg-[#f4f1ff] text-[#5b32ea]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Plan
                            </button>
                            <span className="text-slate-300">/</span>
                            <button
                                onClick={() => switchMode('record')}
                                className={`rounded-md px-1.5 py-1 transition ${mode === 'record' ? 'bg-[#f4f1ff] text-[#5b32ea]' : 'text-slate-400 hover:text-slate-600'}`}
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
                                                ? setPlanTab(
                                                      item.key as PlanTab,
                                                  )
                                                : setRecordTab(
                                                      item.key as RecordTab,
                                                  )
                                        }
                                        role="tab"
                                        aria-selected={active}
                                        className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-extrabold transition ${active ? 'bg-[#5b32ea] text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                    >
                                        <item.icon size={14} /> {item.label}
                                    </button>
                                )
                            })}
                        </div>
                        <button
                            onClick={() => setActivityOpen((value) => !value)}
                            className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${activityOpen ? 'bg-[#f4f1ff] text-[#5b32ea]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
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
                                                          place.status ===
                                                          status.key,
                                                  ).length
                                        return (
                                            <button
                                                key={status.key}
                                                onClick={() =>
                                                    setStatusFilter(status.key)
                                                }
                                                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition ${statusFilter === status.key ? 'bg-[#5b32ea] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                                            onSelect={() =>
                                                setSelectedId(place.id)
                                            }
                                            onVote={(value) =>
                                                handleVote(place.id, value)
                                            }
                                            onSave={() => {
                                                updatePlace(
                                                    place.id,
                                                    (item) => ({
                                                        ...item,
                                                        status: 'saved',
                                                    }),
                                                )
                                                addLog(
                                                    '투표를 마치고 장소를 확정했어요',
                                                    place.name,
                                                )
                                            }}
                                            onHold={() => {
                                                updatePlace(
                                                    place.id,
                                                    (item) => ({
                                                        ...item,
                                                        status: 'hold',
                                                    }),
                                                )
                                                addLog(
                                                    '후보 장소를 보류했어요',
                                                    place.name,
                                                )
                                            }}
                                            onDelete={() => {
                                                setPlaces((current) =>
                                                    current.filter(
                                                        (item) =>
                                                            item.id !==
                                                            place.id,
                                                    ),
                                                )
                                                addLog(
                                                    '장소를 삭제했어요',
                                                    place.name,
                                                )
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
                                              (place) =>
                                                  place.id === record.placeId,
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
                                    <p className="text-xs font-bold text-[#5b32ea]">
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
                                            current.filter(
                                                (log) => log.id !== id,
                                            ),
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
                                updatePlace(commentPlace.id, (place) => ({
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
                </aside>
                {aiOpen && (
                    <AiAgentPanel
                        places={places}
                        onClose={() => setAiOpen(false)}
                        onApply={(suggestion) => {
                            if (suggestion.type === 'duplicate') {
                                setPlaces((current) =>
                                    current.filter(
                                        (place) => !place.duplicateOf,
                                    ),
                                )
                                addLog('중복 장소를 합쳤어요', 'AI 제안')
                            } else if (suggestion.type === 'category') {
                                addLog('미분류 장소를 정리했어요', 'AI 제안')
                            } else {
                                addLog('일정 초안을 생성했어요', 'AI 제안')
                            }
                        }}
                    />
                )}
            </div>
            {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
        </div>
    )
}
