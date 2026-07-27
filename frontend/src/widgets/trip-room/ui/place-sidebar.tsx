'use client'

import React, { useState } from 'react'
import { GripVertical, MapPinIcon, PlusIcon } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CategoryIcon } from '@/entities/trip'
import type { ItineraryDay, Place } from '@/entities/trip'
import { Badge } from '@/shared/ui'

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
                            backgroundColor: (place.categoryColor ?? '#94a3b8') + '20',
                        }}
                    >
                        {place.categoryIcon && (
                            <span style={{ color: place.categoryColor ?? '#94a3b8' }}>
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
                    <Badge color={place.categoryColor} className="mt-0.5 font-medium">
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
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowPicker(false)}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
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
                </div>
            </div>
        </div>
    )
}

type Props = {
    places: Place[]
    days: ItineraryDay[]
    canWrite: boolean
    onAddToDay: (placeId: string, dayId: string) => void
}

export function PlaceSidebar({ places, days, canWrite, onAddToDay }: Props) {
    return (
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-100 bg-slate-50">
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
                {canWrite && places.length > 0 && (
                    <p className="mt-0.5 text-[10px] text-slate-300">
                        드래그하거나 + 로 추가
                    </p>
                )}
            </div>

            {/* 장소 목록 */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {places.length === 0 ? (
                    <div className="flex h-full items-center justify-center py-8 text-center">
                        <p className="text-xs text-slate-400">
                            모든 장소가
                            <br />
                            일정에 배치됐어요 🎉
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
                                            ? { borderColor: place.categoryColor + '40' }
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
