'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
    AdvancedMarker,
    Map as GoogleMap,
    Polyline,
    useApiIsLoaded,
    useMap,
} from '@vis.gl/react-google-maps'
import {
    ArrowUpIcon,
    CalendarPlusIcon,
    MessageCircleIcon,
} from 'lucide-react'
import { CategoryIcon, Place } from '@/entities/trip'
import type { ItineraryDay } from '@/entities/trip'

const JEJU_CENTER = { lat: 33.489, lng: 126.4983 }
const DEFAULT_ZOOM = 10

// Day별 경로선 색상 (Day 1부터 순서대로)
const DAY_ROUTE_COLORS = [
    '#f97316', // orange (brand)
    '#10b981', // emerald
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ef4444', // red
    '#eab308', // yellow
    '#06b6d4', // cyan
    '#ec4899', // pink
]

type Props = {
    places: Place[]
    selectedId: string | null
    onSelect: (id: string) => void
    days?: ItineraryDay[]
    onAddToSchedule?: (placeId: string, dayId: string) => Promise<void>
}

export function MapCanvas({ places, selectedId, onSelect, days, onAddToSchedule }: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 px-6 text-center">
                <p className="text-sm text-slate-500">
                    지도를 표시하려면 Google Maps API 키를 설정해 주세요.
                </p>
            </div>
        )
    }

    return (
        <GoogleMapCanvas
            places={places}
            selectedId={selectedId}
            onSelect={onSelect}
            days={days}
            onAddToSchedule={onAddToSchedule}
        />
    )
}

