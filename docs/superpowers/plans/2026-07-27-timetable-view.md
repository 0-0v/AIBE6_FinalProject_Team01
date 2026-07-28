# Timetable View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 칸반 플래너 페이지에 에브리타임 스타일의 시간표 뷰를 추가하고 칸반/시간표 탭으로 전환 가능하게 한다.

**Architecture:**
- `timetable-schedule-panel.tsx` (신규): Day 탭 + 미정 섹션 + 세로 시간 그리드, ItineraryDay.items에서 startTime 있는 장소는 그리드에 블록으로, 없는 장소는 상단 미정 칩으로 표시
- `schedule-kanban-page.tsx` 헤더에 칸반/시간표 토글 추가, 선택된 뷰에 따라 패널 전환
- `TimetableItemBlock` 내부 컴포넌트: 시간 블록 클릭 시 인라인 edit form (startTime/endTime/memo)

**Tech Stack:** React, TypeScript, Tailwind CSS, `updateItineraryItem` / `getItinerary` from `@/entities/trip`

## Global Constraints

- FSD 규칙: widgets → entities → shared 방향만 허용
- Tailwind CSS만 사용 (브랜드 컬러 inline style 예외)
- `npx tsc --noEmit` 오류 없이 통과
- 기존 칸반 패널은 그대로 유지, 시간표는 추가 뷰

---

### Task 1: TimetableSchedulePanel 컴포넌트 생성

**Files:**
- Create: `frontend/src/widgets/trip-room/ui/timetable-schedule-panel.tsx`

**Interfaces:**
- Consumes:
  - `getItinerary(tripId: number): Promise<ItineraryDay[]>` from `@/entities/trip`
  - `updateItineraryItem(tripId, itemId, { startTime, endTime, memo }): Promise<ItineraryItem>` from `@/entities/trip`
  - `CategoryIcon` from `@/entities/trip`
  - `ItineraryDay`, `ItineraryItem`, `Place` types from `@/entities/trip`
- Produces:
  ```ts
  export function TimetableSchedulePanel(props: {
    tripId: number
    places: Place[]
    canWrite: boolean
  }): JSX.Element
  ```

**배경 지식:**
- `ItineraryItem.startTime`: `string | null` (예: `"09:00"`)
- `ItineraryItem.endTime`: `string | null`
- `ItineraryItem.categoryColor`: `string | null` (hex)
- `ItineraryItem.categoryIcon`: `string | null` (lucide key)
- `ItineraryItem.tripPlaceId`: `string | null`
- `Place.status === 'saved'`인 장소 중 어떤 Day의 items에도 tripPlaceId로 연결되지 않은 것 → 미배치 장소
- 시간 그리드: `HOUR_HEIGHT = 64`px/시간, `START_HOUR = 6`, `END_HOUR = 24`

- [ ] **Step 1: `timetable-schedule-panel.tsx` 생성**

```tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { getItinerary, updateItineraryItem, getApiErrorMessage, CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { getApiErrorMessage as getErr } from '@/shared/api/client'

const HOUR_HEIGHT = 64   // px per hour
const START_HOUR = 6     // 06:00
const END_HOUR = 24      // 24:00

function parseTime(t: string): { h: number; m: number } {
    const [h, m] = t.split(':').map(Number)
    return { h: h ?? 0, m: m ?? 0 }
}

function getItemTop(startTime: string): number {
    const { h, m } = parseTime(startTime)
    return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
}

function getItemHeight(startTime: string, endTime: string): number {
    const s = parseTime(startTime)
    const e = parseTime(endTime)
    const minutes = e.h * 60 + e.m - (s.h * 60 + s.m)
    return Math.max(HOUR_HEIGHT * 0.75, (minutes / 60) * HOUR_HEIGHT)
}

// ──────────────────────────────────────────
// TimetableItemBlock
// ──────────────────────────────────────────
type BlockProps = {
    item: ItineraryItem
    tripId: number
    top: number
    height: number
    canWrite: boolean
    onUpdate: (days: ItineraryDay[]) => void
}

function TimetableItemBlock({ item, tripId, top, height, canWrite, onUpdate }: BlockProps) {
    const [editing, setEditing] = useState(false)
    const [startTime, setStartTime] = useState(item.startTime ?? '')
    const [endTime, setEndTime] = useState(item.endTime ?? '')
    const [memo, setMemo] = useState(item.memo ?? '')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    async function handleSave() {
        setSaving(true)
        setSaveError(null)
        try {
            await updateItineraryItem(tripId, Number(item.id), {
                startTime: startTime || null,
                endTime: endTime || null,
                memo: memo || null,
            })
            const updated = await getItinerary(tripId)
            onUpdate(updated)
            setEditing(false)
        } catch (err) {
            setSaveError(getErr(err, '저장에 실패했습니다.'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className="absolute left-2 right-2 cursor-pointer overflow-visible rounded-lg transition-shadow hover:shadow-md"
            style={{
                top,
                minHeight: height,
                backgroundColor: (item.categoryColor ?? '#94a3b8') + '18',
                borderLeft: `3px solid ${item.categoryColor ?? '#94a3b8'}`,
                zIndex: editing ? 10 : 1,
            }}
            onClick={() => canWrite && !editing && setEditing(true)}
        >
            <div className="px-2 py-1.5">
                <p
                    className="truncate text-xs font-semibold"
                    style={{ color: item.categoryColor ?? '#475569' }}
                >
                    {item.placeName ?? '(제목 없음)'}
                </p>
                <p className="text-[10px] text-slate-400">
                    {item.startTime}
                    {item.endTime ? ` ~ ${item.endTime}` : ''}
                </p>
                {item.memo && height >= HOUR_HEIGHT && (
                    <p className="truncate text-[10px] text-slate-400">{item.memo}</p>
                )}
            </div>

            {editing && (
                <div
                    className="rounded-b-lg border-t border-slate-100 bg-white px-2 pb-2 pt-1.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex gap-1.5">
                        <label className="flex flex-1 flex-col gap-0.5">
                            <span className="text-[10px] text-slate-400">시작</span>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                            />
                        </label>
                        <label className="flex flex-1 flex-col gap-0.5">
                            <span className="text-[10px] text-slate-400">종료</span>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                            />
                        </label>
                    </div>
                    <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="메모..."
                        rows={2}
                        className="mt-1 w-full resize-none rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                    {saveError && (
                        <p className="mt-0.5 text-[10px] text-red-500">{saveError}</p>
                    )}
                    <div className="mt-1 flex gap-1">
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="flex-1 rounded border border-slate-200 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={saving}
                            className="flex-1 rounded bg-brand py-1 text-xs font-bold text-white disabled:opacity-50"
                        >
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ──────────────────────────────────────────
// TimetableSchedulePanel
// ──────────────────────────────────────────
type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
}

export function TimetableSchedulePanel({ tripId, places, canWrite }: Props) {
    const [days, setDays] = useState<ItineraryDay[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedDayId, setSelectedDayId] = useState<string>('')
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    useEffect(() => {
        let active = true
        setLoading(true)
        getItinerary(tripId)
            .then((fetched) => {
                if (!active || !mountedRef.current) return
                setDays(fetched)
                setError(null)
                if (fetched.length > 0) setSelectedDayId(String(fetched[0].id))
            })
            .catch((err: unknown) => {
                if (!active || !mountedRef.current) return
                setError(getErr(err, '일정을 불러오지 못했습니다.'))
            })
            .finally(() => {
                if (active && mountedRef.current) setLoading(false)
            })
        return () => { active = false }
    }, [tripId])

    const selectedDay = days.find((d) => String(d.id) === selectedDayId)
    const timedItems = selectedDay?.items.filter((i) => i.startTime != null) ?? []
    const untimedItems = selectedDay?.items.filter((i) => i.startTime == null) ?? []

    const scheduledTripPlaceIds = new Set(
        days
            .flatMap((d) => d.items.map((i) => i.tripPlaceId))
            .filter((id): id is string => id != null),
    )
    const unscheduledPlaces = places.filter(
        (p) => p.status === 'saved' && !scheduledTripPlaceIds.has(String(p.id)),
    )

    const hasUnscheduled = untimedItems.length > 0 || unscheduledPlaces.length > 0
    const gridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

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
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {error}
                </p>
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
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Day 탭 */}
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 bg-white px-3 py-2">
                {days.map((day) => (
                    <button
                        key={day.id}
                        type="button"
                        onClick={() => setSelectedDayId(String(day.id))}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            String(day.id) === selectedDayId
                                ? 'bg-brand text-white'
                                : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        Day {day.dayNumber}
                        <span className="ml-1 font-normal opacity-70">
                            {new Date(day.itineraryDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                                month: 'numeric',
                                day: 'numeric',
                            })}
                        </span>
                    </button>
                ))}
            </div>

            {/* 미정 섹션 */}
            {hasUnscheduled && (
                <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        미정 · {untimedItems.length + unscheduledPlaces.length}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {untimedItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-sm"
                                style={{
                                    borderColor: (item.categoryColor ?? '#94a3b8') + '60',
                                    color: item.categoryColor ?? '#64748b',
                                }}
                            >
                                {item.categoryIcon && (
                                    <CategoryIcon icon={item.categoryIcon} size={10} strokeWidth={2.5} />
                                )}
                                {item.placeName}
                                <span className="text-[10px] text-slate-300">시간 미정</span>
                            </div>
                        ))}
                        {unscheduledPlaces.map((place) => (
                            <div
                                key={place.id}
                                className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-sm"
                                style={{
                                    borderColor: (place.categoryColor ?? '#94a3b8') + '60',
                                    color: place.categoryColor ?? '#64748b',
                                }}
                            >
                                {place.categoryIcon && (
                                    <CategoryIcon icon={place.categoryIcon} size={10} strokeWidth={2.5} />
                                )}
                                {place.name}
                                <span className="text-[10px] text-slate-300">미배치</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 시간 그리드 */}
            <div className="flex-1 overflow-y-auto bg-white">
                <div className="flex" style={{ minHeight: gridHeight }}>
                    {/* 시간 레이블 열 */}
                    <div className="relative w-14 shrink-0 border-r border-slate-100" style={{ height: gridHeight }}>
                        {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                            <div
                                key={i}
                                className="absolute right-2 text-[10px] text-slate-300"
                                style={{ top: i * HOUR_HEIGHT - 6 }}
                            >
                                {String(START_HOUR + i).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    {/* 이벤트 그리드 */}
                    <div className="relative flex-1" style={{ height: gridHeight }}>
                        {/* 정시 선 */}
                        {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                            <div
                                key={i}
                                className="absolute left-0 right-0 border-t border-slate-100"
                                style={{ top: i * HOUR_HEIGHT }}
                            />
                        ))}
                        {/* 30분 점선 */}
                        {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                            <div
                                key={i}
                                className="absolute left-0 right-0 border-t border-dashed border-slate-50"
                                style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                            />
                        ))}

                        {/* 시간 배치된 장소 블록 */}
                        {timedItems.map((item) => {
                            const top = getItemTop(item.startTime!)
                            const height = item.endTime
                                ? getItemHeight(item.startTime!, item.endTime)
                                : HOUR_HEIGHT
                            return (
                                <TimetableItemBlock
                                    key={item.id}
                                    item={item}
                                    tripId={tripId}
                                    top={top}
                                    height={height}
                                    canWrite={canWrite}
                                    onUpdate={setDays}
                                />
                            )
                        })}

                        {/* 빈 Day 안내 */}
                        {timedItems.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-xs text-slate-300">
                                    {canWrite
                                        ? '칸반 보기에서 장소를 배치하고 시간을 입력하면 여기에 표시됩니다.'
                                        : '배치된 장소가 없습니다.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
```

