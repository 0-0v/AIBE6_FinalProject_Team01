'use client'

import React, { useState } from 'react'
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
import { PlaceSidebar } from './place-sidebar'
import { KanbanMapPanel } from './kanban-map-panel'
import { useItineraryDays } from '../model/use-itinerary-days'

type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
}

export function KanbanSchedulePanel({ tripId, places, canWrite }: Props) {
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
            d.items.map((i) => i.tripPlaceId).filter((id) => id !== null).map(String),
        ),
    )
    const unscheduledPlaces = savedPlaces.filter(
        (p) => !scheduledTripPlaceIds.has(String(p.id)),
    )

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
                await reorderItineraryItems(
                    tripId,
                    Number(sourceDayId),
                    newItems.map((i) => Number(i.id)),
                )
                const updated = await getItinerary(tripId)
                setDays(updated)
            } catch (err) {
                await refresh()
                setDndError(getApiErrorMessage(err, '순서 변경에 실패했습니다.'))
            }
        } else {
            try {
                await moveItineraryItem(
                    tripId,
                    Number(activeId),
                    Number(targetDayId),
                    targetDay.items.length,
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
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {dndError}
                        </p>
                    </div>
                )}

                {/* 접이식 지도 패널 */}
                <KanbanMapPanel days={days} />

                {/* 사이드바 + 칸반 보드 */}
                <div className="flex min-h-0 flex-1">
                    {/* 좌측 장소 사이드바 */}
                    <PlaceSidebar
                        places={unscheduledPlaces}
                        days={days}
                        canWrite={canWrite}
                        onAddToDay={(placeId, dayId) => void addPlaceToDay(placeId, dayId)}
                    />

                    {/* 칸반 보드 — 수평 스크롤 */}
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
                                    onAddPlace={(placeId) =>
                                        void addPlaceToDay(placeId, String(day.id))
                                    }
                                    onDaysChange={setDays}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activePlaceForOverlay ? (
                    <div
                        className="flex cursor-grabbing items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-lg"
                        style={
                            activePlaceForOverlay.categoryColor
                                ? {
                                      borderColor: activePlaceForOverlay.categoryColor,
                                      color: activePlaceForOverlay.categoryColor,
                                  }
                                : undefined
                        }
                    >
                        {activePlaceForOverlay.categoryIcon && (
                            <CategoryIcon
                                icon={activePlaceForOverlay.categoryIcon}
                                size={11}
                                strokeWidth={2.5}
                            />
                        )}
                        {activePlaceForOverlay.name}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
