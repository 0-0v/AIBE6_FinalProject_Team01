# Schedule Kanban Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여행방 일정 탭에 "전체 보기" 버튼을 추가하고, 클릭하면 `/app/room/:roomId/schedule` 전용 페이지에서 Kanban Board로 일정을 관리할 수 있게 한다.

**Architecture:** 기존 사이드패널 `schedule-panel.tsx`는 그대로 유지하고, 새 전용 페이지(`schedule-kanban-page.tsx`)를 `views` 레이어에 추가한다. Kanban 레이아웃 전용 `kanban-schedule-panel.tsx`를 `widgets` 레이어에 생성하고, 공용 `place-shelf.tsx` 컴포넌트를 하단 서랍으로 함께 만든다. React Router DOM에 새 라우트를 추가하고, 기존 `schedule-panel.tsx`에 페이지 이동 버튼 하나만 삽입한다.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, @dnd-kit/core, @dnd-kit/sortable, React Router DOM v6

## Global Constraints

- FSD 레이어 규칙: `app → views → widgets → features → entities → shared` — 하위 레이어가 상위 레이어를 import 금지
- `npx tsc --noEmit` 에러 없어야 함
- 기존 `schedule-panel.tsx`, `day-column.tsx`, `schedule-item-card.tsx` 로직 변경 없음 (버튼 추가만 허용)
- 기존 API 함수 시그니처 변경 없음
- `'use client'` 는 클라이언트 컴포넌트에만 사용
- Tailwind CSS만 사용, 동적 색상(categoryColor)에만 인라인 style 허용
- 모든 UI 텍스트는 한국어

---

## File Map

| 역할 | 파일 | 변경 유형 |
|------|------|-----------|
| 하단 장소 서랍 | `frontend/src/widgets/trip-room/ui/place-shelf.tsx` | **신규** |
| Kanban DnD 보드 | `frontend/src/widgets/trip-room/ui/kanban-schedule-panel.tsx` | **신규** |
| 전용 Kanban 페이지 | `frontend/src/views/trip-room/ui/schedule-kanban-page.tsx` | **신규** |
| 기존 일정 탭 — 링크 버튼 추가 | `frontend/src/widgets/trip-room/ui/schedule-panel.tsx` | **수정** (버튼 1개) |
| 라우트 등록 | `frontend/src/app/_bootstrap/spa-app.tsx` | **수정** (Route 1줄) |
| widgets 공개 API | `frontend/src/widgets/trip-room/index.ts` | **수정** (export 추가) |
| views 공개 API | `frontend/src/views/trip-room/index.ts` | **수정** (export 추가) |

---

## Task 1: Kanban UI 컴포넌트 — PlaceShelf + KanbanSchedulePanel

**Files:**
- Create: `frontend/src/widgets/trip-room/ui/place-shelf.tsx`
- Create: `frontend/src/widgets/trip-room/ui/kanban-schedule-panel.tsx`
- Modify: `frontend/src/widgets/trip-room/index.ts`

**Interfaces:**
- Produces:
  ```tsx
  // place-shelf.tsx
  export function PlaceShelf(props: {
      places: Place[]
      days: ItineraryDay[]
      canWrite: boolean
      onAddToDay: (placeId: string, dayId: string) => void
  }): JSX.Element

  // kanban-schedule-panel.tsx
  export function KanbanSchedulePanel(props: {
      tripId: number
      places: Place[]
      canWrite: boolean
  }): JSX.Element
  ```

---

- [ ] **Step 1: `place-shelf.tsx` 생성**

