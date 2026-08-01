'use client'

import { useState } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { Place } from '@/entities/trip'
import { DayColumn } from './day-column'
import { PlaceSidebar } from './place-sidebar'
import { KanbanMapPanel } from './kanban-map-panel'
import {
    ItineraryBoardFeedback,
    ItineraryBoardGuide,
} from './itinerary-board-feedback'
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
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
    const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
    const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
    const {
        days,
        setDays,
        loading,
        error,
        sensors,
        dndError,
        isDragging,
        isDraggingScheduledItem,
        activeDragId,
        previewDayId,
        saving,
        feedback,
        clearFeedback,
        undoLastAction,
        unscheduledPlaces,
        activePlaceForOverlay,
        addPlaceToDay,
        handleDragStart,
        handleDragOver,
        handleDragCancel,
        handleDragEnd,
    } = useItineraryBoard(tripId, places, canWrite)
    const useFluidDayColumns = days.length <= 4

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
            onDragOver={handleDragOver}
            onDragCancel={handleDragCancel}
            onDragEnd={(e) => void handleDragEnd(e)}
        >
            <div className="relative flex min-h-0 flex-1 flex-col">
                {dndError && (
                    <div className="shrink-0 px-4 pt-2">
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {dndError}
                        </p>
                    </div>
                )}
                <ItineraryBoardGuide />

                {/* 접이식 지도 패널 */}
                <KanbanMapPanel
                    days={days}
                    places={places}
                    activeDragId={activeDragId}
                    previewDayId={previewDayId}
                    hoveredItemId={hoveredItemId}
                    onItemHoverChange={setHoveredItemId}
                    focusedItemId={focusedItemId}
                    focusedPlaceId={focusedPlaceId}
                    onItemFocus={(itemId) => {
                        setFocusedItemId(itemId)
                        if (itemId != null) setFocusedPlaceId(null)
                    }}
                    onPlaceFocus={(placeId) => {
                        setFocusedPlaceId(placeId)
                        if (placeId != null) setFocusedItemId(null)
                    }}
                />

                {/* 사이드바 + 칸반 보드 */}
                <div className="flex min-h-0 flex-1">
                    {/* 좌측 장소 사이드바 */}
                    <PlaceSidebar
                        places={unscheduledPlaces}
                        days={days}
                        canWrite={canWrite && !saving}
                        isDraggingScheduledItem={isDraggingScheduledItem}
                        onAddToDay={(placeId, dayId) =>
                            void addPlaceToDay(placeId, dayId)
                        }
                        onFocusPlace={(placeId) => {
                            setFocusedPlaceId(placeId)
                            setFocusedItemId(null)
                        }}
                    />

                    {/* 칸반 보드 — 수평 스크롤 */}
                    <div className="mp-scroll flex flex-1 items-start gap-3 overflow-x-auto overflow-y-auto p-3">
                        {days.map((day) => (
                            <div
                                key={day.id}
                                className={
                                    useFluidDayColumns
                                        ? 'min-w-64 flex-1'
                                        : 'w-72 shrink-0'
                                }
                            >
                                <DayColumn
                                    day={day}
                                    tripId={tripId}
                                    canWrite={canWrite && !saving}
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
                                    hoveredItemId={hoveredItemId}
                                    onItemHoverChange={setHoveredItemId}
                                    onItemFocus={(itemId) => {
                                        setFocusedItemId(itemId)
                                        setFocusedPlaceId(null)
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <ItineraryBoardFeedback
                    saving={saving}
                    feedback={feedback}
                    onUndo={() => void undoLastAction()}
                    onDismiss={clearFeedback}
                />
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