> **주의**: `getApiErrorMessage`는 `@/shared/api/client`에서 import. 위 코드에서 `getErr`로 alias 처리했지만 실제 import문은 아래와 같이 작성한다:
> ```tsx
> import { getApiErrorMessage } from '@/shared/api/client'
> ```
> 그리고 코드 내 `getErr(...)` → `getApiErrorMessage(...)`로 교체할 것.

- [ ] **Step 2: import 정정 확인**

`timetable-schedule-panel.tsx` 상단 import를 아래로 맞춘다:

```tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { getItinerary, updateItineraryItem, CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
```

그리고 파일 내 `getErr(` → `getApiErrorMessage(` 로 전체 치환.

- [ ] **Step 3: TypeScript 확인**

```bash
cd /Users/heungjun/AIBE6/AIBE6_FinalProject_Team01/frontend && npx tsc --noEmit
```
Expected: No errors

---

### Task 2: schedule-kanban-page.tsx에 뷰 토글 추가

**Files:**
- Modify: `frontend/src/views/trip-room/ui/schedule-kanban-page.tsx`

**Interfaces:**
- Consumes (from Task 1): `TimetableSchedulePanel({ tripId, places, canWrite })`
- Consumes (existing): `KanbanSchedulePanel({ tripId, places, canWrite })`