```tsx
'use client'

import React, { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, Place } from '@/entities/trip'

type PlaceChipProps = {
    place: Place
    days: ItineraryDay[]
    onAddToDay: (placeId: string, dayId: string) => void
}

function PlaceChip({ place, days, onAddToDay }: PlaceChipProps) {
    const [showPicker, setShowPicker] = useState(false)
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `place-${place.id}`,
        data: { placeId: place.id },
    })

    return (
        <div
            ref={setNodeRef}
            className={`relative flex shrink-0 items-center rounded-full border bg-white shadow-sm transition-opacity ${isDragging ? 'opacity-30' : ''}`}
            style={place.categoryColor ? { borderColor: place.categoryColor + '60' } : { borderColor: '#e2e8f0' }}
        >
            <div
                {...listeners}
                {...attributes}
                className="flex cursor-grab items-center gap-1 rounded-l-full py-1 pl-2.5 pr-1.5 active:cursor-grabbing"
                style={{ color: place.categoryColor ?? '#64748b' }}
            >
                {place.categoryIcon && (
                    <CategoryIcon icon={place.categoryIcon} size={11} strokeWidth={2.5} />
                )}
                <span className="max-w-[120px] truncate text-xs font-medium">{place.name}</span>
            </div>
            <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="flex h-full items-center rounded-r-full border-l py-1 pl-1.5 pr-2 text-[10px] font-bold transition hover:bg-slate-50"
                style={{
                    borderColor: place.categoryColor ? place.categoryColor + '40' : '#e2e8f0',
                    color: place.categoryColor ?? '#94a3b8',
                }}
                title="Day 선택해서 추가"
            >
                +
            </button>
            {showPicker && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                    <div className="absolute bottom-full left-0 z-50 mb-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            추가할 Day 선택
                        </p>
                        <div className="max-h-44 overflow-y-auto">
                            {days.map((day) => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => { onAddToDay(place.id, String(day.id)); setShowPicker(false) }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                >
                                    <span className="text-xs font-bold text-brand">Day {day.dayNumber}</span>
                                    <span className="truncate text-[10px] text-slate-400">
                                        {new Date(day.itineraryDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                                    </span>
                                    {day.items.length > 0 && (
                                        <span className="ml-auto shrink-0 text-[10px] text-slate-300">{day.items.length}개</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

type Props = {
    places: Place[]
    days: ItineraryDay[]
    canWrite: boolean
    onAddToDay: (placeId: string, dayId: string) => void
}

export function PlaceShelf({ places, days, canWrite, onAddToDay }: Props) {
    const [open, setOpen] = useState(true)

    return (
        <div className="shrink-0 border-t border-slate-100 bg-white">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
            >
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">배치 대기</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {places.length}
                </span>
                {canWrite && places.length > 0 && (
                    <span className="text-[10px] font-normal normal-case text-slate-300">
                        · 드래그하거나 + 버튼으로 추가
                    </span>
                )}
                <span className="ml-auto text-slate-400">
                    {open ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
                </span>
            </button>
            {open && (
                <div className="px-4 pb-3">
                    {places.length === 0 ? (
                        <p className="py-1 text-xs text-slate-400">모든 장소가 일정에 배치됐어요 🎉</p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {places.map((place) =>
                                canWrite ? (
                                    <PlaceChip key={place.id} place={place} days={days} onAddToDay={onAddToDay} />
                                ) : (
                                    <div
                                        key={place.id}
                                        className="flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium"
                                        style={
                                            place.categoryColor
                                                ? { borderColor: place.categoryColor + '60', color: place.categoryColor }
                                                : { borderColor: '#e2e8f0', color: '#64748b' }
                                        }
                                    >
                                        {place.categoryIcon && (
                                            <CategoryIcon icon={place.categoryIcon} size={11} strokeWidth={2.5} />
                                        )}
                                        {place.name}
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: `kanban-schedule-panel.tsx` 생성**

```tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core'
import {
    addItineraryItem,
    getItinerary,
    moveItineraryItem,
    reorderItineraryItems,
    CategoryIcon,
} from '@/entities/trip'
import type { ItineraryDay, Place } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { DayColumn } from './day-column'
import { PlaceShelf } from './place-shelf'

type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
}

