'use client'

import React, { useEffect, useState } from 'react'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { Badge, Button } from '@/shared/ui'
import { useItineraryDays } from '../model/use-itinerary-days'
import { useItineraryItemEditor } from '../model/use-itinerary-item-editor'
import { TimeRangeFields } from './time-range-fields'

const HOUR_HEIGHT = 64 // px per hour
const START_HOUR = 6 // 06:00
const END_HOUR = 24 // 24:00

function parseTime(t: string): { h: number; m: number } {
    const parts = t.split(':').map(Number)
    return { h: parts[0] ?? 0, m: parts[1] ?? 0 }
}

function toMinutes(time: string): number {
    const { h, m } = parseTime(time)
    return h * 60 + m
}

function getItemTop(startTime: string): number {
    const { h, m } = parseTime(startTime)
    const top = (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
    return Math.max(0, top)
}

function getItemHeight(startTime: string, endTime: string): number {
    const s = parseTime(startTime)
    const e = parseTime(endTime)
    const startMinutes = Math.max(s.h * 60 + s.m, START_HOUR * 60)
    const endMinutes = Math.min(e.h * 60 + e.m, END_HOUR * 60)
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
        return toMinutes(a.startTime!) < endOf(b) && toMinutes(b.startTime!) < endOf(a)
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
            (a, b) => toMinutes(items[a].startTime!) - toMinutes(items[b].startTime!),
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
function getCurrentTimeTop(): number | null {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    if (h < START_HOUR || h >= END_HOUR) return null
    return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
}

// ──────────────────────────────────────────
// TimetableItemBlock
// ──────────────────────────────────────────
type BlockProps = {
    item: ItineraryItem
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
            className="absolute cursor-pointer overflow-hidden rounded-lg transition-shadow hover:shadow-md"
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
            <div className="px-2 py-1.5">
                <p
                    className="truncate text-xs font-semibold"
                    style={{ color: item.categoryColor ?? '#475569' }}
                    title={item.placeName ?? ''}
                >
                    {item.placeName ?? '(제목 없음)'}
                </p>
                <p className="text-[10px] text-slate-400">
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
    const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(
        getCurrentTimeTop,
    )
    // 현재 시각 선 1분마다 갱신
    useEffect(() => {
        const id = setInterval(
            () => setCurrentTimeTop(getCurrentTimeTop()),
            60_000,
        )
        return () => clearInterval(id)
    }, [])

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
    const gridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

    // 오늘 날짜 (yyyy-MM-dd 형식)
    const todayStr = new Date().toISOString().slice(0, 10)

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
                {days.map((day) => {
                    const isSelected = String(day.id) === effectiveSelectedDayId
                    const isToday = day.itineraryDate === todayStr
                    return (
                        <button
                            key={day.id}
                            type="button"
                            onClick={() => setSelectedDayId(String(day.id))}
                            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                isSelected
                                    ? 'bg-brand text-white'
                                    : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            <span>Day {day.dayNumber}</span>
                            <span
                                className={`font-normal ${isSelected ? 'opacity-80' : 'opacity-60'}`}
                            >
                                {new Date(
                                    day.itineraryDate + 'T00:00:00',
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
                                className="flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-sm"
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
                                className="flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-sm"
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

            {/* 시간 그리드 */}
            <div className="flex-1 overflow-y-auto bg-white">
                <div className="flex" style={{ minHeight: gridHeight }}>
                    {/* 시간 레이블 열 */}
                    <div
                        className="relative w-14 shrink-0 border-r border-slate-100"
                        style={{ height: gridHeight }}
                    >
                        {Array.from(
                            { length: END_HOUR - START_HOUR },
                            (_, i) => (
                                <div
                                    key={i}
                                    className="absolute right-2 text-[10px] text-slate-300"
                                    style={{ top: i * HOUR_HEIGHT - 6 }}
                                >
                                    {String(START_HOUR + i).padStart(2, '0')}:00
                                </div>
                            ),
                        )}
                    </div>

                    {/* 이벤트 그리드 */}
                    <div
                        className="relative flex-1"
                        style={{ height: gridHeight }}
                    >
                        {/* 정시 선 */}
                        {Array.from(
                            { length: END_HOUR - START_HOUR + 1 },
                            (_, i) => (
                                <div
                                    key={i}
                                    className="absolute left-0 right-0 border-t border-slate-100"
                                    style={{ top: i * HOUR_HEIGHT }}
                                />
                            ),
                        )}
                        {/* 30분 점선 */}
                        {Array.from(
                            { length: END_HOUR - START_HOUR },
                            (_, i) => (
                                <div
                                    key={i}
                                    className="absolute left-0 right-0 border-t border-dashed border-slate-50"
                                    style={{
                                        top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                                    }}
                                />
                            ),
                        )}

                        {/* 현재 시각 표시선 — 오늘 날짜 탭에서만 표시 */}
                        {currentTimeTop !== null && selectedDay?.itineraryDate === todayStr && (
                            <div
                                className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                                style={{ top: currentTimeTop }}
                            >
                                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                                <div className="h-px flex-1 bg-red-400" />
                            </div>
                        )}

                        {/* 시간 배치된 장소 블록 */}
                        {layoutTimedItems(timedItems).map(({ item, col, colSpan }) => {
                            const top = getItemTop(item.startTime!)
                            const height = item.endTime
                                ? getItemHeight(item.startTime!, item.endTime)
                                : HOUR_HEIGHT
                            const widthPct = 100 / colSpan
                            const leftPct = (col / colSpan) * 100
                            return (
                                <TimetableItemBlock
                                    key={item.id}
                                    item={item}
                                    tripId={tripId}
                                    top={top}
                                    height={height}
                                    leftPct={leftPct}
                                    widthPct={widthPct}
                                    canWrite={canWrite}
                                    onUpdate={setDays}
                                    dayItems={selectedDay?.items ?? []}
                                />
                            )
                        })}

                        {/* 빈 Day 안내 */}
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
        </div>
    )
}
