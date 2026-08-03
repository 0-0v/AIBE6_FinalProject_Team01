'use client'

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    defaultDropAnimationSideEffects,
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    type DropAnimation,
} from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { formatTimeRange } from '../lib/itinerary-time'
import {
    itineraryCollisionDetection,
    UNSCHEDULED_DROP_ZONE_ID,
    useItineraryBoard,
} from '../model/use-itinerary-board'
import { DayColumn } from './day-column'
import { DayPickerMenu } from './day-picker-menu'
import {
    ItineraryBoardFeedback,
    ItineraryBoardGuide,
} from './itinerary-board-feedback'

// ────────────────────────────────────────────────────────────
// DragOverlay 드롭 애니메이션
const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: { active: { opacity: '0' } },
    }),
}

// 드래그 중 커서에 표시되는 일정 카드 미니 복제본
function ScheduleItemDragOverlay({ item }: { item: ItineraryItem }) {
    return (
        <div className="flex w-64 cursor-grabbing items-stretch rounded-lg border border-brand/40 bg-white shadow-2xl ring-2 ring-brand/20">
            <div
                className="w-1.5 shrink-0 rounded-l-lg"
                style={{ backgroundColor: item.categoryColor ?? '#e2e8f0' }}
            />
            <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5">
                {item.categoryIcon && (
                    <span
                        className="shrink-0"
                        style={{ color: item.categoryColor ?? '#94a3b8' }}
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
                    <CategoryIcon
                        icon={place.categoryIcon}
                        size={11}
                        strokeWidth={2.5}
                    />
                )}
                <span className="text-xs font-medium">{place.name}</span>
            </div>

            {/* Day 추가 버튼 */}
            <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="flex h-full items-center rounded-r-full border-l py-1 pl-1.5 pr-2 text-[10px] font-bold transition hover:bg-slate-50"
                style={{
                    borderColor: place.categoryColor
                        ? place.categoryColor + '40'
                        : '#e2e8f0',
                    color: place.categoryColor ?? '#94a3b8',
                }}
                title="Day 선택해서 추가"
            >
                +
            </button>

            {/* Day 선택 드롭다운 */}
            {showPicker && (
                <DayPickerMenu
                    days={days}
                    placement="top"
                    onClose={() => setShowPicker(false)}
                    onSelect={(dayId) => {
                        onAddToDay(place.id, dayId)
                        setShowPicker(false)
                    }}
                />
            )}
        </div>
    )
}

function UnscheduledPlaceTray({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: UNSCHEDULED_DROP_ZONE_ID,
    })

    return (
        <div
            ref={setNodeRef}
            className={`shrink-0 border-t bg-white px-3 pb-3 pt-2 transition ${
                isOver
                    ? 'border-brand bg-brand/10 ring-2 ring-inset ring-brand/30'
                    : 'border-slate-100'
            }`}
        >
            {children}
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
    realtimeVersion?: number
    onDaysLoaded?: (days: ItineraryDay[]) => void
    onPlaceFocus?: (placeId: string) => void
}

export function SchedulePanel({
    tripId,
    roomId,
    places,
    canWrite,
    realtimeVersion = 0,
    onDaysLoaded,
    onPlaceFocus,
}: Props) {
    const navigate = useNavigate()
    const {
        days,
        setDays,
        loading,
        error,
        sensors,
        dndError,
        isDragging,
        isDraggingScheduledItem,
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

    useEffect(() => {
        if (!loading) onDaysLoaded?.(days)
    }, [days, loading, onDaysLoaded])

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
                <ItineraryBoardGuide />
                {/* Day 컬럼 목록 - 상단에서 스크롤 */}
                <div className="mp-scroll grid flex-1 auto-rows-max grid-cols-1 gap-2 overflow-y-auto px-4 py-3 @min-[760px]:grid-cols-2">
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
                            canWrite={canWrite && !saving}
                            days={days}
                            isDragging={isDragging}
                            unscheduledPlaces={unscheduledPlaces}
                            allPlaces={places}
                            onAddPlace={(placeId) =>
                                void addPlaceToDay(placeId, String(day.id))
                            }
                            onDaysChange={setDays}
                            onItemFocus={(itemId) => {
                                const item = day.items.find(
                                    (candidate) =>
                                        String(candidate.id) === itemId,
                                )
                                if (item?.tripPlaceId != null) {
                                    onPlaceFocus?.(String(item.tripPlaceId))
                                }
                            }}
                        />
                    ))}
                </div>

                {/* 칸반 플래너 진입 버튼 */}
                {roomId && (
                    <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2">
                        <button
                            type="button"
                            onClick={() =>
                                navigate(`/app/room/${roomId}/schedule`)
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand/5 py-2.5 text-xs font-bold text-brand transition hover:bg-brand/10"
                        >
                            <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            칸반 플래너로 열기
                        </button>
                    </div>
                )}

                {/* 배치 대기 — 하단 고정 */}
                <UnscheduledPlaceTray>
                    <p
                        className={`mb-1.5 text-[10px] font-bold uppercase tracking-wide ${
                            isDraggingScheduledItem
                                ? 'text-brand'
                                : 'text-slate-400'
                        }`}
                    >
                        배치 대기 ({unscheduledPlaces.length})
                        {isDraggingScheduledItem ? (
                            <span className="ml-1 normal-case">
                                · 여기에 놓으면 일정에서 제외
                            </span>
                        ) : canWrite && unscheduledPlaces.length > 0 ? (
                            <span className="ml-1 font-normal normal-case text-slate-300">
                                · 드래그하거나 + 버튼으로 추가
                            </span>
                        ) : null}
                    </p>
                    {unscheduledPlaces.length === 0 ? (
                        <p className="text-xs text-slate-400">
                            모든 장소가 일정에 배치됐어요 🎉
                        </p>
                    ) : (
                        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                            {unscheduledPlaces.map((place) =>
                                canWrite && !saving ? (
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
                                                          place.categoryColor +
                                                          '60',
                                                      color: place.categoryColor,
                                                  }
                                                : {
                                                      borderColor: '#e2e8f0',
                                                      color: '#64748b',
                                                  }
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
                </UnscheduledPlaceTray>
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
