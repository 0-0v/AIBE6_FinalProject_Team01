'use client'

import { DndContext, DragOverlay } from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { Place } from '@/entities/trip'
import { DayColumn } from './day-column'
import { PlaceSidebar } from './place-sidebar'
import { KanbanMapPanel } from './kanban-map-panel'
import {
    itineraryCollisionDetection,
    useItineraryBoard,
} from '../model/use-itinerary-board'

type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
}

export function KanbanSchedulePanel({ tripId, places, canWrite }: Props) {
    const {
        days,
        setDays,
        loading,
        error,
        sensors,
        dndError,
        isDragging,
        isDraggingScheduledItem,
        unscheduledPlaces,
        activePlaceForOverlay,
        addPlaceToDay,
        handleDragStart,
        handleDragCancel,
        handleDragEnd,
    } = useItineraryBoard(tripId, places, canWrite)

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
        <DndContext
            sensors={sensors}
            collisionDetection={itineraryCollisionDetection}
            onDragStart={handleDragStart}
            onDragCancel={handleDragCancel}
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
                        isDraggingScheduledItem={isDraggingScheduledItem}
                        onAddToDay={(placeId, dayId) =>
                            void addPlaceToDay(placeId, dayId)
                        }
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
                                        void addPlaceToDay(
                                            placeId,
                                            String(day.id),
                                        )
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
                                      borderColor:
                                          activePlaceForOverlay.categoryColor,
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
