'use client'

import React, { useState } from 'react'
import {
    ArrowDownIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    CircleIcon,
    PlusIcon,
} from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { updateItineraryDayStatus, getItinerary, CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { ScheduleItemCard } from './schedule-item-card'

function TransportConnector({ item }: { item: ItineraryItem }) {
    const { transportMinutes, transportMeters } = item
    const hasTransport = transportMinutes != null
    const timeText = hasTransport
        ? transportMinutes < 60
            ? `${transportMinutes}분`
            : `${Math.floor(transportMinutes / 60)}시간${
                  transportMinutes % 60 > 0
                      ? ` ${transportMinutes % 60}분`
                      : ''
              }`
        : null
    const distText =
        hasTransport && transportMeters != null && transportMeters > 0
            ? transportMeters >= 1000
                ? ` · ${(transportMeters / 1000).toFixed(1)}km`
                : ` · ${transportMeters}m`
            : ''

    return (
        <div className="relative flex items-center justify-center py-1.5">
            {/* 세로 점선 */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-px border-l-2 border-dashed border-slate-200" />
            {/* 플로팅 pill 뱃지 */}
            <div
                className={`relative z-10 flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[10px] font-medium shadow-sm ${
                    hasTransport
                        ? 'border-brand/25 text-brand'
                        : 'border-slate-100 text-slate-300'
                }`}
            >
                <ArrowDownIcon size={9} strokeWidth={2.5} aria-hidden />
                {hasTransport ? `이동 ${timeText}${distText}` : '이동'}
            </div>
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

export function DayColumn({ day, tripId, canWrite, days, isDragging, unscheduledPlaces, onAddPlace, onDaysChange }: Props) {
    const [error, setError] = useState<string | null>(null)
    const [toggling, setToggling] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [showAddPicker, setShowAddPicker] = useState(false)
    const { setNodeRef, isOver } = useDroppable({ id: day.id })

    const isConfirmed = day.status === 'CONFIRMED'
    const dateLabel = new Date(day.itineraryDate + 'T00:00:00').toLocaleDateString(
        'ko-KR',
        { month: 'long', day: 'numeric', weekday: 'short' },
    )

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

    const borderClass = isOver
        ? 'border-brand bg-brand/5 ring-2 ring-brand/30 ring-offset-1 scale-[1.01]'
        : isConfirmed
          ? 'border-green-200 bg-green-50/40'
          : isDragging
            ? 'border-brand/40 bg-brand/5'
            : 'border-slate-200 bg-white'

    return (
        <section
            ref={setNodeRef}
            className={`rounded-xl border shadow-sm transition-colors ${borderClass}`}
        >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-3 py-2">
                {/* 날짜 + 접기 버튼 */}
                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
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
                    <span className="truncate text-xs text-slate-500">{dateLabel}</span>
                    {isConfirmed && (
                        <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-600">
                            확정
                        </span>
                    )}
                    {collapsed && day.items.length > 0 && (
                        <span className="shrink-0 text-[10px] text-slate-400">
                            {day.items.length}개
                        </span>
                    )}
                </button>

                {/* 장소 추가 버튼 */}
                {canWrite && unscheduledPlaces.length > 0 && (
                    <div className="relative ml-1">
                        <button
                            type="button"
                            onClick={() => setShowAddPicker(!showAddPicker)}
                            className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-bold text-brand transition hover:bg-brand/10"
                            title="장소 추가"
                        >
                            <PlusIcon size={12} />
                            추가
                        </button>
                        {showAddPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowAddPicker(false)}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                    <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        추가할 장소
                                    </p>
                                    <div className="max-h-48 overflow-y-auto">
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
                                                        style={{ color: place.categoryColor ?? '#94a3b8' }}
                                                    >
                                                        <CategoryIcon icon={place.categoryIcon} size={11} strokeWidth={2.5} />
                                                    </span>
                                                )}
                                                <span
                                                    className="truncate text-xs font-medium"
                                                    style={{ color: place.categoryColor ?? '#475569' }}
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
                        className={`ml-1 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition disabled:opacity-50 ${
                            isConfirmed
                                ? 'text-green-600 hover:bg-green-100'
                                : 'text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        {isConfirmed ? (
                            <CheckCircleIcon size={14} />
                        ) : (
                            <CircleIcon size={14} />
                        )}
                        {isConfirmed ? '확정 취소' : '확정하기'}
                    </button>
                )}
            </div>

            {error && <p className="px-3 pb-1 text-xs text-red-500">{error}</p>}

            {/* 아이템 목록 (접으면 숨김) */}
            {!collapsed && (
                <div className="flex flex-col gap-1 px-3 pb-3">
                    <SortableContext
                        id={String(day.id)}
                        items={day.items.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {day.items.length === 0 ? (
                            <div
                                className={`flex min-h-[52px] items-center justify-center rounded-lg border-2 border-dashed text-xs transition-all ${
                                    isOver
                                        ? 'scale-[1.02] border-brand bg-brand/10 text-brand'
                                        : isDragging
                                          ? 'border-brand/50 bg-brand/5 text-brand/60'
                                          : 'border-slate-200 text-slate-300'
                                }`}
                            >
                                {isOver ? '여기에 놓기' : isDragging ? '여기에 드롭' : canWrite ? '장소를 드래그하거나 + 추가' : '장소 없음'}
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
