# Kanban Schedule Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 세로로 쌓인 Day 카드 레이아웃을 수평 스크롤 Kanban Board로 교체하여 일정 관리 UX를 현대적으로 개선한다.

**Architecture:** `schedule-panel.tsx` 레이아웃을 horizontal-scroll flex-row로 변경하고, 각 `day-column.tsx`를 고정 너비 + 내부 스크롤로 전환한다. 기존 "배치 대기" 섹션은 새로운 `place-shelf.tsx` 컴포넌트로 추출하여 하단 토글 서랍 형태로 분리한다. DnD 로직(`@dnd-kit/core`, `@dnd-kit/sortable`)은 그대로 유지한다.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, @dnd-kit/core, @dnd-kit/sortable

## Global Constraints

- FSD 레이어 규칙: `app → views → widgets → features → entities → shared`
- 하위 레이어가 상위 레이어를 import하면 안 됨
- TypeScript strict 모드 — `any` 금지
- `npx tsc --noEmit` 에러 없어야 함
- 기존 API 함수(`addItineraryItem`, `moveItineraryItem`, `reorderItineraryItems`, `getItinerary` 등) 시그니처 변경 없음
- Tailwind CSS만 사용, 인라인 style은 동적 색상(categoryColor 등)에만 허용
- `'use client'` 지시어는 클라이언트 컴포넌트에만 사용
- 모든 응답과 UI 텍스트는 한국어

---

## File Map

| 역할 | 파일 | 변경 유형 |
|------|------|-----------|
| DnD 컨테이너 + Kanban 레이아웃 | `frontend/src/widgets/trip-room/ui/schedule-panel.tsx` | **수정** — 레이아웃 전면 교체 |
| 고정 너비 Day 컬럼 | `frontend/src/widgets/trip-room/ui/day-column.tsx` | **수정** — 너비 고정 + 내부 스크롤 |
| 하단 장소 서랍 | `frontend/src/widgets/trip-room/ui/place-shelf.tsx` | **신규 생성** |
| 일정 아이템 카드 (기존 유지) | `frontend/src/widgets/trip-room/ui/schedule-item-card.tsx` | 변경 없음 |

---

## Task 1: PlaceShelf — 하단 장소 서랍 컴포넌트 신규 생성

`schedule-panel.tsx`의 `PlaceChip` + "배치 대기" 섹션을 독립 컴포넌트로 추출.

**Files:**
- Create: `frontend/src/widgets/trip-room/ui/place-shelf.tsx`

**Interfaces:**
- Consumes:
  - `Place` from `@/entities/trip`
  - `ItineraryDay` from `@/entities/trip`
  - `CategoryIcon` from `@/entities/trip`
  - `useDraggable` from `@dnd-kit/core`
- Produces:
  ```tsx
  // PlaceShelf 컴포넌트
  export function PlaceShelf(props: {
      places: Place[]           // unscheduled saved places
      days: ItineraryDay[]
      canWrite: boolean
      onAddToDay: (placeId: string, dayId: string) => void
  }): JSX.Element
  ```

---

- [ ] **Step 1: `place-shelf.tsx` 파일 생성**

