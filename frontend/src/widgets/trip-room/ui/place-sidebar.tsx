'use client'

import React, { useState } from 'react'
import { GripVertical, MapPinIcon, PlusIcon } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, Place } from '@/entities/trip'
import { DESIGN_COLORS } from '@/shared/config'
import { Badge } from '@/shared/ui'
import { UNSCHEDULED_DROP_ZONE_ID } from '../model/use-itinerary-board'
import { DayPickerMenu } from './day-picker-menu'

type PlaceSidebarItemProps = {
    place: Place
    days: ItineraryDay[]
    onAddToDay: (placeId: string, dayId: string) => void
    onFocusPlace: (placeId: string) => void
}

function PlaceCategoryThumbnail({
    place,
    size,
}: {
    place: Place
    size: 'sm' | 'md'
}) {
    const dimensions = size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
    const iconSize = size === 'md' ? 14 : 12

    return (
        <div
            className={`flex ${dimensions} shrink-0 items-center justify-center rounded-lg`}
            style={{
                backgroundColor:
                    (place.categoryColor ?? DESIGN_COLORS.app.textMuted) + '20',
                color: place.categoryColor ?? DESIGN_COLORS.app.textMuted,
            }}
            aria-hidden="true"
        >
            {place.categoryIcon ? (
                <CategoryIcon
                    icon={place.categoryIcon}
                    size={iconSize}
                    strokeWidth={2}
                />
            ) : (
                <MapPinIcon size={iconSize} />
            )}
        </div>
    )
}

function PlaceSidebarItem({
    place,
    days,
    onAddToDay,
    onFocusPlace,
}: PlaceSidebarItemProps) {
    const [showPicker, setShowPicker] = useState(false)
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `place-${place.id}`,
        data: { placeId: place.id },
    })

    return (
        <div
            ref={setNodeRef}
            className={`relative rounded-xl border bg-white shadow-sm transition-opacity ${isDragging ? 'opacity-30' : ''}`}
            style={
                place.categoryColor
                    ? { borderColor: place.categoryColor + '40' }
                    : { borderColor: DESIGN_COLORS.app.border }
            }
        >
            <div
                {...listeners}
                {...attributes}
                onClick={() => onFocusPlace(place.id)}
                className="group flex cursor-grab touch-none items-center gap-2 p-2.5 active:cursor-grabbing"
                title="카드를 누른 채 원하는 Day로 이동"
            >
                <GripVertical
                    size={14}
                    className="shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                />

                <PlaceCategoryThumbnail place={place} size="md" />

                {/* 장소 정보 */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">
                        {place.name}
                    </p>
                    <Badge
                        color={place.categoryColor}
                        className="mt-0.5 font-medium"
                    >
                        {place.categoryName}
                    </Badge>
                </div>

                {/* 지도 핀 + Day 추가 버튼 */}
                <div className="flex shrink-0 flex-col items-center gap-1">
                    {(place.lat !== 0 || place.lng !== 0) && (
                        <MapPinIcon size={10} className="text-slate-300" />
                    )}
                    <div className="relative">
                        <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation()
                                setShowPicker(!showPicker)
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand transition hover:bg-brand/20"
                            title="Day에 추가"
                        >
                            <PlusIcon size={12} />
                        </button>
                        {showPicker && (
                            <DayPickerMenu
                                days={days}
                                align="right"
                                widthClassName="w-44"
                                onClose={() => setShowPicker(false)}
                                onSelect={(dayId) => {
                                    onAddToDay(place.id, dayId)
                                    setShowPicker(false)
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

type Props = {
    places: Place[]
    days: ItineraryDay[]
    canWrite: boolean
    isDraggingScheduledItem: boolean
    onAddToDay: (placeId: string, dayId: string) => void
    onFocusPlace?: (placeId: string) => void
}

export function PlaceSidebar({
    places,
    days,
    canWrite,
    isDraggingScheduledItem,
    onAddToDay,
    onFocusPlace,
}: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id: UNSCHEDULED_DROP_ZONE_ID,
        disabled: !canWrite,
    })

    return (
        <aside
            ref={setNodeRef}
            className={`flex w-56 shrink-0 flex-col border-r bg-slate-50 transition ${
                isOver
                    ? 'border-brand bg-brand/10 ring-2 ring-inset ring-brand/30'
                    : 'border-slate-100'
            }`}
        >
            {/* 헤더 */}
            <div className="shrink-0 border-b border-slate-100 px-3 py-2.5">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        저장된 장소
                    </span>
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {places.length}
                    </span>
                </div>
                {canWrite && isDraggingScheduledItem ? (
                    <p className="mt-0.5 text-[10px] font-bold text-brand">
                        여기에 놓으면 일정에서 제외
                    </p>
                ) : canWrite && places.length > 0 ? (
                    <p className="mt-0.5 text-[10px] text-slate-300">
                        드래그하거나 + 로 추가
                    </p>
                ) : null}
            </div>

            {/* 장소 목록 */}
            <div className="mp-scroll flex-1 overflow-y-auto px-2 py-2">
                {places.length === 0 ? (
                    <div className="flex h-full items-center justify-center py-8 text-center">
                        <p
                            className={`text-xs ${
                                isDraggingScheduledItem
                                    ? 'font-bold text-brand'
                                    : 'text-slate-400'
                            }`}
                        >
                            {isDraggingScheduledItem ? (
                                '여기에 놓아 저장된 장소로 되돌리기'
                            ) : (
                                <>
                                    모든 장소가
                                    <br />
                                    일정에 배치됐어요 🎉
                                </>
                            )}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {places.map((place) =>
                            canWrite ? (
                                <PlaceSidebarItem
                                    key={place.id}
                                    place={place}
                                    days={days}
                                    onAddToDay={onAddToDay}
                                    onFocusPlace={(placeId) =>
                                        onFocusPlace?.(placeId)
                                    }
                                />
                            ) : (
                                <div
                                    key={place.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onFocusPlace?.(place.id)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault()
                                            onFocusPlace?.(place.id)
                                        }
                                    }}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl border bg-white p-2.5 transition hover:border-brand/40 hover:shadow-sm"
                                    style={
                                        place.categoryColor
                                            ? {
                                                  borderColor:
                                                      place.categoryColor +
                                                      '40',
                                              }
                                            : {
                                                  borderColor:
                                                      DESIGN_COLORS.app.border,
                                              }
                                    }
                                >
                                    <PlaceCategoryThumbnail
                                        place={place}
                                        size="sm"
                                    />
                                    <span className="truncate text-xs font-medium text-slate-700">
                                        {place.name}
                                    </span>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}
