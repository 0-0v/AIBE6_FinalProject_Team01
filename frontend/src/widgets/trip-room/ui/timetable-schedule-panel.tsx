'use client'

import React, { useEffect, useState } from 'react'
import type { ItineraryItem } from '@/entities/trip'
import { Badge } from '@/shared/ui'
import { formatLocalDate } from '../lib/date-availability'
import { getItineraryDayColor } from '../lib/itinerary-map'
import { getTimetableHourRange } from '../lib/timetable-layout'
import { useItineraryDays } from '../model/use-itinerary-days'

const HOUR_HEIGHT = 56 // 일정 간격은 유지하면서 한 화면에 더 많은 시간을 표시한다.
const OVERVIEW_DAY_MIN_WIDTH = 280
const TIMETABLE_TIME_AXIS_WIDTH = 56
const OVERVIEW_DAY_MAX_WIDTH = 320

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
// TimetableSchedulePanel
// ──────────────────────────────────────────
type Props = {
    tripId: number
    canWrite: boolean
}

export function TimetableSchedulePanel({ tripId, canWrite }: Props) {
    const { days, loading, error } = useItineraryDays(tripId, canWrite)
    const [, setClockTick] = useState(0)
    const visibleItems = days.flatMap((day) => day.items)
    const { startHour, endHour } = getTimetableHourRange(visibleItems)
    const currentTimeTop = getCurrentTimeTop(startHour, endHour)

    useEffect(() => {
        const id = setInterval(
            () => setClockTick((current) => current + 1),
            60_000,
        )
        return () => clearInterval(id)
    }, [])

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
                    <p className="text-xs font-bold text-slate-700">
                        전체 일정 비교
                    </p>
                    <p className="text-[10px] text-slate-400">
                        모든 날짜의 일정을 시간대별로 비교할 수 있어요.
                    </p>
                </div>
            </div>

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
                                <div
                                    key={day.id}
                                    className="flex min-w-[280px] flex-1 flex-col items-center justify-center border-r border-slate-100 px-3"
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
                                </div>
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
                                                item.categoryColor ?? '#94a3b8'
                                            const visitOrder =
                                                day.items.findIndex(
                                                    (dayItem) =>
                                                        dayItem.id === item.id,
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
                                                <div
                                                    key={item.id}
                                                    title={
                                                        item.placeName ?? '장소'
                                                    }
                                                    className="absolute overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left shadow-sm"
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
                                                </div>
                                            )
                                        },
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
