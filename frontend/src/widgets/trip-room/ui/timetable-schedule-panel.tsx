'use client'

import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { Columns3Icon, ListIcon } from 'lucide-react'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { Badge, Button } from '@/shared/ui'
import { formatLocalDate } from '../lib/date-availability'
import { getItineraryDayColor } from '../lib/itinerary-map'
import { getTimetableHourRange } from '../lib/timetable-layout'
import { useItineraryDays } from '../model/use-itinerary-days'
import { useItineraryItemEditor } from '../model/use-itinerary-item-editor'
import { TimeRangeFields } from './time-range-fields'

const HOUR_HEIGHT = 56 // 일정 간격은 유지하면서 한 화면에 더 많은 시간을 표시한다.
const OVERVIEW_DAY_MIN_WIDTH = 280
const TIMETABLE_TIME_AXIS_WIDTH = 56
const OVERVIEW_DAY_MAX_WIDTH = 320

type TimetableView = 'day' | 'overview'
const TIMETABLE_VIEW_STORAGE_KEY = 'trip-room-timetable-view'
const TIMETABLE_VIEW_CHANGE_EVENT = 'trip-room-timetable-view-change'

function getTimetableViewSnapshot(): TimetableView {
    return window.localStorage.getItem(TIMETABLE_VIEW_STORAGE_KEY) ===
        'overview'
        ? 'overview'
        : 'day'
}

function subscribeTimetableView(onStoreChange: () => void): () => void {
    window.addEventListener('storage', onStoreChange)
    window.addEventListener(TIMETABLE_VIEW_CHANGE_EVENT, onStoreChange)
    return () => {
        window.removeEventListener('storage', onStoreChange)
        window.removeEventListener(TIMETABLE_VIEW_CHANGE_EVENT, onStoreChange)
    }
}

function useTimetableView(): [TimetableView, (view: TimetableView) => void] {
    const view = useSyncExternalStore(
        subscribeTimetableView,
        getTimetableViewSnapshot,
        (): TimetableView => 'day',
    )

    function setView(nextView: TimetableView) {
        window.localStorage.setItem(TIMETABLE_VIEW_STORAGE_KEY, nextView)
        window.dispatchEvent(new Event(TIMETABLE_VIEW_CHANGE_EVENT))
    }

    return [view, setView]
}

function parseTime(t: string): { h: number; m: number } {
    const parts = t.split(':').map(Number)
    return { h: parts[0] ?? 0, m: parts[1] ?? 0 }
}

function toMinutes(time: string): number {
    const { h, m } = parseTime(time)
    return h * 60 + m
}

function getItemTop(startTime: string, startHour: number): number {
    const { h, m } = parseTime(startTime)
    const top = (h - startHour) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
    return Math.max(0, top)
}

function getItemHeight(
    startTime: string,
    endTime: string,
    startHour: number,
    endHour: number,
): number {
    const s = parseTime(startTime)
    const e = parseTime(endTime)
    const startMinutes = Math.max(s.h * 60 + s.m, startHour * 60)
    const endMinutes = Math.min(e.h * 60 + e.m, endHour * 60)
    const minutes = endMinutes - startMinutes
    return Math.max(HOUR_HEIGHT * 0.75, (minutes / 60) * HOUR_HEIGHT)
}

/** 겹치는 아이템들을 컬럼으로 나눠 배치하는 레이아웃 알고리즘 */
type LayoutedItem = { item: ItineraryItem; col: number; colSpan: number }

