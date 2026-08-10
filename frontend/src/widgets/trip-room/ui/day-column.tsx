'use client'

import React, { useState } from 'react'
import {
    ArrowDownIcon,
    BusIcon,
    CarIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    CircleIcon,
    ExternalLinkIcon,
    FootprintsIcon,
    MapPinIcon,
    PlusIcon,
    TrainFrontIcon,
    XIcon,
} from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import {
    updateItineraryDayStatus,
    updateItineraryTransportMode,
    updateDayDeparture,
    getItinerary,
    CategoryIcon,
    TransportModeIcon,
    CATEGORY_META,
} from '@/entities/trip'
import type {
    ItineraryDay,
    ItineraryDayDeparture,
    ItineraryItem,
    Place,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { ScheduleItemCard } from './schedule-item-card'
import { getItineraryDayColor } from '../lib/itinerary-map'
import { buildGoogleMapsDirectionsUrl } from '../lib/google-maps-directions'
import { buildItineraryDropZoneId } from '../lib/itinerary-drop-position'
import {
    isSelectedTransportMode,
    resolveSelectableTransportMode,
    type SelectableItineraryTransportMode,
} from '../lib/itinerary-transport'

// ────────────────────────────────────────────────────────────
// DeparturePicker
// ────────────────────────────────────────────────────────────
type DeparturePickerProps = {
    dayNumber: number
    lodgingPlaces: Place[]
    savedPlaces: Place[]
    updating: boolean
    error: string | null
    onSelect: (
        payload:
            | { type: 'TRIP_PLACE'; tripPlaceId: number; name: string }
            | { type: 'NONE' },
    ) => void
    onClose: () => void
}

function DeparturePicker({
    dayNumber,
    lodgingPlaces,
    savedPlaces,
    updating,
    error,
    onSelect,
    onClose,
}: DeparturePickerProps) {
    const nonLodgingPlaces = savedPlaces.filter((p) => p.category !== 'lodging')

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100/60 px-5 py-4">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-brand/15 blur-2xl"
                    />
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-sm">
                                <MapPinIcon size={17} aria-hidden />
                            </span>
                            <div className="min-w-0 pt-0.5">
                                <h2 className="text-base font-extrabold text-slate-900">
                                    Day {dayNumber} 출발지 변경
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    이날 첫 일정 전에 출발할 장소를
                                    선택해주세요.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="닫기"
                            className="shrink-0 rounded-full bg-white/80 p-1.5 text-slate-400 shadow-sm hover:bg-white hover:text-slate-700"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>
                </div>

                {error && (
                    <p className="border-b border-red-100 bg-red-50 px-5 py-2.5 text-xs font-semibold text-red-500">
                        {error}
                    </p>
                )}

                <div className="mp-scroll max-h-96 overflow-y-auto p-2">
                    {/* 저장된 숙소 */}
                    {lodgingPlaces.length > 0 && (
                        <div>
                            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                저장된 숙소
                            </p>
                            {lodgingPlaces.map((place) => (
                                <button
                                    key={place.id}
                                    type="button"
                                    disabled={updating}
                                    onClick={() =>
                                        onSelect({
                                            type: 'TRIP_PLACE',
                                            tripPlaceId: Number(place.id),
                                            name: place.name,
                                        })
                                    }
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <span
                                        className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            backgroundColor: `${CATEGORY_META.lodging.color}18`,
                                            color: CATEGORY_META.lodging.color,
                                        }}
                                    >
                                        <CategoryIcon icon="HOTEL" size={15} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                                        {place.name}
                                    </span>
                                    <ChevronRightIcon
                                        size={14}
                                        className="shrink-0 text-slate-300"
                                        aria-hidden
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 저장된 다른 장소 */}
                    {nonLodgingPlaces.length > 0 && (
                        <div>
                            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                저장된 장소
                            </p>
                            {nonLodgingPlaces.map((place) => {
                                const color = place.categoryColor ?? '#94a3b8'
                                return (
                                    <button
                                        key={place.id}
                                        type="button"
                                        disabled={updating}
                                        onClick={() =>
                                            onSelect({
                                                type: 'TRIP_PLACE',
                                                tripPlaceId: Number(place.id),
                                                name: place.name,
                                            })
                                        }
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        <span
                                            className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                            style={{
                                                backgroundColor: `${color}18`,
                                                color,
                                            }}
                                        >
                                            {place.categoryIcon ? (
                                                <CategoryIcon
                                                    icon={place.categoryIcon}
                                                    size={15}
                                                />
                                            ) : (
                                                <MapPinIcon size={15} />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                                            {place.name}
                                        </span>
                                        <ChevronRightIcon
                                            size={14}
                                            className="shrink-0 text-slate-300"
                                            aria-hidden
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {savedPlaces.length === 0 && (
                        <p className="px-3 py-6 text-center text-sm text-slate-400">
                            저장된 장소가 없습니다.
                        </p>
                    )}

                    {/* 출발지 없음 */}
                    <div className="mt-1 border-t border-slate-100 pt-1">
                        <button
                            type="button"
                            disabled={updating}
                            onClick={() => onSelect({ type: 'NONE' })}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <XIcon size={15} />
                            </span>
                            출발지 없음
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ────────────────────────────────────────────────────────────
// DepartureRow
// ────────────────────────────────────────────────────────────
type DepartureRowProps = {
    departure: ItineraryDayDeparture | null
    dayNumber: number
    tripId: number
    dayId: string
    canWrite: boolean
    lodgingPlaces: Place[]
    savedPlaces: Place[]
    days: ItineraryDay[]
    onDaysChange: (days: ItineraryDay[]) => void
}

function DepartureRow({
    departure,
    dayNumber,
    tripId,
    dayId,
    canWrite,
    lodgingPlaces,
    savedPlaces,
    days,
    onDaysChange,
}: DepartureRowProps) {
    const [open, setOpen] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSelect(
        payload:
            | { type: 'TRIP_PLACE'; tripPlaceId: number; name: string }
            | { type: 'NONE' },
    ) {
        if (updating) return
        setUpdating(true)
        setError(null)
        try {
            const updated = await updateDayDeparture(
                tripId,
                Number(dayId),
                payload,
            )
            onDaysChange(days.map((d) => (d.id === updated.id ? updated : d)))
            setOpen(false)
        } catch (err) {
            setError(getApiErrorMessage(err, '출발지를 변경하지 못했습니다.'))
        } finally {
            setUpdating(false)
        }
    }

    const timeText =
        departure?.travelMinutes != null
            ? departure.travelMinutes < 60
                ? `${departure.travelMinutes}분`
                : `${Math.floor(departure.travelMinutes / 60)}시간${departure.travelMinutes % 60 > 0 ? ` ${departure.travelMinutes % 60}분` : ''}`
            : null

    return (
        <div className="relative flex items-center gap-2 border-b border-slate-100 px-3 py-1.5">
            <MapPinIcon size={12} className="shrink-0 text-brand" />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {departure ? (
                    <>
                        <span className="truncate text-[11px] font-semibold text-slate-700">
                            {departure.name}
                        </span>
                        {timeText && (
                            <span className="shrink-0 text-[10px] text-slate-400">
                                → {timeText}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-[11px] text-slate-400">
                        출발지를 설정해주세요
                    </span>
                )}
            </div>
            {canWrite && (
                <button
                    type="button"
                    disabled={updating}
                    onClick={() => {
                        setError(null)
                        setOpen((v) => !v)
                    }}
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand transition hover:border-brand hover:bg-brand-100 disabled:opacity-40"
                    aria-label={
                        departure
                            ? `Day ${dayNumber} 출발지 변경`
                            : `Day ${dayNumber} 출발지 선택`
                    }
                >
                    {departure ? '출발지 변경' : '출발지 선택'}
                </button>
            )}
            {open && (
                <DeparturePicker
                    dayNumber={dayNumber}
                    lodgingPlaces={lodgingPlaces}
                    savedPlaces={savedPlaces}
                    updating={updating}
                    error={error}
                    onSelect={handleSelect}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    )
}

const TRANSPORT_MODE_OPTIONS: {
    value: SelectableItineraryTransportMode
    label: string
    icon: typeof FootprintsIcon
}[] = [
    { value: 'WALKING', label: '도보', icon: FootprintsIcon },
    { value: 'DRIVING', label: '자동차', icon: CarIcon },
    { value: 'TAXI', label: '택시', icon: CarIcon },
    { value: 'BUS', label: '버스 우선', icon: BusIcon },
    { value: 'RAIL', label: '철도 우선', icon: TrainFrontIcon },
]

type TransportConnectorProps = {
    item: ItineraryItem
    nextItem: ItineraryItem
    tripId: number
    canWrite: boolean
    days: ItineraryDay[]
    onDaysChange: (days: ItineraryDay[]) => void
}

function TransportConnector({
    item,
    nextItem,
    tripId,
    canWrite,
    days,
    onDaysChange,
}: TransportConnectorProps) {
    const [open, setOpen] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const currentPreference = resolveSelectableTransportMode(item)
    const { transportMinutes, transportMeters, transportMode } = item
    const hasTransport = transportMinutes != null
    const timeText = hasTransport
        ? transportMinutes < 60
            ? `${transportMinutes}분`
            : `${Math.floor(transportMinutes / 60)}시간${
                  transportMinutes % 60 > 0 ? ` ${transportMinutes % 60}분` : ''
              }`
        : null
    const distText =
        hasTransport && transportMeters != null && transportMeters > 0
            ? transportMeters >= 1000
                ? ` · ${(transportMeters / 1000).toFixed(1)}km`
                : ` · ${transportMeters}m`
            : ''
    const modeLabel = transportMode ?? '이동'
    const googleMapsUrl = buildGoogleMapsDirectionsUrl(
        { lat: item.lat, lng: item.lng },
        { lat: nextItem.lat, lng: nextItem.lng },
        transportMode,
    )

    function toggleModeMenu() {
        if (!canWrite || updating) return
        if (!open) {
            setError(null)
        }
        setOpen((current) => !current)
    }

    async function applyMode(mode: SelectableItineraryTransportMode) {
        if (!canWrite || updating) return
        if (isSelectedTransportMode(item, mode)) {
            setOpen(false)
            return
        }
        setUpdating(true)
        setError(null)
        try {
            const updatedItem = await updateItineraryTransportMode(
                tripId,
                Number(item.id),
                mode,
            )
            onDaysChange(
                days.map((day) => ({
                    ...day,
                    items: day.items.map((dayItem) =>
                        dayItem.id === updatedItem.id ? updatedItem : dayItem,
                    ),
                })),
            )
            setOpen(false)
        } catch (err) {
            setError(getApiErrorMessage(err, '이동수단을 변경하지 못했습니다.'))
            setUpdating(false)
            return
        }
        try {
            onDaysChange(await getItinerary(tripId))
        } catch {
            setError(
                '이동수단은 변경됐지만 최신 일정을 불러오지 못했습니다. 일정을 다시 열어 확인해 주세요.',
            )
        } finally {
            setUpdating(false)
        }
    }

    return (
        <div className="relative flex flex-col items-center justify-center py-0">
            {/* 세로 연결선 */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-px border-l-2 border-slate-300" />
            <div className="relative z-10 my-1 flex items-center rounded-full border border-brand/30 bg-white text-brand shadow-sm">
                <button
                    type="button"
                    onClick={toggleModeMenu}
                    disabled={!canWrite || updating}
                    aria-expanded={open}
                    aria-label={`${modeLabel} 이동수단 변경`}
                    className={`flex items-center gap-1 rounded-l-full px-2.5 py-1 text-[10px] font-medium ${
                        hasTransport ? 'text-brand' : 'text-slate-300'
                    } ${canWrite ? 'cursor-pointer transition hover:bg-brand/5' : 'cursor-default'} disabled:opacity-60`}
                >
                    <ArrowDownIcon size={9} strokeWidth={2.5} aria-hidden />
                    <TransportModeIcon mode={transportMode} size={9} />
                    {hasTransport
                        ? `${modeLabel} ${timeText}${distText}`
                        : '이동'}
                    {canWrite && <ChevronDownIcon size={9} aria-hidden />}
                </button>
                <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${modeLabel} 경로를 Google Maps에서 확인`}
                    title="Google Maps에서 자세히 보기"
                    className="flex self-stretch items-center rounded-r-full border-l border-brand/15 px-2 transition hover:bg-brand/10"
                >
                    <ExternalLinkIcon size={9} aria-hidden />
                </a>
            </div>
            {open && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        aria-label="이동수단 메뉴 닫기"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                        <p className="px-2 py-1 text-[10px] font-bold text-slate-400">
                            이동수단 선택
                        </p>
                        {TRANSPORT_MODE_OPTIONS.map((option) => {
                            const Icon = option.icon
                            const selected = option.value === currentPreference
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    disabled={updating}
                                    onClick={() => void applyMode(option.value)}
                                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                        selected
                                            ? 'bg-brand/10 font-bold text-brand'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Icon size={13} aria-hidden />
                                    {option.label}
                                </button>
                            )
                        })}
                        <p className="border-t border-slate-100 px-2 pt-1.5 text-[9px] leading-relaxed text-slate-400">
                            선택하면 바로 이동 시간과 경로를 다시 계산해요.
                        </p>
                    </div>
                </>
            )}
            {error && (
                <p className="relative z-10 mt-1 rounded bg-white px-1 text-[10px] text-red-500">
                    {error}
                </p>
            )}
            {item.transportDetail && (
                <p
                    className="relative z-10 mt-1 max-w-64 truncate rounded bg-white px-1.5 text-[9px] text-slate-400"
                    title={item.transportDetail}
                >
                    {item.transportDetail}
                </p>
            )}
        </div>
    )
}

// 아이템 사이 / 맨 앞 / 맨 끝에 놓는 전용 드롭존 — 정렬 아이템의 히트박스와
// 경합하지 않도록 별도 타겟을 두어 사용자가 원하는 위치에 정확히 놓을 수 있게 한다.
function ItineraryDropZone({
    dayId,
    insertionIndex,
    visible,
}: {
    dayId: string
    insertionIndex: number
    visible: boolean
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: buildItineraryDropZoneId(dayId, insertionIndex),
        data: { type: 'itinerary-drop-zone' },
    })

    return (
        <div
            ref={setNodeRef}
            className={`relative transition-[height] duration-150 ${
                !visible ? 'h-1' : isOver ? 'h-9' : 'h-5'
            }`}
        >
            {isOver && (
                <div className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_0_3px_white]" />
            )}
        </div>
    )
}

type Props = {
    day: ItineraryDay
    tripId: number
    canWrite: boolean
    days: ItineraryDay[]
    isDragging: boolean
    unscheduledPlaces: Place[]
    allPlaces?: Place[]
    onAddPlace: (placeId: string) => void
    onDaysChange: (days: ItineraryDay[]) => void
    hoveredItemId?: string | null
    onItemHoverChange?: (itemId: string | null) => void
    onItemFocus?: (itemId: string) => void
    selectedItemId?: string | null
}

export function DayColumn({
    day,
    tripId,
    canWrite,
    days,
    isDragging,
    unscheduledPlaces,
    allPlaces = [],
    onAddPlace,
    onDaysChange,
    hoveredItemId,
    onItemHoverChange,
    onItemFocus,
    selectedItemId,
}: Props) {
    const [error, setError] = useState<string | null>(null)
    const [toggling, setToggling] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [showAddPicker, setShowAddPicker] = useState(false)
    const { setNodeRef, isOver } = useDroppable({
        id: day.id,
        data: { type: 'itinerary-day' },
    })

    const isConfirmed = day.status === 'CONFIRMED'
    const dateLabel = new Date(
        day.itineraryDate + 'T00:00:00',
    ).toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    })

    async function toggleStatus() {
        if (!canWrite || toggling) return
        const next = isConfirmed ? 'DRAFT' : 'CONFIRMED'
        setToggling(true)
        try {
            await updateItineraryDayStatus(tripId, Number(day.id), next)
            const updated = await getItinerary(tripId)
            onDaysChange(updated)
            setError(null)
        } catch (err) {
            setError(getApiErrorMessage(err, '상태 변경에 실패했습니다.'))
        } finally {
            setToggling(false)
        }
    }

    const borderClass = isOver
        ? 'border-brand bg-brand/5 ring-2 ring-brand/30 ring-offset-1 scale-[1.01]'
        : isConfirmed
          ? 'border-green-200 bg-green-50/40'
          : isDragging
            ? 'border-brand/40 bg-brand/5'
            : 'border-slate-200 bg-white'

    return (
        <section
            ref={setNodeRef}
            className={`rounded-xl border shadow-sm transition-colors ${borderClass}`}
        >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-3 py-1.5">
                {/* 날짜 + 접기 버튼 */}
                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                    <span className="shrink-0 text-slate-400">
                        {collapsed ? (
                            <ChevronRightIcon size={15} />
                        ) : (
                            <ChevronDownIcon size={15} />
                        )}
                    </span>
                    <span
                        className={`shrink-0 text-base font-extrabold ${isConfirmed ? 'text-green-600' : 'text-brand'}`}
                    >
                        Day {day.dayNumber}
                    </span>
                    <span className="truncate text-base font-medium text-slate-500">
                        {dateLabel}
                    </span>
                    {isConfirmed && (
                        <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-600">
                            확정
                        </span>
                    )}
                    {collapsed && day.items.length > 0 && (
                        <span className="shrink-0 text-[10px] text-slate-400">
                            {day.items.length}개
                        </span>
                    )}
                </button>

                {/* 장소 추가 버튼 */}
                {canWrite && unscheduledPlaces.length > 0 && (
                    <div className="relative ml-1">
                        <button
                            type="button"
                            onClick={() => setShowAddPicker(!showAddPicker)}
                            className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-bold text-brand transition hover:bg-brand/10"
                            title="장소 추가"
                        >
                            <PlusIcon size={12} />
                            추가
                        </button>
                        {showAddPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowAddPicker(false)}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                    <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        추가할 장소
                                    </p>
                                    <div className="mp-scroll max-h-48 overflow-y-auto">
                                        {unscheduledPlaces.map((place) => (
                                            <button
                                                key={place.id}
                                                type="button"
                                                onClick={() => {
                                                    onAddPlace(place.id)
                                                    setShowAddPicker(false)
                                                }}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                            >
                                                {place.categoryIcon && (
                                                    <span
                                                        className="shrink-0"
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
                                                            size={11}
                                                            strokeWidth={2.5}
                                                        />
                                                    </span>
                                                )}
                                                <span
                                                    className="truncate text-xs font-medium"
                                                    style={{
                                                        color:
                                                            place.categoryColor ??
                                                            '#475569',
                                                    }}
                                                >
                                                    {place.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 확정 버튼 */}
                {canWrite && (
                    <button
                        type="button"
                        onClick={() => void toggleStatus()}
                        disabled={toggling}
                        className={`ml-1 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition disabled:opacity-50 ${
                            isConfirmed
                                ? 'text-green-600 hover:bg-green-100'
                                : 'text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        {isConfirmed ? (
                            <CheckCircleIcon size={14} />
                        ) : (
                            <CircleIcon size={14} />
                        )}
                        {isConfirmed ? '확정 취소' : '확정하기'}
                    </button>
                )}
            </div>

            {error && <p className="px-3 pb-1 text-xs text-red-500">{error}</p>}

            {/* 출발지 행 + 아이템 목록 (접으면 함께 숨김) */}
            {!collapsed && (
                <DepartureRow
                    departure={day.departure}
                    dayNumber={day.dayNumber}
                    tripId={tripId}
                    dayId={String(day.id)}
                    canWrite={canWrite}
                    lodgingPlaces={allPlaces.filter(
                        (p) => p.category === 'lodging',
                    )}
                    savedPlaces={allPlaces}
                    days={days}
                    onDaysChange={onDaysChange}
                />
            )}

            {!collapsed && (
                <div
                    className={`flex flex-col gap-0.5 px-2.5 ${isDragging ? 'pb-12' : 'pb-2.5'}`}
                >
                    <SortableContext
                        id={String(day.id)}
                        items={day.items.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {day.items.length === 0 ? (
                            <div
                                className={`flex min-h-12 items-center justify-center rounded-lg border-2 border-dashed text-xs transition-[border-color,background-color,color] duration-150 ${
                                    isOver
                                        ? 'border-brand bg-brand/10 text-brand'
                                        : isDragging
                                          ? 'border-brand/50 bg-brand/5 text-brand/60'
                                          : 'border-slate-200 text-slate-300'
                                }`}
                            >
                                {isOver
                                    ? '여기에 놓기'
                                    : isDragging
                                      ? '여기에 드롭'
                                      : canWrite
                                        ? '장소를 드래그하거나 + 추가'
                                        : '장소 없음'}
                            </div>
                        ) : (
                            <>
                                <ItineraryDropZone
                                    dayId={String(day.id)}
                                    insertionIndex={0}
                                    visible={isDragging}
                                />
                                {day.items.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        <ScheduleItemCard
                                            item={item}
                                            tripId={tripId}
                                            canWrite={canWrite}
                                            days={days}
                                            currentDayId={String(day.id)}
                                            visitOrder={index + 1}
                                            dayColor={getItineraryDayColor(
                                                day.dayNumber,
                                            )}
                                            onDaysChange={onDaysChange}
                                            highlighted={
                                                hoveredItemId ===
                                                String(item.id)
                                            }
                                            selected={
                                                selectedItemId ===
                                                String(item.id)
                                            }
                                            onHoverChange={onItemHoverChange}
                                            onFocusItem={onItemFocus}
                                        />
                                        {index < day.items.length - 1 &&
                                        !isDragging ? (
                                            <TransportConnector
                                                item={item}
                                                nextItem={day.items[index + 1]}
                                                tripId={tripId}
                                                canWrite={canWrite}
                                                days={days}
                                                onDaysChange={onDaysChange}
                                            />
                                        ) : (
                                            <ItineraryDropZone
                                                dayId={String(day.id)}
                                                insertionIndex={index + 1}
                                                visible={isDragging}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </SortableContext>
                </div>
            )}
        </section>
    )
}
