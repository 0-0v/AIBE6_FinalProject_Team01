'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import type { TripMember } from '@/features/manage-trip'
import { hexWithAlpha } from '@/shared/lib'
import { formatTimeRange } from '../lib/itinerary-time'
import { resolveMemberNickname } from '../lib/member-lookup'
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
import { PlaceDetailOverlay } from './place-detail-overlay'

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
                    ? { borderColor: hexWithAlpha(place.categoryColor, '60') }
                    : { borderColor: 'var(--color-app-border)' }
            }
        >
            {/* 드래그 핸들 영역 */}
            <div
                {...listeners}
                {...attributes}
                className="flex cursor-grab items-center gap-1 rounded-l-full py-1 pl-2.5 pr-1.5 active:cursor-grabbing"
                style={{
                    color:
                        place.categoryColor ??
                        'var(--color-app-text-secondary)',
                }}
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
                        ? hexWithAlpha(place.categoryColor, '40')
                        : 'var(--color-app-border)',
                    color: place.categoryColor ?? 'var(--color-app-text-muted)',
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
    places: Place[]
    canWrite: boolean
    realtimeVersion?: number
    onDaysLoaded?: (days: ItineraryDay[]) => void
    onPlaceFocus?: (placeId: string) => void
    hoveredPlaceId?: string | null
    onPlaceHoverChange?: (placeId: string | null) => void
    selectedPlaceId?: string | null
    onPlaceDeselect?: () => void
    focusDayNumber?: number | null
    focusDayVersion?: number
    onPlacePhotoResolved?: (
        placeId: string,
        photoUrl: string,
        attribution: string | null,
        attributionUrl: string | null,
        sourceUrl: string,
    ) => void
    members?: TripMember[]
}

export function SchedulePanel({
    tripId,
    places,
    canWrite,
    realtimeVersion = 0,
    onDaysLoaded,
    onPlaceFocus,
    hoveredPlaceId = null,
    onPlaceHoverChange,
    selectedPlaceId = null,
    onPlaceDeselect,
    focusDayNumber = null,
    focusDayVersion = 0,
    onPlacePhotoResolved,
    members = [],
}: Props) {
    const dayColumnRefs = useRef(new Map<number, HTMLDivElement>())
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

    // 지도에서 날짜를 선택하면 그 날짜의 Day 컬럼으로 스크롤 포커싱한다.
    useEffect(() => {
        if (focusDayNumber == null) return
        const node = dayColumnRefs.current.get(focusDayNumber)
        node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [focusDayNumber, focusDayVersion])

    // 선택된 장소의 상세 패널(오버레이)에 쓸 정보 — 지도 팝업 대신 여기서 z-index로 띄운다
    const selectedPlace = useMemo(
        () =>
            selectedPlaceId != null
                ? places.find((candidate) => candidate.id === selectedPlaceId)
                : undefined,
        [places, selectedPlaceId],
    )
    const selectedScheduleInfo = useMemo(() => {
        let result: {
            dayNumber: number
            order: number
            item: ItineraryItem
            nextItem: ItineraryItem | null
        } | null = null
        if (selectedPlaceId != null) {
            for (const day of days) {
                const index = day.items.findIndex(
                    (candidate) =>
                        candidate.tripPlaceId != null &&
                        String(candidate.tripPlaceId) === selectedPlaceId,
                )
                if (index !== -1) {
                    result = {
                        dayNumber: day.dayNumber,
                        order: index + 1,
                        item: day.items[index],
                        nextItem: day.items[index + 1] ?? null,
                    }
                    break
                }
            }
        }
        return result
    }, [days, selectedPlaceId])

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
                    {days.map((day) => {
                        const hoveredItem =
                            hoveredPlaceId != null
                                ? day.items.find(
                                      (candidate) =>
                                          candidate.tripPlaceId != null &&
                                          String(candidate.tripPlaceId) ===
                                              hoveredPlaceId,
                                  )
                                : undefined
                        const selectedItem =
                            selectedPlaceId != null
                                ? day.items.find(
                                      (candidate) =>
                                          candidate.tripPlaceId != null &&
                                          String(candidate.tripPlaceId) ===
                                              selectedPlaceId,
                                  )
                                : undefined
                        return (
                            <div
                                key={day.id}
                                ref={(node) => {
                                    if (node) {
                                        dayColumnRefs.current.set(
                                            day.dayNumber,
                                            node,
                                        )
                                    } else {
                                        dayColumnRefs.current.delete(
                                            day.dayNumber,
                                        )
                                    }
                                }}
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
                                    onItemFocus={(itemId) => {
                                        const item = day.items.find(
                                            (candidate) =>
                                                String(candidate.id) === itemId,
                                        )
                                        if (item?.tripPlaceId != null) {
                                            onPlaceFocus?.(
                                                String(item.tripPlaceId),
                                            )
                                        }
                                    }}
                                    hoveredItemId={
                                        hoveredItem != null
                                            ? String(hoveredItem.id)
                                            : null
                                    }
                                    selectedItemId={
                                        selectedItem != null
                                            ? String(selectedItem.id)
                                            : null
                                    }
                                    onItemHoverChange={(itemId) => {
                                        if (itemId == null) {
                                            onPlaceHoverChange?.(null)
                                            return
                                        }
                                        const item = day.items.find(
                                            (candidate) =>
                                                String(candidate.id) === itemId,
                                        )
                                        onPlaceHoverChange?.(
                                            item?.tripPlaceId != null
                                                ? String(item.tripPlaceId)
                                                : null,
                                        )
                                    }}
                                />
                            </div>
                        )
                    })}
                </div>

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
                        <div className="mp-scroll flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
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
                                                      borderColor: hexWithAlpha(
                                                          place.categoryColor,
                                                          '60',
                                                      ),
                                                      color: place.categoryColor,
                                                  }
                                                : {
                                                      borderColor:
                                                          'var(--color-app-border)',
                                                      color: 'var(--color-app-text-secondary)',
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

                {selectedPlace && onPlaceDeselect && (
                    <PlaceDetailOverlay
                        place={selectedPlace}
                        scheduleInfo={selectedScheduleInfo}
                        addedByNickname={resolveMemberNickname(
                            members,
                            selectedPlace.addedBy,
                        )}
                        onClose={onPlaceDeselect}
                        onPlacePhotoResolved={onPlacePhotoResolved}
                    />
                )}
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