function layoutTimedItems(items: ItineraryItem[]): LayoutedItem[] {
    if (items.length === 0) return []

    function endOf(item: ItineraryItem): number {
        return item.endTime
            ? toMinutes(item.endTime)
            : toMinutes(item.startTime!) + 60
    }

    function overlaps(a: ItineraryItem, b: ItineraryItem): boolean {
        return (
            toMinutes(a.startTime!) < endOf(b) &&
            toMinutes(b.startTime!) < endOf(a)
        )
    }

    const n = items.length
    const visited = new Array<boolean>(n).fill(false)
    const components: number[][] = []

    // BFS로 겹치는 아이템들의 연결 컴포넌트를 구한다
    for (let i = 0; i < n; i++) {
        if (visited[i]) continue
        const component: number[] = []
        const queue = [i]
        visited[i] = true
        while (queue.length > 0) {
            const cur = queue.shift()!
            component.push(cur)
            for (let j = 0; j < n; j++) {
                if (!visited[j] && overlaps(items[cur], items[j])) {
                    visited[j] = true
                    queue.push(j)
                }
            }
        }
        components.push(component)
    }

    const result: LayoutedItem[] = new Array(n)

    for (const component of components) {
        // 시작 시간순 정렬 후 greedy 컬럼 배정
        const sorted = [...component].sort(
            (a, b) =>
                toMinutes(items[a].startTime!) - toMinutes(items[b].startTime!),
        )
        const colEnds: number[] = []
        const cols = new Array<number>(n)

        for (const idx of sorted) {
            const start = toMinutes(items[idx].startTime!)
            const end = endOf(items[idx])
            let assigned = -1
            for (let c = 0; c < colEnds.length; c++) {
                if (colEnds[c] <= start) {
                    assigned = c
                    colEnds[c] = end
                    break
                }
            }
            if (assigned === -1) {
                assigned = colEnds.length
                colEnds.push(end)
            }
            cols[idx] = assigned
        }

        const colSpan = colEnds.length
        for (const idx of component) {
            result[idx] = { item: items[idx], col: cols[idx], colSpan }
        }
    }

    return result
}

/** 현재 시각의 그리드 내 top(px)을 반환. 범위 밖이면 null */
function getCurrentTimeTop(startHour: number, endHour: number): number | null {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    if (h < startHour || h >= endHour) return null
    return (h - startHour) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
}

function TimeAxisLabels({
    startHour,
    endHour,
}: {
    startHour: number
    endHour: number
}) {
    return Array.from({ length: endHour - startHour }, (_, index) => (
        <div
            key={index}
            className="absolute right-2 text-[10px] font-medium text-slate-400"
            style={{
                top: index === 0 ? 2 : index * HOUR_HEIGHT - 6,
            }}
        >
            {String(startHour + index).padStart(2, '0')}:00
        </div>
    ))
}

function HourGridLines({
    startHour,
    endHour,
}: {
    startHour: number
    endHour: number
}) {
    const hourCount = endHour - startHour

    return (
        <>
            {Array.from({ length: hourCount + 1 }, (_, index) => (
                <div
                    key={`hour-${index}`}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: index * HOUR_HEIGHT }}
                />
            ))}
            {Array.from({ length: hourCount }, (_, index) => (
                <div
                    key={`half-hour-${index}`}
                    className="absolute left-0 right-0 border-t border-dashed border-slate-100/80"
                    style={{
                        top: index * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                    }}
                />
            ))}
        </>
    )
}

// ──────────────────────────────────────────
// TimetableItemBlock
// ──────────────────────────────────────────
type BlockProps = {
    item: ItineraryItem
    visitOrder: number
    dayColor: string
    tripId: number
    top: number
    height: number
    leftPct: number
    widthPct: number
    canWrite: boolean
    onUpdate: (days: ItineraryDay[]) => void
    dayItems: ItineraryItem[]
}

