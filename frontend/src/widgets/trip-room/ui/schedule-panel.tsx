'use client'

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useItineraryDays } from '../model/use-itinerary-days'
import { DayColumn } from './day-column'

// ────────────────────────────────────────────────────────────
// Draggable place chip (드래그 + 클릭으로 Day 선택)
// ────────────────────────────────────────────────────────────
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
            className={`relative flex shrink-0 items-center rounded-full border bg-white shadow-sm ${isDragging ? 'opacity-30' : ''}`}
            style={
                place.categoryColor
                    ? { borderColor: place.categoryColor + '60' }
                    : { borderColor: '#e2e8f0' }
            }
        >
            {/* 드래그 핸들 영역 */}
            <div
                {...listeners}
                {...attributes}
                className="flex cursor-grab items-center gap-1 rounded-l-full py-1 pl-2.5 pr-1.5 active:cursor-grabbing"
                style={{ color: place.categoryColor ?? '#64748b' }}
            >
                {place.categoryIcon && (
                    <CategoryIcon icon={place.categoryIcon} size={11} strokeWidth={2.5} />
                )}
                <span className="text-xs font-medium">{place.name}</span>
            </div>

            {/* Day 추가 버튼 */}
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
                    <div className="absolute left-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
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

// ────────────────────────────────────────────────────────────
// SchedulePanel
// ────────────────────────────────────────────────────────────
type Props = {
    tripId: number
    roomId?: string
    places: Place[]
    canWrite: boolean
    onDaysLoaded?: (days: ItineraryDay[]) => void
}

export function SchedulePanel({ tripId, roomId, places, canWrite, onDaysLoaded }: Props) {
    const navigate = useNavigate()
    const { days, setDays, loading, error, refresh } =
        useItineraryDays(tripId)
    const [dndError, setDndError] = useState<string | null>(null)
    const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    )

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

    useEffect(() => {
        if (!loading) onDaysLoaded?.(days)
    }, [days, loading, onDaysLoaded])

    // ── helpers ──────────────────────────────────────────────
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

    // ── DnD handlers ─────────────────────────────────────────
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

        // ── 1. Place chip dropped onto a day ─────────────────
        if (activeId.startsWith('place-')) {
            const placeId = activeId.replace('place-', '')
            const targetDay = resolveTargetDay(overId)
            if (!targetDay) return
            await addPlaceToDay(placeId, String(targetDay.id))
            return
        }

        // ── 2. Schedule item drag ─────────────────────────────
        const sourceDayId = String(
            active.data.current?.sortable?.containerId ?? '',
        )
        const targetDay = resolveTargetDay(overId)
        if (!targetDay) return
        const targetDayId = String(targetDay.id)

        if (sourceDayId === targetDayId) {
            // Same-day reorder
            const sourceDay = findDayById(sourceDayId)
            if (!sourceDay) return
            const oldIndex = sourceDay.items.findIndex(
                (i) => String(i.id) === activeId,
            )
            const newIndex = sourceDay.items.findIndex(
                (i) => String(i.id) === overId,
            )
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

            // Optimistic update
            const newItems = [...sourceDay.items]
            const [moved] = newItems.splice(oldIndex, 1)
            newItems.splice(newIndex, 0, moved)
            setDays((prev) =>
                prev.map((d) =>
                    String(d.id) === sourceDayId ? { ...d, items: newItems } : d,
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
                // Rollback on failure
                await refresh()
                setDndError(getApiErrorMessage(err, '순서 변경에 실패했습니다.'))
            }
        } else {
            // Cross-day move
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

    // ── render ───────────────────────────────────────────────
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
                {/* Day 컬럼 목록 - 상단에서 스크롤 */}
                <div className="mp-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3">
                    {dndError && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {dndError}
                        </p>
                    )}
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

                {/* 칸반 플래너 진입 버튼 */}
                {roomId && (
                    <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2">
                        <button
                            type="button"
                            onClick={() => navigate(`/app/room/${roomId}/schedule`)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand/5 py-2.5 text-xs font-bold text-brand transition hover:bg-brand/10"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                            </svg>
                            칸반 플래너로 열기
                        </button>
                    </div>
                )}

                {/* 배치 대기 — 하단 고정 */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-3 pb-3 pt-2">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        배치 대기 ({unscheduledPlaces.length})
                        {canWrite && unscheduledPlaces.length > 0 && (
                            <span className="ml-1 font-normal normal-case text-slate-300">
                                · 드래그하거나 + 버튼으로 추가
                            </span>
                        )}
                    </p>
                    {unscheduledPlaces.length === 0 ? (
                        <p className="text-xs text-slate-400">
                            모든 장소가 일정에 배치됐어요 🎉
                        </p>
                    ) : (
                        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                            {unscheduledPlaces.map((place) =>
                                canWrite ? (
                                    <PlaceChip
                                        key={place.id}
                                        place={place}
                                        days={days}
                                        onAddToDay={(placeId, dayId) =>
                                            void addPlaceToDay(placeId, dayId)
                                        }
                                    />
                                ) : (
                                    <div
                                        key={place.id}
                                        className="flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium"
                                        style={
                                            place.categoryColor
                                                ? {
                                                      borderColor:
                                                          place.categoryColor + '60',
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
            </div>

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
                        {activePlaceForOverlay.name}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
