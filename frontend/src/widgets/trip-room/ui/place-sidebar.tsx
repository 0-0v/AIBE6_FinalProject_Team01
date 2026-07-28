'use client'

import React, { useState } from 'react'
import { GripVertical, MapPinIcon, PlusIcon } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, Place } from '@/entities/trip'
import { Badge } from '@/shared/ui'
import { UNSCHEDULED_DROP_ZONE_ID } from '../model/use-itinerary-board'
import { DayPickerMenu } from './day-picker-menu'

type PlaceSidebarItemProps = {
    place: Place
    days: ItineraryDay[]
    onAddToDay: (placeId: string, dayId: string) => void
}

function PlaceSidebarItem({ place, days, onAddToDay }: PlaceSidebarItemProps) {
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
                    : { borderColor: '#e2e8f0' }
            }
        >
            <div className="flex items-center gap-2 p-2.5">
                {/* 드래그 핸들 */}
                <div
                    {...listeners}
                    {...attributes}
                    className="shrink-0 cursor-grab text-slate-300 hover:text-slate-400 active:cursor-grabbing"
                >
                    <GripVertical size={14} />
                </div>

                {/* 썸네일 */}
                {place.image ? (
                    <img
                        src={place.image}
                        alt={place.name}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                ) : (
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{
                            backgroundColor:
                                (place.categoryColor ?? '#94a3b8') + '20',
                        }}
                    >
                        {place.categoryIcon && (
                            <span
                                style={{
                                    color: place.categoryColor ?? '#94a3b8',
                                }}
                            >
                                <CategoryIcon
                                    icon={place.categoryIcon}
                                    size={14}
                                    strokeWidth={2}
                                />
                            </span>
                        )}
                    </div>
                )}

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
                            onClick={() => setShowPicker(!showPicker)}
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
}

export function PlaceSidebar({
    places,
    days,
    canWrite,
    isDraggingScheduledItem,
    onAddToDay,
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
            <div className="flex-1 overflow-y-auto px-2 py-2">
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
                                />
                            ) : (
                                <div
                                    key={place.id}
                                    className="flex items-center gap-2 rounded-xl border bg-white p-2.5"
                                    style={
                                        place.categoryColor
                                            ? {
                                                  borderColor:
                                                      place.categoryColor +
                                                      '40',
                                              }
                                            : { borderColor: '#e2e8f0' }
                                    }
                                >
                                    {place.image ? (
                                        <img
                                            src={place.image}
                                            alt={place.name}
                                            className="h-8 w-8 shrink-0 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                backgroundColor:
                                                    (place.categoryColor ??
                                                        '#94a3b8') + '20',
                                            }}
                                        >
                                            {place.categoryIcon && (
                                                <span
                                                    style={{
                                                        color:
                                                            place.categoryColor ??
                                                            '#94a3b8',
                                                    }}
                                                >
                                                    <CategoryIcon
                                                        icon={
                                                            place.categoryIcon
                                                        }
                                                        size={12}
                                                        strokeWidth={2}
                                                    />
                                                </span>
                                            )}
                                        </div>
                                    )}
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