```tsx
'use client'

import React, { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, Place } from '@/entities/trip'

// ── 드래그 가능한 장소 칩 ─────────────────────────────────
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
            style={
                place.categoryColor
                    ? { borderColor: place.categoryColor + '60' }
                    : { borderColor: '#e2e8f0' }
            }
        >
            {/* 드래그 핸들 */}
            <div
                {...listeners}
                {...attributes}
                className="flex cursor-grab items-center gap-1 rounded-l-full py-1 pl-2.5 pr-1.5 active:cursor-grabbing"
                style={{ color: place.categoryColor ?? '#64748b' }}
            >
                {place.categoryIcon && (
                    <CategoryIcon icon={place.categoryIcon} size={11} strokeWidth={2.5} />
                )}
                <span className="max-w-[100px] truncate text-xs font-medium">
                    {place.name}
                </span>
            </div>

            {/* Day 선택 버튼 */}
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

            {/* Day 선택 드롭다운 */}
            {showPicker && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPicker(false)}
                    />
                    <div className="absolute bottom-full left-0 z-50 mb-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            추가할 Day 선택
                        </p>
                        <div className="max-h-44 overflow-y-auto">
                            {days.map((day) => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => {
                                        onAddToDay(place.id, String(day.id))
                                        setShowPicker(false)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                >
                                    <span className="text-xs font-bold text-brand">
                                        Day {day.dayNumber}
                                    </span>
                                    <span className="truncate text-[10px] text-slate-400">
                                        {new Date(
                                            day.itineraryDate + 'T00:00:00',
                                        ).toLocaleDateString('ko-KR', {
                                            month: 'numeric',
                                            day: 'numeric',
                                        })}
                                    </span>
                                    {day.items.length > 0 && (
                                        <span className="ml-auto shrink-0 text-[10px] text-slate-300">
                                            {day.items.length}개
                                        </span>
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

// ── PlaceShelf ────────────────────────────────────────────
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
            {/* 헤더 토글 */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
            >
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    배치 대기
                </span>
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

            {/* 장소 칩 목록 */}
            {open && (
                <div className="px-4 pb-3">
                    {places.length === 0 ? (
                        <p className="py-1 text-xs text-slate-400">
                            모든 장소가 일정에 배치됐어요 🎉
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {places.map((place) =>
                                canWrite ? (
                                    <PlaceChip
                                        key={place.id}
                                        place={place}
                                        days={days}
                                        onAddToDay={onAddToDay}
                                    />
                                ) : (
                                    <div
                                        key={place.id}
                                        className="flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium"
                                        style={
                                            place.categoryColor
                                                ? {
                                                      borderColor: place.categoryColor + '60',
                                                      color: place.categoryColor,
                                                  }
                                                : { borderColor: '#e2e8f0', color: '#64748b' }
                                        }
                                    >
                                        {place.categoryIcon && (
                                            <CategoryIcon
                                                icon={place.categoryIcon}
                                                size={11}
                                                strokeWidth={2.5}
                                            />
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

- [ ] **Step 2: TypeScript 검증**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 없음 (아직 import하는 곳이 없으니 미사용 경고만)

---

## Task 2: DayColumn — 고정 너비 + 내부 스크롤로 Kanban 컬럼 전환

**Files:**
- Modify: `frontend/src/widgets/trip-room/ui/day-column.tsx`

**Interfaces:**
- Consumes: 기존 Props 유지 (`day`, `tripId`, `canWrite`, `days`, `isDragging`, `unscheduledPlaces`, `onAddPlace`, `onDaysChange`)
- 변경 없는 exports: `DayColumn`

---

- [ ] **Step 1: DayColumn에 Kanban 레이아웃 적용**

`day-column.tsx` 전체를 아래 코드로 교체한다:

```tsx
'use client'

import React, { useState } from 'react'
import {
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    CircleIcon,
    PlusIcon,
} from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import {
    CategoryIcon,
    getItinerary,
    updateItineraryDayStatus,
} from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { ScheduleItemCard } from './schedule-item-card'

function TransportConnector({ item }: { item: ItineraryItem }) {
    const { transportMinutes, transportMeters } = item
    if (transportMinutes == null) return null

    const mins = transportMinutes
    const timeText =
        mins < 60
            ? `${mins}분`
            : `${Math.floor(mins / 60)}시간${mins % 60 > 0 ? ` ${mins % 60}분` : ''}`
    const distText =
        transportMeters != null && transportMeters > 0
            ? transportMeters >= 1000
                ? ` · ${(transportMeters / 1000).toFixed(1)}km`
                : ` · ${transportMeters}m`
            : ''

    return (
        <div className="flex items-center gap-1.5 py-0.5 pl-7">
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-[10px] text-slate-400">
                이동 {timeText}
                {distText}
            </span>
        </div>
    )
}

