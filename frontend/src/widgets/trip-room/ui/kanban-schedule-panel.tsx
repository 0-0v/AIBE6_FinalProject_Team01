'use client'

import { useState } from 'react'
import {
    defaultDropAnimationSideEffects,
    DndContext,
    DragOverlay,
    type DropAnimation,
} from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryItem, Place } from '@/entities/trip'
import { formatTimeRange } from '../lib/itinerary-time'
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

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: { active: { opacity: '0' } },
    }),
}

function ScheduleItemDragOverlay({ item }: { item: ItineraryItem }) {
    return (
        <div className="flex w-64 cursor-grabbing items-stretch rounded-lg border border-brand/40 bg-white shadow-2xl ring-2 ring-brand/20">
            <div
                className="w-1.5 shrink-0 rounded-l-lg"
                style={{
                    backgroundColor:
                        item.categoryColor ?? 'var(--color-app-border)',
                }}
            />
            <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5">
                {item.categoryIcon && (
                    <span
                        className="shrink-0"
                        style={{
                            color:
                                item.categoryColor ??
                                'var(--color-app-text-muted)',
                        }}
                    >
                        <CategoryIcon
                            icon={item.categoryIcon}
                            size={12}
                            strokeWidth={2.5}
                        />
                    </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                    {item.placeName ?? '(제목 없음)'}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                    {formatTimeRange(item.startTime, item.endTime)}
                </span>
            </div>
        </div>
    )
}

type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
    realtimeVersion?: number
}

export function KanbanSchedulePanel({
    tripId,
    places,
    canWrite,
    realtimeVersion = 0,
}: Props) {
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
    const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
    const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
    const [focusRequestVersion, setFocusRequestVersion] = useState(0)
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
        activeScheduledItemForOverlay,
        addPlaceToDay,
        handleDragStart,
        handleDragOver,
        handleDragCancel,
        handleDragEnd,
    } = useItineraryBoard(tripId, places, canWrite, realtimeVersion)
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
            autoScroll={{ threshold: { x: 0.1, y: 0.08 }, acceleration: 6 }}
            accessibility={{ restoreFocus: false }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragCancel={handleDragCancel}
            onDragEnd={(e) => {
                void handleDragEnd(e)
                ;(document.activeElement as HTMLElement | null)?.blur()
            }}
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
                    focusRequestVersion={focusRequestVersion}
                    onItemFocus={(itemId) => {
                        setFocusedItemId(itemId)
                        if (itemId != null) setFocusedPlaceId(null)
                        if (itemId != null) {
                            setFocusRequestVersion((current) => current + 1)
                        }
                    }}
                    onPlaceFocus={(placeId) => {
                        setFocusedPlaceId(placeId)
                        if (placeId != null) setFocusedItemId(null)
                        if (placeId != null) {
                            setFocusRequestVersion((current) => current + 1)
                        }
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
                            setFocusRequestVersion((current) => current + 1)
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
                                    allPlaces={places}
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
                                        setFocusRequestVersion(
                                            (current) => current + 1,
                                        )
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

            <DragOverlay dropAnimation={dropAnimation}>
                {activeScheduledItemForOverlay ? (
                    <ScheduleItemDragOverlay
                        item={activeScheduledItemForOverlay}
                    />
                ) : activePlaceForOverlay ? (
                    <div
                        className="flex cursor-grabbing items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-xl ring-1 ring-brand/20"
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