function TimetableItemBlock({
    item,
    visitOrder,
    dayColor,
    tripId,
    top,
    height,
    leftPct,
    widthPct,
    canWrite,
    onUpdate,
    dayItems,
}: BlockProps) {
    const editor = useItineraryItemEditor({
        tripId,
        item,
        dayItems,
        onUpdated: onUpdate,
    })

    return (
        <div
            className="absolute cursor-pointer overflow-hidden rounded-lg border border-white/80 shadow-sm transition-shadow hover:shadow-md"
            style={{
                top,
                minHeight: height,
                left: `calc(${leftPct}% + 4px)`,
                width: `calc(${widthPct}% - 8px)`,
                backgroundColor: (item.categoryColor ?? '#94a3b8') + '18',
                borderLeft: `3px solid ${item.categoryColor ?? '#94a3b8'}`,
                zIndex: editor.editing ? 10 : 1,
            }}
            onClick={() => canWrite && !editor.editing && editor.beginEditing()}
        >
            <div className="px-2 py-1">
                <div className="flex min-w-0 items-center gap-1">
                    <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                        style={{ backgroundColor: dayColor }}
                        aria-label={`${visitOrder}번째 방문 장소`}
                    >
                        {visitOrder}
                    </span>
                    <p
                        className="min-w-0 flex-1 truncate text-xs font-semibold"
                        style={{ color: item.categoryColor ?? '#475569' }}
                        title={item.placeName ?? ''}
                    >
                        {item.placeName ?? '(제목 없음)'}
                    </p>
                </div>
                <p className="mt-0.5 text-[10px] font-medium leading-none text-slate-500">
                    {item.startTime}
                    {item.endTime ? ` ~ ${item.endTime}` : ''}
                </p>
                {item.memo && height >= HOUR_HEIGHT && (
                    <p className="truncate text-[10px] text-slate-400">
                        {item.memo}
                    </p>
                )}
            </div>

            {editor.editing && (
                <div
                    className="rounded-b-lg border-t border-slate-100 bg-white px-2 pb-2 pt-1.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    <TimeRangeFields
                        startTime={editor.startTime}
                        endTime={editor.endTime}
                        onStartTimeChange={editor.changeStartTime}
                        onEndTimeChange={editor.changeEndTime}
                    />
                    <textarea
                        value={editor.memo}
                        onChange={(e) => editor.setMemo(e.target.value)}
                        placeholder="메모..."
                        rows={2}
                        className="mt-1 w-full resize-none rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                    {editor.saveError && (
                        <p className="mt-0.5 text-[10px] text-red-500">
                            {editor.saveError}
                        </p>
                    )}
                    {editor.overlapWarning && (
                        <div className="mt-1 rounded-lg bg-amber-50 px-2 py-1.5">
                            <p className="text-[10px] leading-relaxed text-amber-700">
                                {editor.overlapWarning}
                            </p>
                            <button
                                type="button"
                                onClick={() => void editor.save(true)}
                                className="mt-1 text-[10px] font-bold text-amber-700 underline underline-offset-2"
                            >
                                그래도 저장
                            </button>
                        </div>
                    )}
                    <div className="mt-1.5 flex gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 flex-1 text-xs"
                            onClick={editor.cancelEditing}
                        >
                            취소
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="h-7 flex-1 text-xs"
                            onClick={() => void editor.save(false)}
                            disabled={editor.saving}
                        >
                            {editor.saving ? '저장 중...' : '저장'}
                        </Button>
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
    const { days, setDays, loading, error } = useItineraryDays(tripId, canWrite)
    const [selectedDayId, setSelectedDayId] = useState<string>('')
    const [view, setView] = useTimetableView()
    const [, setClockTick] = useState(0)

    const effectiveSelectedDayId = days.some(
        (day) => String(day.id) === selectedDayId,
    )
        ? selectedDayId
        : String(days[0]?.id ?? '')
    const selectedDay = days.find(
        (day) => String(day.id) === effectiveSelectedDayId,
    )
    const timedItems = selectedDay?.items.filter((i) => !!i.startTime) ?? []
    const untimedItems = selectedDay?.items.filter((i) => !i.startTime) ?? []
    const visibleItems =
        view === 'overview'
            ? days.flatMap((day) => day.items)
            : (selectedDay?.items ?? [])
    const { startHour, endHour } = getTimetableHourRange(visibleItems)
    const currentTimeTop = getCurrentTimeTop(startHour, endHour)

    useEffect(() => {
        const id = setInterval(
            () => setClockTick((current) => current + 1),
            60_000,
        )
        return () => clearInterval(id)
    }, [])

    function openDay(dayId: string) {
        setSelectedDayId(dayId)
        setView('day')
    }

    const scheduledTripPlaceIds = new Set(
        days
            .flatMap((d) => d.items.map((i) => i.tripPlaceId))
            .filter((id) => id != null)
            .map(String),
    )
    const unscheduledPlaces = places.filter(
        (p) => p.status === 'saved' && !scheduledTripPlaceIds.has(String(p.id)),
    )

    const hasUnscheduled =
        untimedItems.length > 0 || unscheduledPlaces.length > 0
    const gridHeight = (endHour - startHour) * HOUR_HEIGHT

    const todayStr = formatLocalDate(new Date())

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
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
                <div className="min-w-0 flex-1">
                    {view === 'day' ? (
                        <div className="mp-scroll flex gap-1 overflow-x-auto">
                            {days.map((day) => {
                                const isSelected =
                                    String(day.id) === effectiveSelectedDayId
                                const isToday = day.itineraryDate === todayStr
                                return (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedDayId(String(day.id))
                                        }
                                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                            isSelected
                                                ? 'bg-brand text-white'
                                                : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>Day {day.dayNumber}</span>
                                        <span
                                            className={`font-normal ${
                                                isSelected
                                                    ? 'opacity-80'
                                                    : 'opacity-60'
                                            }`}
                                        >
                                            {new Date(
                                                `${day.itineraryDate}T00:00:00`,
                                            ).toLocaleDateString('ko-KR', {
                                                month: 'numeric',
                                                day: 'numeric',
                                            })}
                                        </span>
                                        {isToday && (
                                            <Badge
                                                className={
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-brand/10 text-brand'
                                                }
                                            >
                                                오늘
                                            </Badge>
                                        )}
                                        {day.items.length > 0 && (
                                            <Badge
                                                className={
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-100 text-slate-500'
                                                }
                                            >
                                                {day.items.length}
                                            </Badge>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs font-bold text-slate-700">
                                전체 일정 비교
                            </p>
                            <p className="text-[10px] text-slate-400">
                                장소를 누르면 해당 Day를 자세히 볼 수 있어요.
                            </p>
                        </div>
                    )}
                </div>
                <div
                    className="flex shrink-0 rounded-lg bg-slate-100 p-0.5"
                    role="group"
                    aria-label="시간표 보기 방식"
                >
                    <button
                        type="button"
                        aria-pressed={view === 'day'}
                        onClick={() => setView('day')}
                        className={`flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold transition ${
                            view === 'day'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <ListIcon size={12} aria-hidden />
                        일별 보기
                    </button>
                    <button
                        type="button"
                        aria-pressed={view === 'overview'}
                        onClick={() => setView('overview')}
                        className={`flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold transition ${
                            view === 'overview'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Columns3Icon size={12} aria-hidden />
                        전체 보기
                    </button>
                </div>
            </div>

            {view === 'day' && hasUnscheduled && (
                <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        미정 · {untimedItems.length + unscheduledPlaces.length}
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {untimedItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium shadow-sm"
                                style={{
                                    borderColor:
                                        (item.categoryColor ?? '#94a3b8') +
                                        '60',
                                    color: item.categoryColor ?? '#64748b',
                                }}
                            >
                                {item.categoryIcon && (
                                    <CategoryIcon
                                        icon={item.categoryIcon}
                                        size={10}
                                        strokeWidth={2.5}
                                    />
                                )}
                                {item.placeName}
                                <Badge className="bg-slate-100 text-slate-400">
                                    시간 미정
                                </Badge>
                            </div>
                        ))}
                        {unscheduledPlaces.map((place) => (
                            <div
                                key={place.id}
                                className="flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium shadow-sm"
                                style={{
                                    borderColor:
                                        (place.categoryColor ?? '#94a3b8') +
                                        '60',
                                    color: place.categoryColor ?? '#64748b',
                                }}
                            >
                                {place.categoryIcon && (
                                    <CategoryIcon
                                        icon={place.categoryIcon}
                                        size={10}
                                        strokeWidth={2.5}
                                    />
                                )}
                                {place.name}
                                <Badge className="bg-slate-100 text-slate-400">
                                    미배치
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'day' ? (
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="flex" style={{ minHeight: gridHeight }}>
                        <div
                            className="relative w-14 shrink-0 border-r border-slate-100"
                            style={{ height: gridHeight }}
                        >
                            <TimeAxisLabels
                                startHour={startHour}
                                endHour={endHour}
                            />
                        </div>

                        <div
                            className="relative flex-1"
                            style={{ height: gridHeight }}
                        >
                            <HourGridLines
                                startHour={startHour}
                                endHour={endHour}
                            />

                            {currentTimeTop !== null &&
                                selectedDay?.itineraryDate === todayStr && (
                                    <div
                                        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                                        style={{ top: currentTimeTop }}
                                    >
                                        <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                                        <div className="h-px flex-1 bg-red-400" />
                                    </div>
                                )}

                            {layoutTimedItems(timedItems).map(
                                ({ item, col, colSpan }) => {
                                    const top = getItemTop(
                                        item.startTime!,
                                        startHour,
                                    )
                                    const height = item.endTime
                                        ? getItemHeight(
                                              item.startTime!,
                                              item.endTime,
                                              startHour,
                                              endHour,
                                          )
                                        : HOUR_HEIGHT
                                    return (
                                        <TimetableItemBlock
                                            key={item.id}
                                            item={item}
                                            visitOrder={
                                                (selectedDay?.items.findIndex(
                                                    (dayItem) =>
                                                        dayItem.id === item.id,
                                                ) ?? -1) + 1
                                            }
                                            dayColor={getItineraryDayColor(
                                                selectedDay?.dayNumber ?? 1,
                                            )}
                                            tripId={tripId}
                                            top={top}
                                            height={height}
                                            leftPct={(col / colSpan) * 100}
                                            widthPct={100 / colSpan}
                                            canWrite={canWrite}
                                            onUpdate={setDays}
                                            dayItems={selectedDay?.items ?? []}
                                        />
                                    )
                                },
                            )}

                            {timedItems.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="px-8 text-center text-xs text-slate-300">
                                        {canWrite
                                            ? '칸반 보기에서 장소를 배치하고 시간을 입력하면 여기에 표시됩니다.'
                                            : '배치된 장소가 없습니다.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mp-scroll flex-1 overflow-auto bg-white">
                    <div
                        style={{
                            width: '100%',
                            minWidth:
                                TIMETABLE_TIME_AXIS_WIDTH +
                                days.length * OVERVIEW_DAY_MIN_WIDTH,
                            maxWidth:
                                days.length >= 4
                                    ? TIMETABLE_TIME_AXIS_WIDTH +
                                      days.length * OVERVIEW_DAY_MAX_WIDTH
                                    : undefined,
                            marginInline: 'auto',
                        }}
                    >
                        <div className="sticky top-0 z-30 flex h-14 border-b border-slate-200 bg-white/95 backdrop-blur">
                            <div className="sticky left-0 z-40 flex w-14 shrink-0 items-center justify-center border-r border-slate-200 bg-white text-[10px] font-bold text-slate-400">
                                시간
                            </div>
                            {days.map((day) => {
                                const untimedCount = day.items.filter(
                                    (item) => !item.startTime,
                                ).length
                                return (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => openDay(String(day.id))}
                                        className="flex min-w-[280px] flex-1 flex-col items-center justify-center border-r border-slate-100 px-3 transition hover:bg-brand/5"
                                    >
                                        <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                            Day {day.dayNumber}
                                            {day.itineraryDate === todayStr && (
                                                <Badge className="bg-brand/10 text-brand">
                                                    오늘
                                                </Badge>
                                            )}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(
                                                `${day.itineraryDate}T00:00:00`,
                                            ).toLocaleDateString('ko-KR', {
                                                month: 'numeric',
                                                day: 'numeric',
                                                weekday: 'short',
                                            })}
                                            {untimedCount > 0 &&
                                                ` · 시간 미정 ${untimedCount}`}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                        <div className="flex">
                            <div
                                className="sticky left-0 z-20 w-14 shrink-0 border-r border-slate-200 bg-white"
                                style={{ height: gridHeight }}
                            >
                                <TimeAxisLabels
                                    startHour={startHour}
                                    endHour={endHour}
                                />
                            </div>
                            {days.map((day) => {
                                const dayTimedItems = day.items.filter(
                                    (item) => !!item.startTime,
                                )
                                return (
                                    <div
                                        key={day.id}
                                        className="relative min-w-[280px] flex-1 border-r border-slate-100"
                                        style={{
                                            height: gridHeight,
                                        }}
                                    >
                                        <HourGridLines
                                            startHour={startHour}
                                            endHour={endHour}
                                        />
                                        {currentTimeTop !== null &&
                                            day.itineraryDate === todayStr && (
                                                <div
                                                    className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-red-400"
                                                    style={{
                                                        top: currentTimeTop,
                                                    }}
                                                />
                                            )}
                                        {layoutTimedItems(dayTimedItems).map(
                                            ({ item, col, colSpan }) => {
                                                const color =
                                                    item.categoryColor ??
                                                    '#94a3b8'
                                                const visitOrder =
                                                    day.items.findIndex(
                                                        (dayItem) =>
                                                            dayItem.id ===
                                                            item.id,
                                                    ) + 1
                                                const height = item.endTime
                                                    ? getItemHeight(
                                                          item.startTime!,
                                                          item.endTime,
                                                          startHour,
                                                          endHour,
                                                      )
                                                    : HOUR_HEIGHT
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() =>
                                                            openDay(
                                                                String(day.id),
                                                            )
                                                        }
                                                        title={`${item.placeName ?? '장소'} · 자세히 보기`}
                                                        className="absolute overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left shadow-sm transition hover:z-10 hover:brightness-95 hover:shadow-md focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-brand"
                                                        style={{
                                                            top: getItemTop(
                                                                item.startTime!,
                                                                startHour,
                                                            ),
                                                            minHeight: height,
                                                            left: `calc(${(col / colSpan) * 100}% + 2px)`,
                                                            width: `calc(${100 / colSpan}% - 4px)`,
                                                            color,
                                                            borderColor: color,
                                                            backgroundColor: `${color}18`,
                                                        }}
                                                    >
                                                        <span className="flex min-w-0 items-center gap-1">
                                                            <span
                                                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                                                                style={{
                                                                    backgroundColor:
                                                                        getItineraryDayColor(
                                                                            day.dayNumber,
                                                                        ),
                                                                }}
                                                                aria-label={`${visitOrder}번째 방문 장소`}
                                                            >
                                                                {visitOrder}
                                                            </span>
                                                            <span className="min-w-0 flex-1 truncate text-[10px] font-bold">
                                                                {item.placeName ??
                                                                    '(제목 없음)'}
                                                            </span>
                                                        </span>
                                                        <span className="mt-0.5 block pl-5 text-[9px] font-medium opacity-70">
                                                            {item.startTime}
                                                            {item.endTime
                                                                ? `–${item.endTime}`
                                                                : ''}
                                                        </span>
                                                    </button>
                                                )
                                            },
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