type Props = {
    day: ItineraryDay
    tripId: number
    canWrite: boolean
    days: ItineraryDay[]
    isDragging: boolean
    unscheduledPlaces: Place[]
    onAddPlace: (placeId: string) => void
    onDaysChange: (days: ItineraryDay[]) => void
}

export function DayColumn({
    day,
    tripId,
    canWrite,
    days,
    isDragging,
    unscheduledPlaces,
    onAddPlace,
    onDaysChange,
}: Props) {
    const [error, setError] = useState<string | null>(null)
    const [toggling, setToggling] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [showAddPicker, setShowAddPicker] = useState(false)
    const { setNodeRef, isOver } = useDroppable({ id: day.id })

    const isConfirmed = day.status === 'CONFIRMED'
    const dateLabel = new Date(
        day.itineraryDate + 'T00:00:00',
    ).toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    })

    async function toggleStatus() {
        if (!canWrite || toggling) return
        const next = isConfirmed ? 'DRAFT' : 'CONFIRMED'
        setToggling(true)
        try {
            await updateItineraryDayStatus(tripId, Number(day.id), next)
            const updated = await getItinerary(tripId)
            onDaysChange(updated)
            setError(null)
        } catch (err) {
            setError(getApiErrorMessage(err, '상태 변경에 실패했습니다.'))
        } finally {
            setToggling(false)
        }
    }

    // 컬럼 테두리: 드롭 중 > 확정됨 > 드래그 중 > 기본
    const borderClass = isOver
        ? 'border-brand bg-brand/5'
        : isConfirmed
          ? 'border-green-200 bg-green-50/40'
          : isDragging
            ? 'border-brand/40 bg-brand/5'
            : 'border-slate-200 bg-white'

    return (
        // Kanban 컬럼: 고정 너비 + flex-col + 전체 높이
        <section
            className={`flex w-64 shrink-0 flex-col rounded-xl border shadow-sm transition-colors ${borderClass}`}
        >
            {/* ── 헤더 ── */}
            <div className="flex items-center gap-1 px-3 py-2">
                {/* 날짜 + 접기 */}
                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                    <span className="shrink-0 text-slate-400">
                        {collapsed ? (
                            <ChevronRightIcon size={13} />
                        ) : (
                            <ChevronDownIcon size={13} />
                        )}
                    </span>
                    <span
                        className={`shrink-0 text-xs font-extrabold ${isConfirmed ? 'text-green-600' : 'text-brand'}`}
                    >
                        Day {day.dayNumber}
                    </span>
                    <span className="truncate text-[11px] text-slate-500">
                        {dateLabel}
                    </span>
                    {isConfirmed && (
                        <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-600">
                            확정
                        </span>
                    )}
                    {collapsed && day.items.length > 0 && (
                        <span className="shrink-0 text-[10px] text-slate-400">
                            {day.items.length}개
                        </span>
                    )}
                </button>

                {/* + 추가 버튼 */}
                {canWrite && unscheduledPlaces.length > 0 && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowAddPicker(!showAddPicker)}
                            className="flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-bold text-brand transition hover:bg-brand/10"
                            title="장소 추가"
                        >
                            <PlusIcon size={12} />
                        </button>
                        {showAddPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowAddPicker(false)}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                    <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        추가할 장소
                                    </p>
                                    <div className="max-h-52 overflow-y-auto">
                                        {unscheduledPlaces.map((place) => (
                                            <button
                                                key={place.id}
                                                type="button"
                                                onClick={() => {
                                                    onAddPlace(place.id)
                                                    setShowAddPicker(false)
                                                }}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                            >
                                                {place.categoryIcon && (
                                                    <span
                                                        className="shrink-0"
                                                        style={{
                                                            color:
                                                                place.categoryColor ??
                                                                '#94a3b8',
                                                        }}
                                                    >
                                                        <CategoryIcon
                                                            icon={place.categoryIcon}
                                                            size={11}
                                                            strokeWidth={2.5}
                                                        />
                                                    </span>
                                                )}
                                                <span
                                                    className="truncate text-xs font-medium"
                                                    style={{
                                                        color:
                                                            place.categoryColor ?? '#475569',
                                                    }}
                                                >
                                                    {place.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 확정 버튼 */}
                {canWrite && (
                    <button
                        type="button"
                        onClick={() => void toggleStatus()}
                        disabled={toggling}
                        className={`flex shrink-0 items-center rounded-lg p-1 transition disabled:opacity-50 ${
                            isConfirmed
                                ? 'text-green-500 hover:bg-green-100'
                                : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                        }`}
                        title={isConfirmed ? '확정 취소' : '확정하기'}
                    >
                        {isConfirmed ? (
                            <CheckCircleIcon size={15} />
                        ) : (
                            <CircleIcon size={15} />
                        )}
                    </button>
                )}
            </div>

            {error && (
                <p className="px-3 pb-1 text-[10px] text-red-500">{error}</p>
            )}

            {/* ── 아이템 목록 (컬럼 내부 스크롤) ── */}
            {!collapsed && (
                <div
                    ref={setNodeRef}
                    className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2"
                >
                    <SortableContext
                        id={String(day.id)}
                        items={day.items.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {day.items.length === 0 ? (
                            <div
                                className={`flex min-h-[60px] items-center justify-center rounded-lg border border-dashed text-[11px] transition-colors ${
                                    isOver
                                        ? 'border-brand bg-brand/10 text-brand'
                                        : isDragging
                                          ? 'border-brand/50 bg-brand/5 text-brand/60'
                                          : 'border-slate-200 text-slate-300'
                                }`}
                            >
                                {isOver
                                    ? '여기에 놓기'
                                    : isDragging
                                      ? '여기에 드롭'
                                      : canWrite
                                        ? '드래그하거나 + 로 추가'
                                        : '장소 없음'}
                            </div>
                        ) : (
                            day.items.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <ScheduleItemCard
                                        item={item}
                                        tripId={tripId}
                                        canWrite={canWrite}
                                        days={days}
                                        currentDayId={String(day.id)}
                                        onDaysChange={onDaysChange}
                                    />
                                    {index < day.items.length - 1 && (
                                        <TransportConnector item={item} />
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </SortableContext>
                </div>
            )}
        </section>
    )
}
```

- [ ] **Step 2: TypeScript 검증**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 없음

---

## Task 3: SchedulePanel — Kanban Board 레이아웃으로 전면 교체

기존 세로 스택 레이아웃을 수평 스크롤 Kanban Board로 교체하고, `PlaceShelf`를 하단에 연결한다.

**Files:**
- Modify: `frontend/src/widgets/trip-room/ui/schedule-panel.tsx`

**Interfaces:**
- Consumes:
  - `PlaceShelf` from `./place-shelf`
  - `DayColumn` from `./day-column` (Task 2 결과)
  - 모든 기존 API 함수 유지
- Props: 기존 그대로
  ```tsx
  type Props = {
      tripId: number
      places: Place[]
      canWrite: boolean
      onDaysLoaded?: (days: ItineraryDay[]) => void
  }
  ```

---

- [ ] **Step 1: `schedule-panel.tsx` 전체 교체**

```tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
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

// SchedulePanel Props
type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
    onDaysLoaded?: (days: ItineraryDay[]) => void
}

export function SchedulePanel({ tripId, places, canWrite, onDaysLoaded }: Props) {
    const [days, setDays] = useState<ItineraryDay[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dndError, setDndError] = useState<string | null>(null)
    const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    )

    // 배치 대기 장소 계산
    const savedPlaces = places.filter((p) => p.status === 'saved')
    const scheduledTripPlaceIds = new Set(
        days.flatMap((d) =>
            d.items
                .map((i) => i.tripPlaceId)
                .filter((id) => id !== null)
                .map(String),
        ),
    )
    const unscheduledPlaces = savedPlaces.filter(
        (p) => !scheduledTripPlaceIds.has(String(p.id)),
    )

    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
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
        onDaysLoaded?.(days)
    }, [days, onDaysLoaded])

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
            .finally(() => {
                if (active && mountedRef.current) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [tripId])

    // ── helpers ────────────────────────────────────────────
    async function addPlaceToDay(placeId: string, dayId: string) {
        const targetDay = days.find((d) => String(d.id) === dayId)
        if (!targetDay) return
        try {
            await addItineraryItem(
                tripId,
                Number(dayId),
                Number(placeId),
                targetDay.items.length,
            )
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

    // ── DnD handlers ───────────────────────────────────────
    function handleDragStart(event: DragStartEvent) {
        setIsDragging(true)
        const id = String(event.active.id)
        if (id.startsWith('place-')) {
            setActivePlaceId(id.replace('place-', ''))
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setIsDragging(false)
        setActivePlaceId(null)
        setDndError(null)
        if (!over) return

        const activeId = String(active.id)
        const overId = String(over.id)

        // 1. Place chip → Day 드롭
        if (activeId.startsWith('place-')) {
            const placeId = activeId.replace('place-', '')
            const targetDay = resolveTargetDay(overId)
            if (!targetDay) return
            await addPlaceToDay(placeId, String(targetDay.id))
            return
        }

        // 2. 일정 아이템 드래그
        const sourceDayId = String(
            active.data.current?.sortable?.containerId ?? '',
        )
        const targetDay = resolveTargetDay(overId)
        if (!targetDay) return
        const targetDayId = String(targetDay.id)

        if (sourceDayId === targetDayId) {
            // 같은 Day 내 순서 변경
            const sourceDay = findDayById(sourceDayId)
            if (!sourceDay) return
            const oldIndex = sourceDay.items.findIndex(
                (i) => String(i.id) === activeId,
            )
            const newIndex = sourceDay.items.findIndex(
                (i) => String(i.id) === overId,
            )
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex)
                return

            // Optimistic update
            const newItems = [...sourceDay.items]
            const [moved] = newItems.splice(oldIndex, 1)
            newItems.splice(newIndex, 0, moved)
            setDays((prev) =>
                prev.map((d) =>
                    String(d.id) === sourceDayId
                        ? { ...d, items: newItems }
                        : d,
                ),
            )

            try {
                await reorderItineraryItems(
                    tripId,
                    Number(sourceDayId),
                    newItems.map((i) => Number(i.id)),
                )
                const updated = await getItinerary(tripId)
                setDays(updated)
            } catch (err) {
                await loadDays()
                setDndError(
                    getApiErrorMessage(err, '순서 변경에 실패했습니다.'),
                )
            }
        } else {
            // 다른 Day로 이동
            const newSortOrder = targetDay.items.length
            try {
                await moveItineraryItem(
                    tripId,
                    Number(activeId),
                    Number(targetDayId),
                    newSortOrder,
                )
                const updated = await getItinerary(tripId)
                setDays(updated)
            } catch (err) {
                setDndError(getApiErrorMessage(err, '이동에 실패했습니다.'))
            }
        }
    }

    const activePlaceForOverlay = activePlaceId
        ? places.find((p) => p.id === activePlaceId)
        : null

    // ── render ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-slate-400">
                일정 불러오는 중...
            </div>
        )
    }

    if (error) {
        return (
            <div className="px-3 py-4">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {error}
                </p>
            </div>
        )
    }

    if (days.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-slate-400">
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
                {/* DnD 에러 배너 */}
                {dndError && (
                    <div className="shrink-0 px-3 pt-2">
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {dndError}
                        </p>
                    </div>
                )}

                {/* ── Kanban Board (수평 스크롤) ── */}
                <div className="mp-scroll flex flex-1 gap-3 overflow-x-auto px-3 py-3">
                    {days.map((day) => (
                        <DayColumn
                            key={day.id}
                            day={day}
                            tripId={tripId}
                            canWrite={canWrite}
                            days={days}
                            isDragging={isDragging}
                            unscheduledPlaces={unscheduledPlaces}
                            onAddPlace={(placeId) =>
                                void addPlaceToDay(placeId, String(day.id))
                            }
                            onDaysChange={setDays}
                        />
                    ))}
                </div>

                {/* ── 배치 대기 서랍 (하단 고정) ── */}
                <PlaceShelf
                    places={unscheduledPlaces}
                    days={days}
                    canWrite={canWrite}
                    onAddToDay={(placeId, dayId) =>
                        void addPlaceToDay(placeId, dayId)
                    }
                />
            </div>

            {/* DragOverlay — 드래그 중 장소 칩 미리보기 */}
            <DragOverlay>
                {activePlaceForOverlay ? (
                    <div
                        className="cursor-grabbing rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-lg"
                        style={
                            activePlaceForOverlay.categoryColor
                                ? {
                                      borderColor:
                                          activePlaceForOverlay.categoryColor,
                                      color: activePlaceForOverlay.categoryColor,
                                  }
                                : undefined
                        }
                    >
                        {activePlaceForOverlay.categoryIcon && (
                            <span className="mr-1 inline-block">
                                <CategoryIcon
                                    icon={activePlaceForOverlay.categoryIcon}
                                    size={11}
                                    strokeWidth={2.5}
                                />
                            </span>
                        )}
                        {activePlaceForOverlay.name}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
```

- [ ] **Step 2: TypeScript 검증**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 브라우저 수동 검증**

dev 서버를 켜고 Schedule 탭에서 다음을 확인:

1. **Kanban 레이아웃**: Day 컬럼들이 수평으로 나란히 보이고 가로 스크롤 가능
2. **Day 컬럼 + 버튼**: 각 Day 헤더 우측의 `+` 클릭 시 미배치 장소 팝오버 표시
3. **하단 서랍**: "배치 대기" 토글 버튼으로 열고 닫기 가능
4. **드래그**: 서랍의 장소 칩을 Day 컬럼에 드롭하면 일정 추가됨
5. **Day 간 이동**: 일정 아이템을 다른 Day 컬럼으로 드래그하면 이동됨
6. **Same-day 순서 변경**: 같은 Day 안에서 위아래 드래그 가능
7. **드래그 피드백**: 드래그 중 Day 컬럼 테두리가 brand 색으로 변함
8. **확정 버튼**: ✓ 아이콘 클릭으로 CONFIRMED ↔ DRAFT 전환 가능

---

## Self-Review

### Spec coverage 체크

| 요구사항 | 구현 태스크 |
|----------|------------|
| 수평 스크롤 Kanban 레이아웃 | Task 3 (schedule-panel.tsx) |
| 고정 너비 Day 컬럼 | Task 2 (day-column.tsx) |
| 하단 장소 서랍 (토글) | Task 1 (place-shelf.tsx) |
| 서랍에서 드래그하여 Day에 추가 | Task 1 PlaceChip + Task 3 DnD |
| Day 헤더 + 버튼으로 장소 추가 | Task 2 showAddPicker |
| 드래그 중 시각적 피드백 | Task 2 borderClass + Task 3 isDragging |
| Day 간 아이템 이동 | Task 3 handleDragEnd |
| 같은 Day 순서 변경 | Task 3 handleDragEnd (reorder) |
| Day 확정/취소 | Task 2 toggleStatus |

### Placeholder 스캔: 없음 ✅

### Type consistency 체크

- `PlaceChip`에서 사용하는 `Place.categoryIcon: PlaceMarkerIcon` → `CategoryIcon` prop `icon: string`으로 받음 (실제 타입 확인 필요 시 `place-marker-icon.ts` 참조)
- `DayColumn.onAddPlace: (placeId: string) => void` ← `schedule-panel.tsx`에서 `void addPlaceToDay(placeId, String(day.id))`로 호출 ✅
- `PlaceShelf.onAddToDay: (placeId: string, dayId: string) => void` ← `schedule-panel.tsx`에서 `void addPlaceToDay(placeId, dayId)`로 호출 ✅