**현재 `schedule-kanban-page.tsx` 구조:**
- `import { KanbanSchedulePanel } from '@/widgets/trip-room'`
- header에 `← 돌아가기`, 방 이름, "일정 보드" 배지
- 본문: `<KanbanSchedulePanel tripId={tripId} places={places} canWrite={canPlanWrite} />`

- [ ] **Step 1: import 추가**

파일 상단 import에 추가:
```tsx
import { KanbanSchedulePanel, TimetableSchedulePanel } from '@/widgets/trip-room'
import { AlignLeftIcon, LayoutDashboardIcon } from 'lucide-react'
```

- [ ] **Step 2: view 상태 추가**

`ScheduleKanbanPage` 함수 내부 상단에 추가:
```tsx
const [view, setView] = useState<'kanban' | 'timetable'>('kanban')
```

- [ ] **Step 3: 헤더에 토글 버튼 추가**

기존 헤더 내 `{placesError && ...}` 바로 앞에 추가:
```tsx
{/* 뷰 전환 토글 */}
<div className="ml-auto flex items-center rounded-lg border border-slate-200 p-0.5">
    <button
        type="button"
        onClick={() => setView('kanban')}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold transition ${
            view === 'kanban'
                ? 'bg-white shadow-sm text-slate-700'
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
                ? 'bg-white shadow-sm text-slate-700'
                : 'text-slate-400 hover:text-slate-600'
        }`}
    >
        <AlignLeftIcon size={11} />
        시간표
    </button>
</div>
```

- [ ] **Step 4: 본문 패널 조건부 렌더링**

기존:
```tsx
<KanbanSchedulePanel
    tripId={tripId}
    places={places}
    canWrite={canPlanWrite}
/>
```

교체:
```tsx
{view === 'kanban' ? (
    <KanbanSchedulePanel
        tripId={tripId}
        places={places}
        canWrite={canPlanWrite}
    />
) : (
    <TimetableSchedulePanel
        tripId={tripId}
        places={places}
        canWrite={canPlanWrite}
    />
)}
```

- [ ] **Step 5: TypeScript 확인**

```bash
cd /Users/heungjun/AIBE6/AIBE6_FinalProject_Team01/frontend && npx tsc --noEmit
```
Expected: No errors

---

### Task 3: index.ts 익스포트 추가

**Files:**
- Modify: `frontend/src/widgets/trip-room/index.ts`

- [ ] **Step 1: TimetableSchedulePanel 익스포트 추가**

```ts
export { TimetableSchedulePanel } from './ui/timetable-schedule-panel'
```

- [ ] **Step 2: 최종 TypeScript 확인**

```bash
cd /Users/heungjun/AIBE6/AIBE6_FinalProject_Team01/frontend && npx tsc --noEmit
```
Expected: No errors

---

## 수동 검증 체크리스트

`/app/room/:roomId/schedule` 진입 후 확인:

- [ ] 헤더에 `[칸반] [시간표]` 토글 버튼이 표시된다
- [ ] 칸반 클릭 → 기존 칸반 보드가 보인다
- [ ] 시간표 클릭 → Day 1·2·3... 탭이 보인다
- [ ] Day 탭 클릭 시 해당 Day의 일정으로 전환된다
- [ ] startTime이 있는 장소는 세로 시간 그리드에 블록으로 표시된다
- [ ] startTime이 없는 장소는 상단 "미정" 칩으로 표시된다
- [ ] 어떤 Day에도 배치 안 된 저장 장소는 "미배치" 칩으로 표시된다
- [ ] 블록 클릭 시 시간/메모 편집 폼이 인라인으로 열린다
- [ ] 저장 후 그리드가 새 시간으로 업데이트된다
- [ ] 시간 없는 Day에서는 "칸반 보기에서 장소를 배치하고 시간을 입력하면..." 안내 문구 표시