export function KanbanSchedulePanel({ tripId, places, canWrite }: Props) {
    const [days, setDays] = useState<ItineraryDay[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dndError, setDndError] = useState<string | null>(null)
    const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    )

    const savedPlaces = places.filter((p) => p.status === 'saved')
    const scheduledTripPlaceIds = new Set(
        days.flatMap((d) =>
            d.items.map((i) => i.tripPlaceId).filter((id) => id !== null).map(String),
        ),
    )
    const unscheduledPlaces = savedPlaces.filter(
        (p) => !scheduledTripPlaceIds.has(String(p.id)),
    )

    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    const loadDays = useCallback(async () => {
        try {
            const fetched = await getItinerary(tripId)
            if (!mountedRef.current) return
            setDays(fetched)
            setError(null)
        } catch (err) {
            if (!mountedRef.current) return
            setError(getApiErrorMessage(err, '일정을 불러오지 못했습니다.'))
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }, [tripId])

    useEffect(() => {
        let active = true
        getItinerary(tripId)
            .then((fetched) => {
                if (!active || !mountedRef.current) return
                setDays(fetched)
                setError(null)
            })
            .catch((err: unknown) => {
                if (!active || !mountedRef.current) return
                setError(getApiErrorMessage(err, '일정을 불러오지 못했습니다.'))
            })
            .finally(() => { if (active && mountedRef.current) setLoading(false) })
        return () => { active = false }
    }, [tripId])

    async function addPlaceToDay(placeId: string, dayId: string) {
        const targetDay = days.find((d) => String(d.id) === dayId)
        if (!targetDay) return
        try {
            await addItineraryItem(tripId, Number(dayId), Number(placeId), targetDay.items.length)
            const updated = await getItinerary(tripId)
            setDays(updated)
        } catch (err) {
            setDndError(getApiErrorMessage(err, '일정에 추가하지 못했습니다.'))
        }
    }

    function findDayById(id: string): ItineraryDay | undefined {
        return days.find((d) => String(d.id) === id)
    }

    function findDayContainingItem(itemId: string): ItineraryDay | undefined {
        return days.find((d) => d.items.some((i) => String(i.id) === itemId))
    }

    function resolveTargetDay(overId: string): ItineraryDay | undefined {
        return findDayById(overId) ?? findDayContainingItem(overId)
    }

    function handleDragStart(event: DragStartEvent) {
        setIsDragging(true)
        const id = String(event.active.id)
        if (id.startsWith('place-')) setActivePlaceId(id.replace('place-', ''))
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setIsDragging(false)
        setActivePlaceId(null)
        setDndError(null)
        if (!over) return

        const activeId = String(active.id)
        const overId = String(over.id)

        if (activeId.startsWith('place-')) {
            const placeId = activeId.replace('place-', '')
            const targetDay = resolveTargetDay(overId)
            if (!targetDay) return
            await addPlaceToDay(placeId, String(targetDay.id))
            return
        }

        const sourceDayId = String(active.data.current?.sortable?.containerId ?? '')
        const targetDay = resolveTargetDay(overId)
        if (!targetDay) return
        const targetDayId = String(targetDay.id)

        if (sourceDayId === targetDayId) {
            const sourceDay = findDayById(sourceDayId)
            if (!sourceDay) return
            const oldIndex = sourceDay.items.findIndex((i) => String(i.id) === activeId)
            const newIndex = sourceDay.items.findIndex((i) => String(i.id) === overId)
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

            const newItems = [...sourceDay.items]
            const [moved] = newItems.splice(oldIndex, 1)
            newItems.splice(newIndex, 0, moved)
            setDays((prev) =>
                prev.map((d) => String(d.id) === sourceDayId ? { ...d, items: newItems } : d),
            )
            try {
                await reorderItineraryItems(tripId, Number(sourceDayId), newItems.map((i) => Number(i.id)))
                const updated = await getItinerary(tripId)
                setDays(updated)
            } catch (err) {
                await loadDays()
                setDndError(getApiErrorMessage(err, '순서 변경에 실패했습니다.'))
            }
        } else {
            try {
                await moveItineraryItem(tripId, Number(activeId), Number(targetDayId), targetDay.items.length)
                const updated = await getItinerary(tripId)
                setDays(updated)
            } catch (err) {
                setDndError(getApiErrorMessage(err, '이동에 실패했습니다.'))
            }
        }
    }

    const activePlaceForOverlay = activePlaceId ? places.find((p) => p.id === activePlaceId) : null

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                일정 불러오는 중...
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
            </div>
        )
    }

    if (days.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                여행 날짜를 먼저 확정해주세요.
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={(e) => void handleDragEnd(e)}
        >
            <div className="flex min-h-0 flex-1 flex-col">
                {dndError && (
                    <div className="shrink-0 px-4 pt-2">
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{dndError}</p>
                    </div>
                )}

                {/* Kanban Board — 수평 스크롤 */}
                <div className="mp-scroll flex flex-1 gap-4 overflow-x-auto overflow-y-auto px-4 py-4">
                    {days.map((day) => (
                        <div key={day.id} className="w-72 shrink-0">
                            <DayColumn
                                day={day}
                                tripId={tripId}
                                canWrite={canWrite}
                                days={days}
                                isDragging={isDragging}
                                unscheduledPlaces={unscheduledPlaces}
                                onAddPlace={(placeId) => void addPlaceToDay(placeId, String(day.id))}
                                onDaysChange={setDays}
                            />
                        </div>
                    ))}
                </div>

                {/* 배치 대기 서랍 */}
                <PlaceShelf
                    places={unscheduledPlaces}
                    days={days}
                    canWrite={canWrite}
                    onAddToDay={(placeId, dayId) => void addPlaceToDay(placeId, dayId)}
                />
            </div>

            <DragOverlay>
                {activePlaceForOverlay ? (
                    <div
                        className="flex cursor-grabbing items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-lg"
                        style={
                            activePlaceForOverlay.categoryColor
                                ? { borderColor: activePlaceForOverlay.categoryColor, color: activePlaceForOverlay.categoryColor }
                                : undefined
                        }
                    >
                        {activePlaceForOverlay.categoryIcon && (
                            <CategoryIcon icon={activePlaceForOverlay.categoryIcon} size={11} strokeWidth={2.5} />
                        )}
                        {activePlaceForOverlay.name}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
```

- [ ] **Step 3: `widgets/trip-room/index.ts`에 export 추가**

파일 끝에 두 줄 추가:

```ts
export { KanbanSchedulePanel } from './ui/kanban-schedule-panel'
export { PlaceShelf } from './ui/place-shelf'
```

- [ ] **Step 4: TypeScript 검증**

```bash
cd /Users/heungjun/AIBE6/AIBE6_FinalProject_Team01/frontend && npx tsc --noEmit
```

Expected: 에러 없음

---

## Task 2: 페이지 + 라우트 + 링크 버튼 연결

**Files:**
- Create: `frontend/src/views/trip-room/ui/schedule-kanban-page.tsx`
- Modify: `frontend/src/views/trip-room/index.ts`
- Modify: `frontend/src/app/_bootstrap/spa-app.tsx`
- Modify: `frontend/src/widgets/trip-room/ui/schedule-panel.tsx`

**Interfaces:**
- Consumes:
  - `KanbanSchedulePanel` from `@/widgets/trip-room` (Task 1)
  - `useTripStore` from `@/features/manage-trip`
  - `getTripPlaces`, `getTripPlaceVotes`, `getTripPlaceAccess`, `fromApiToPlace` from `@/entities/trip`
  - `useParams`, `useNavigate`, `Link` from `react-router-dom`
- Produces: `ScheduleKanbanPage` React component (no props — reads roomId from URL)

---

- [ ] **Step 1: `schedule-kanban-page.tsx` 생성**

```tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    fromApiToPlace,
    getTripPlaceAccess,
    getTripPlaceVotes,
    getTripPlaces,
    type Place,
} from '@/entities/trip'
import { useCommentStore } from '@/features/comment-place'
import { useTripStore } from '@/features/manage-trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { KanbanSchedulePanel } from '@/widgets/trip-room'

export function ScheduleKanbanPage() {
    const { roomId } = useParams<{ roomId: string }>()
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isUserInitialized = useCurrentUserStore((state) => state.isInitialized)
    const { rooms, isLoading, loadTrips } = useTripStore()

    const room = rooms.find((r) => r.id === roomId)
    const tripId = room?.apiTripId

    const [places, setPlaces] = useState<Place[]>([])
    const [canManage, setCanManage] = useState(false)
    const [placesError, setPlacesError] = useState<string | null>(null)

    // trips 미로드 상태에서 직접 접근한 경우 로드
    useEffect(() => {
        if (!isUserInitialized) return
        if (currentUser && rooms.length === 0) void loadTrips()
    }, [currentUser, isUserInitialized, rooms.length, loadTrips])

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
                const votesByPlaceId = new Map(
                    voteSummaries.map((vote) => [vote.tripPlaceId, vote]),
                )
                const cachedComments = useCommentStore.getState().commentsByPlaceId
                setPlaces(
                    tripPlaces
                        .filter((tp) => votesByPlaceId.get(tp.tripPlaceId)?.placeStatus !== 'REJECTED')
                        .map((tp) => {
                            const place = fromApiToPlace(tp, room.id, votesByPlaceId.get(tp.tripPlaceId))
                            return { ...place, comments: cachedComments[place.id] ?? place.comments }
                        }),
                )
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return
                setPlaces([])
                setCanManage(false)
                setPlacesError(getApiErrorMessage(err, '장소를 불러오지 못했습니다.'))
            })
        return () => controller.abort()
    }, [room?.id, tripId])

    const canPlanWrite = canManage && room?.lifecycleStatus !== 'COMPLETED'

    // 로딩 중
    if (!isUserInitialized || isLoading) {
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
                <p className="text-sm text-slate-400">여행방을 찾을 수 없습니다.</p>
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
                <h1 className="truncate text-sm font-bold text-slate-800">{room.title}</h1>
                <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                    일정 보드
                </span>
                {placesError && (
                    <p className="ml-auto text-xs text-red-500">{placesError}</p>
                )}
            </header>

            {/* Kanban 보드 */}
            <KanbanSchedulePanel
                tripId={tripId}
                places={places}
                canWrite={canPlanWrite}
            />
        </div>
    )
}
```

- [ ] **Step 2: `views/trip-room/index.ts`에 export 추가**

```ts
export { TripRoom } from './ui/trip-room-page'
export { ScheduleKanbanPage } from './ui/schedule-kanban-page'
```

- [ ] **Step 3: `spa-app.tsx`에 라우트 추가**

`spa-app.tsx` 상단 import에 `ScheduleKanbanPage` 추가:

```tsx
import { TripRoom, ScheduleKanbanPage } from '@/views/trip-room'
```

Routes 안에 기존 `room/:roomId?` 라우트 **앞에** 추가 (더 구체적인 경로가 먼저):

```tsx
<Route path="room/:roomId/schedule" element={<ScheduleKanbanPage />} />
<Route path="room/:roomId?" element={<TripRoom />} />
<Route path="room/invite/:inviteCode" element={<TripRoom />} />
```

- [ ] **Step 4: `schedule-panel.tsx`에 "전체 보기" 버튼 추가**

`schedule-panel.tsx` 상단 import에 추가:

```tsx
import { useNavigate, useParams } from 'react-router-dom'
```

`SchedulePanel` 컴포넌트 함수 본문 맨 위(useState 선언들 아래)에 추가:

```tsx
const { roomId } = useParams<{ roomId?: string }>()
const navigate = useNavigate()
```

Days 목록을 감싸는 `<div className="mp-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3">` 바로 위에 삽입:

```tsx
{/* Kanban 전체 보기 링크 */}
{roomId && (
    <div className="shrink-0 flex justify-end px-3 pt-2">
        <button
            type="button"
            onClick={() => navigate(`/app/room/${roomId}/schedule`)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/10"
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            보드로 보기
        </button>
    </div>
)}
```

- [ ] **Step 5: TypeScript 검증**

```bash
cd /Users/heungjun/AIBE6/AIBE6_FinalProject_Team01/frontend && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 브라우저 수동 검증**

1. 여행방 → 일정 탭 진입
2. "보드로 보기" 버튼 클릭 → `/app/room/:roomId/schedule` 로 이동 확인
3. Kanban 페이지에서 Day 컬럼들이 수평으로 나열되는지 확인
4. "돌아가기" 클릭 시 여행방으로 복귀 확인
5. 서랍의 장소 칩 드래그 → Day 컬럼 드롭 → 일정 추가 확인
6. Day 헤더 `+` 버튼 → 장소 팝오버 → 선택 → 추가 확인
7. 아이템 간 드래그로 순서 변경 및 Day 간 이동 확인
8. 확정 버튼(✓ 아이콘) 클릭으로 CONFIRMED 전환 확인

---

## Self-Review

### Spec coverage

| 요구사항 | 구현 위치 |
|----------|-----------|
| 사이드패널 일정 탭에 링크 버튼 | Task 2 Step 4 (schedule-panel.tsx) |
| 전용 Kanban 페이지 라우트 `/app/room/:roomId/schedule` | Task 2 Step 3 (spa-app.tsx) |
| 페이지에서 Kanban Board UI | Task 1 Step 2 (kanban-schedule-panel.tsx) |
| 하단 장소 서랍 | Task 1 Step 1 (place-shelf.tsx) |
| "돌아가기" 버튼 → 여행방 복귀 | Task 2 Step 1 (schedule-kanban-page.tsx) |
| 장소 추가(드래그/+ 버튼) | Task 1 (DayColumn 재사용) |
| 권한 체크 (canWrite) | Task 2 Step 1 (canPlanWrite) |
| 게스트/비로그인 처리 | Task 2 Step 1 (room not found fallback) |

### Placeholder 스캔: 없음 ✅

### Type consistency

- `KanbanSchedulePanel` props: `{ tripId: number, places: Place[], canWrite: boolean }` ← Task 2에서 `tripId={tripId}`, `places={places}`, `canWrite={canPlanWrite}` 로 전달 ✅
- `PlaceShelf` props: `{ places: Place[], days: ItineraryDay[], canWrite: boolean, onAddToDay: (placeId: string, dayId: string) => void }` ← `kanban-schedule-panel.tsx` 에서 정확한 시그니처로 호출 ✅
- `DayColumn` props: Task 1에서 기존 `day-column.tsx`의 Props 타입 그대로 사용 (`isDragging`, `unscheduledPlaces`, `onAddPlace`, `onDaysChange` 포함) ✅
- `useParams<{ roomId?: string }>()` → `roomId: string | undefined` → `roomId &&` 조건으로 안전하게 사용 ✅