function GoogleMapCanvas({
    places,
    selectedId,
    onSelect,
    days,
    onAddToSchedule,
}: Pick<Props, 'places' | 'selectedId' | 'onSelect' | 'days' | 'onAddToSchedule'>) {
    const isLoaded = useApiIsLoaded()
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
    const center = calculateCenter(places)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [dayPickerPlaceId, setDayPickerPlaceId] = useState<string | null>(null)
    const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)
    const [scheduleError, setScheduleError] = useState<string | null>(null)
    const [selectedRouteDay, setSelectedRouteDay] = useState<number | null>(null)

    const scheduledPlaceMap = useMemo(() => {
        const map = new Map<string, number>()
        for (const day of days ?? []) {
            for (const item of day.items) {
                if (item.tripPlaceId != null) {
                    map.set(String(item.tripPlaceId), day.dayNumber)
                }
            }
        }
        return map
    }, [days])

    // 일정에 배치된 장소 순서 맵: tripPlaceId → { order, color }
    const placeOrderMap = useMemo(() => {
        if (!days) {
            return new Map<
                string,
                { order: number; color: string; dayNumber: number }
            >()
        }
        const map = new Map<
            string,
            { order: number; color: string; dayNumber: number }
        >()
        for (const day of days) {
            const color =
                DAY_ROUTE_COLORS[(day.dayNumber - 1) % DAY_ROUTE_COLORS.length]
            day.items.forEach((item, index) => {
                if (item.tripPlaceId != null) {
                    map.set(String(item.tripPlaceId), {
                        order: index + 1,
                        color,
                        dayNumber: day.dayNumber,
                    })
                }
            })
        }
        return map
    }, [days])

    // 확정 여부와 관계없이 일정에 배치된 Day의 경로 목록
    const itineraryRoutes = useMemo(() => {
        if (!days) return []
        return days
            .map((day) => ({
                dayId: day.id,
                dayNumber: day.dayNumber,
                confirmed: day.status === 'CONFIRMED',
                color: DAY_ROUTE_COLORS[
                    (day.dayNumber - 1) % DAY_ROUTE_COLORS.length
                ],
                points: day.items
                    .filter((item) => item.lat !== 0 || item.lng !== 0)
                    .map((item) => ({
                        lat: item.lat,
                        lng: item.lng,
                        placeName: item.placeName ?? '장소',
                        transportMinutes: item.transportMinutes,
                        transportMeters: item.transportMeters,
                    })),
            }))
            .filter((route) => route.points.length > 0)
    }, [days])
    const visibleRoutes =
        selectedRouteDay == null
            ? itineraryRoutes
            : itineraryRoutes.filter(
                  (route) => route.dayNumber === selectedRouteDay,
              )

    if (!isLoaded) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <p className="text-sm text-slate-400">지도 로딩 중...</p>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full">
            <GoogleMap
                defaultCenter={center}
                defaultZoom={DEFAULT_ZOOM}
                mapId={mapId}
                gestureHandling="greedy"
                streetViewControl={false}
                style={{ width: '100%', height: '100%' }}
            >
                <MapController places={places} selectedId={selectedId} />
                <RouteLayer routes={visibleRoutes} />
                {places.map((place) => {
                const isSelected = place.id === selectedId
                const isHovered = place.id === hoveredId
                const scheduledDayNumber = scheduledPlaceMap.get(place.id)
                const scheduled = placeOrderMap.get(place.id)
                const belongsToVisibleRoute =
                    selectedRouteDay == null ||
                    scheduled == null ||
                    scheduled.dayNumber === selectedRouteDay
                return (
                    <AdvancedMarker
                        key={place.id}
                        position={{ lat: place.lat, lng: place.lng }}
                        onClick={() => onSelect(place.id)}
                        zIndex={isHovered ? 20 : isSelected ? 10 : scheduled ? 5 : 1}
                    >
                        <div
                            className={`relative flex flex-col items-center transition-opacity ${
                                belongsToVisibleRoute ? 'opacity-100' : 'opacity-25'
                            }`}
                            onMouseEnter={() => setHoveredId(place.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {/* 호버 인포카드 */}
                            {isHovered && !isSelected && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 overflow-hidden rounded-xl bg-white shadow-xl border border-slate-100 pointer-events-none">
                                    {place.image && (
                                        <img
                                            src={place.image}
                                            alt={place.name}
                                            className="h-24 w-full object-cover"
                                        />
                                    )}
                                    <div className="p-2.5">
                                        <p className="truncate text-xs font-bold text-slate-800">
                                            {place.name}
                                        </p>
                                        <span
                                            className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                            style={{
                                                backgroundColor:
                                                    place.categoryColor + '20',
                                                color: place.categoryColor,
                                            }}
                                        >
                                            {place.categoryName}
                                        </span>
                                        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-400">
                                            {place.address}
                                        </p>
                                        {place.commentCount > 0 && (
                                            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                                                <MessageCircleIcon size={10} />
                                                댓글 {place.commentCount}개
                                            </p>
                                        )}
                                    </div>
                                    {/* 말풍선 꼬리 */}
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-white" />
                                </div>
                            )}

                            {/* 마커 */}
                            <div
                                className={`relative flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform ${
                                    isSelected
                                        ? 'h-10 w-10 scale-125 text-base'
                                        : isHovered
                                          ? 'h-8 w-8 scale-110 text-sm'
                                          : 'h-8 w-8 text-sm'
                                }`}
                                style={{
                                    backgroundColor: scheduled
                                        ? scheduled.color
                                        : place.categoryColor,
                                }}
                            >
                                {scheduled ? (
                                    <span className="font-extrabold text-white">
                                        {scheduled.order}
                                    </span>
                                ) : (
                                    <CategoryIcon
                                        icon={place.categoryIcon}
                                        size={isSelected ? 20 : 16}
                                        className="text-white"
                                        strokeWidth={2.3}
                                    />
                                )}
                            </div>
                            {isSelected && (
                                <div className="mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                                    {place.image && (
                                        <img
                                            src={place.image}
                                            alt={place.name}
                                            className="h-20 w-full object-cover"
                                        />
                                    )}
                                    <div className="px-2.5 pb-2.5 pt-2">
                                        <p className="truncate text-xs font-bold text-slate-800">
                                            {place.name}
                                        </p>
                                        {place.categoryName && (
                                            <span
                                                className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                                style={{
                                                    backgroundColor: place.categoryColor + '20',
                                                    color: place.categoryColor,
                                                }}
                                            >
                                                {place.categoryName}
                                            </span>
                                        )}
                                        {scheduledDayNumber != null ? (
                                            <div className="mt-2 flex items-center justify-center rounded-lg bg-green-50 py-1.5 text-[11px] font-bold text-green-600">
                                                Day {scheduledDayNumber} · 일정 등록됨
                                            </div>
                                        ) : onAddToSchedule && days && days.length > 0 ? (
                                            <div className="relative mt-2">
                                                <button
                                                    type="button"
                                                    disabled={addingPlaceId === place.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setScheduleError(null)
                                                        setDayPickerPlaceId(
                                                            dayPickerPlaceId === place.id ? null : place.id
                                                        )
                                                    }}
                                                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-brand py-1.5 text-[11px] font-bold text-white transition hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60"
                                                >
                                                    <CalendarPlusIcon size={11} />
                                                    {addingPlaceId === place.id
                                                        ? '추가 중...'
                                                        : '일정에 추가'}
                                                </button>
                                                {dayPickerPlaceId === place.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setDayPickerPlaceId(null)
                                                            }}
                                                        />
                                                        <div className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                            <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                                추가할 Day
                                                            </p>
                                                            <div className="max-h-40 overflow-y-auto">
                                                                {days.map((day) => (
                                                                    <button
                                                                        key={day.id}
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation()
                                                                            setDayPickerPlaceId(null)
                                                                            setAddingPlaceId(place.id)
                                                                            setScheduleError(null)
                                                                            try {
                                                                                await onAddToSchedule(
                                                                                    place.id,
                                                                                    String(day.id),
                                                                                )
                                                                            } catch {
                                                                                setScheduleError(
                                                                                    '일정에 추가하지 못했습니다.',
                                                                                )
                                                                            } finally {
                                                                                setAddingPlaceId(null)
                                                                            }
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
                                                {scheduleError && (
                                                    <p className="mt-1 text-center text-[10px] font-medium text-red-500">
                                                        {scheduleError}
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    </AdvancedMarker>
                )
                })}
            </GoogleMap>

            {itineraryRoutes.length > 0 && (
                <div className="absolute left-3 top-3 z-30 flex max-w-[calc(100%-24px)] gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
                    <button
                        type="button"
                        onClick={() => setSelectedRouteDay(null)}
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                            selectedRouteDay == null
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        전체
                    </button>
                    {itineraryRoutes.map((route) => (
                        <button
                            key={route.dayId}
                            type="button"
                            onClick={() =>
                                setSelectedRouteDay(route.dayNumber)
                            }
                            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                                selectedRouteDay === route.dayNumber
                                    ? 'bg-slate-100 text-slate-800'
                                    : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: route.color }}
                            />
                            Day {route.dayNumber}
                        </button>
                    ))}
                </div>
            )}

            {itineraryRoutes.length > 0 && (
                <p className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium text-slate-500 shadow">
                    예상 직선 동선 · 화살표에 마우스를 올려 이동 정보 확인
                </p>
            )}
        </div>
    )
}

// 일정 Day 경로선 렌더링 (확정 전은 연하게, 확정 후는 선명하게 표시)
function RouteLayer({
    routes,
}: {
    routes: Array<{
        points: Array<{
            lat: number
            lng: number
            placeName: string
            transportMinutes: number | null
            transportMeters: number | null
        }>
        color: string
        dayId: string
        dayNumber: number
        confirmed: boolean
    }>
}) {
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)

    return (
        <>
            {routes.map((route) => {
                const path = route.points.map(({ lat, lng }) => ({ lat, lng }))
                return (
                    <React.Fragment key={route.dayId}>
                        {path.length >= 2 && (
                            <Polyline
                                path={path}
                                strokeColor={route.color}
                                strokeOpacity={route.confirmed ? 0.9 : 0.65}
                                strokeWeight={route.confirmed ? 5 : 4}
                                geodesic
                            />
                        )}
                        {route.points.slice(0, -1).map((point, index) => {
                            const next = route.points[index + 1]
                            const segmentId = `${route.dayId}-${index}`
                            const midpoint = {
                                lat: (point.lat + next.lat) / 2,
                                lng: (point.lng + next.lng) / 2,
                            }
                            const angle = getBearing(point, next)
                            return (
                                <AdvancedMarker
                                    key={segmentId}
                                    position={midpoint}
                                    zIndex={5}
                                    onMouseEnter={() =>
                                        setHoveredSegment(segmentId)
                                    }
                                    onMouseLeave={() =>
                                        setHoveredSegment(null)
                                    }
                                >
                                    <div className="relative">
                                        {hoveredSegment === segmentId && (
                                            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center shadow-lg">
                                                <p className="truncate text-[11px] font-bold text-slate-700">
                                                    {point.placeName} → {next.placeName}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                    {formatRouteSegment(point)}
                                                </p>
                                            </div>
                                        )}
                                        <span
                                            className="flex h-5 w-5 items-center justify-center drop-shadow-[0_1px_1px_rgba(255,255,255,1)]"
                                            style={{
                                                color: route.color,
                                                transform: `rotate(${angle}deg)`,
                                            }}
                                        >
                                            <ArrowUpIcon size={15} strokeWidth={4} />
                                        </span>
                                    </div>
                                </AdvancedMarker>
                            )
                        })}
                    </React.Fragment>
                )
            })}
        </>
    )
}

function formatRouteSegment({
    transportMinutes,
    transportMeters,
}: {
    transportMinutes: number | null
    transportMeters: number | null
}): string {
    if (transportMinutes == null && transportMeters == null) {
        return '이동 정보 미설정'
    }
    const distance =
        transportMeters == null
            ? null
            : transportMeters >= 1000
              ? `${(transportMeters / 1000).toFixed(1)}km`
              : `${transportMeters}m`
    return [
        transportMinutes == null ? null : `예상 ${transportMinutes}분`,
        distance,
    ]
        .filter(Boolean)
        .join(' · ')
}

function getBearing(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
): number {
    const latitude1 = (from.lat * Math.PI) / 180
    const latitude2 = (to.lat * Math.PI) / 180
    const longitudeDelta = ((to.lng - from.lng) * Math.PI) / 180
    const y = Math.sin(longitudeDelta) * Math.cos(latitude2)
    const x =
        Math.cos(latitude1) * Math.sin(latitude2) -
        Math.sin(latitude1) *
            Math.cos(latitude2) *
            Math.cos(longitudeDelta)
    return (Math.atan2(y, x) * 180) / Math.PI
}

// selectedId가 바뀌면 해당 장소로 지도 이동
function MapController({
    places,
    selectedId,
}: {
    places: Place[]
    selectedId: string | null
}) {
    const map = useMap()

    useEffect(() => {
        if (!map || places.length === 0) return

        if (places.length === 1) {
            map.setCenter({ lat: places[0].lat, lng: places[0].lng })
            map.setZoom(14)
            return
        }

        const latitudes = places.map((place) => place.lat)
        const longitudes = places.map((place) => place.lng)
        map.fitBounds({
            north: Math.max(...latitudes),
            south: Math.min(...latitudes),
            east: Math.max(...longitudes),
            west: Math.min(...longitudes),
        })
    }, [map, places])

    useEffect(() => {
        if (!map || !selectedId) return
        const place = places.find((p) => p.id === selectedId)
        if (place) map.panTo({ lat: place.lat, lng: place.lng })
    }, [map, selectedId, places])

    return null
}

function calculateCenter(places: Place[]): { lat: number; lng: number } {
    if (places.length === 0) return JEJU_CENTER
    const lat = places.reduce((sum, p) => sum + p.lat, 0) / places.length
    const lng = places.reduce((sum, p) => sum + p.lng, 0) / places.length
    return { lat, lng }
}
