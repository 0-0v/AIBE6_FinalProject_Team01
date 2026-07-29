'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
    AdvancedMarker,
    Map as GoogleMap,
    Polyline,
    useApiIsLoaded,
    useMap,
    useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { ArrowUpIcon, CalendarPlusIcon, MessageCircleIcon } from 'lucide-react'
import { Place } from '@/entities/trip'
import type { ItineraryDay } from '@/entities/trip'
import { MapRouteFilter } from './map-route-filter'
import { ItineraryMapMarker } from './itinerary-map-marker'
import { MapTypeToggle, useMapDisplayType } from './map-type-toggle'
import {
    getItineraryDayColor,
    hasMapCoordinates,
    ITINERARY_MAP_BOUNDS,
    ITINERARY_MAP_MIN_ZOOM,
} from '../lib/itinerary-map'

const JEJU_CENTER = { lat: 33.489, lng: 126.4983 }
const DEFAULT_ZOOM = 10
const DESTINATION_FOCUS_ZOOM = 12

type GeocoderResponse = {
    results: Array<{
        geometry: {
            location: {
                toJSON: () => { lat: number; lng: number }
            }
        }
    }>
}

type Props = {
    places: Place[]
    initialLocation?: string | null
    selectedId: string | null
    onSelect: (id: string) => void
    onDeselect: () => void
    days?: ItineraryDay[]
    onAddToSchedule?: (placeId: string, dayId: string) => Promise<void>
}

export function MapCanvas({
    places,
    initialLocation,
    selectedId,
    onSelect,
    onDeselect,
    days,
    onAddToSchedule,
}: Props) {
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
            initialLocation={initialLocation}
            selectedId={selectedId}
            onSelect={onSelect}
            onDeselect={onDeselect}
            days={days}
            onAddToSchedule={onAddToSchedule}
        />
    )
}

function GoogleMapCanvas({
    places,
    initialLocation,
    selectedId,
    onSelect,
    onDeselect,
    days,
    onAddToSchedule,
}: Pick<
    Props,
    | 'places'
    | 'initialLocation'
    | 'selectedId'
    | 'onSelect'
    | 'onDeselect'
    | 'days'
    | 'onAddToSchedule'
>) {
    const isLoaded = useApiIsLoaded()
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
    const center = calculateCenter(places)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [dayPickerPlaceId, setDayPickerPlaceId] = useState<string | null>(
        null,
    )
    const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)
    const [scheduleError, setScheduleError] = useState<string | null>(null)
    const [selectedRouteDay, setSelectedRouteDay] = useState<number | null>(
        null,
    )
    const [mapDisplayType, setMapDisplayType] = useMapDisplayType()

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
            const color = getItineraryDayColor(day.dayNumber)
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
                color: getItineraryDayColor(day.dayNumber),
                points: day.items.filter(hasMapCoordinates).map((item) => ({
                    lat: item.lat,
                    lng: item.lng,
                    placeName: item.placeName ?? '장소',
                    transportMinutes: item.transportMinutes,
                    transportMeters: item.transportMeters,
                    transportMode: item.transportMode,
                    transportDetail: item.transportDetail,
                })),
            }))
            .filter((route) => route.points.length > 0)
    }, [days])
    const activeRouteDay =
        selectedRouteDay != null &&
        itineraryRoutes.some((route) => route.dayNumber === selectedRouteDay)
            ? selectedRouteDay
            : null
    const visibleRoutes =
        activeRouteDay == null
            ? itineraryRoutes
            : itineraryRoutes.filter(
                  (route) => route.dayNumber === activeRouteDay,
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
                minZoom={ITINERARY_MAP_MIN_ZOOM}
                restriction={{
                    latLngBounds: ITINERARY_MAP_BOUNDS,
                    strictBounds: true,
                }}
                mapId={mapId}
                mapTypeId={mapDisplayType}
                mapTypeControl={false}
                gestureHandling="greedy"
                streetViewControl={false}
                style={{ width: '100%', height: '100%' }}
                onClick={() => {
                    setHoveredId(null)
                    setDayPickerPlaceId(null)
                    setScheduleError(null)
                    onDeselect()
                }}
            >
                <MapController
                    places={places}
                    initialLocation={initialLocation}
                    selectedId={selectedId}
                />
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
                            zIndex={
                                isHovered
                                    ? 20
                                    : isSelected
                                      ? 10
                                      : scheduled
                                        ? 5
                                        : 1
                            }
                        >
                            <div
                                className={`relative flex flex-col items-center transition-opacity ${
                                    belongsToVisibleRoute
                                        ? 'opacity-100'
                                        : 'opacity-25'
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
                                                        place.categoryColor +
                                                        '20',
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
                                                    <MessageCircleIcon
                                                        size={10}
                                                    />
                                                    댓글 {place.commentCount}개
                                                </p>
                                            )}
                                        </div>
                                        {/* 말풍선 꼬리 */}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-white" />
                                    </div>
                                )}

                                {/* 마커 */}
                                <ItineraryMapMarker
                                    color={
                                        scheduled
                                            ? scheduled.color
                                            : place.categoryColor
                                    }
                                    label={scheduled?.order}
                                    categoryIcon={
                                        scheduled ? null : place.categoryIcon
                                    }
                                    selected={isSelected}
                                    hovered={isHovered}
                                />
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
                                                        backgroundColor:
                                                            place.categoryColor +
                                                            '20',
                                                        color: place.categoryColor,
                                                    }}
                                                >
                                                    {place.categoryName}
                                                </span>
                                            )}
                                            {scheduledDayNumber != null ? (
                                                <div className="mt-2 flex items-center justify-center rounded-lg bg-green-50 py-1.5 text-[11px] font-bold text-green-600">
                                                    Day {scheduledDayNumber} ·
                                                    일정 등록됨
                                                </div>
                                            ) : onAddToSchedule &&
                                              days &&
                                              days.length > 0 ? (
                                                <div className="relative mt-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            addingPlaceId ===
                                                            place.id
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setScheduleError(
                                                                null,
                                                            )
                                                            setDayPickerPlaceId(
                                                                dayPickerPlaceId ===
                                                                    place.id
                                                                    ? null
                                                                    : place.id,
                                                            )
                                                        }}
                                                        className="flex w-full items-center justify-center gap-1 rounded-lg bg-brand py-1.5 text-[11px] font-bold text-white transition hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60"
                                                    >
                                                        <CalendarPlusIcon
                                                            size={11}
                                                        />
                                                        {addingPlaceId ===
                                                        place.id
                                                            ? '추가 중...'
                                                            : '일정에 추가'}
                                                    </button>
                                                    {dayPickerPlaceId ===
                                                        place.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-40"
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation()
                                                                    setDayPickerPlaceId(
                                                                        null,
                                                                    )
                                                                }}
                                                            />
                                                            <div className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                                <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                                    추가할 Day
                                                                </p>
                                                                <div className="max-h-40 overflow-y-auto">
                                                                    {days.map(
                                                                        (
                                                                            day,
                                                                        ) => (
                                                                            <button
                                                                                key={
                                                                                    day.id
                                                                                }
                                                                                type="button"
                                                                                onClick={async (
                                                                                    e,
                                                                                ) => {
                                                                                    e.stopPropagation()
                                                                                    setDayPickerPlaceId(
                                                                                        null,
                                                                                    )
                                                                                    setAddingPlaceId(
                                                                                        place.id,
                                                                                    )
                                                                                    setScheduleError(
                                                                                        null,
                                                                                    )
                                                                                    try {
                                                                                        await onAddToSchedule(
                                                                                            place.id,
                                                                                            String(
                                                                                                day.id,
                                                                                            ),
                                                                                        )
                                                                                    } catch {
                                                                                        setScheduleError(
                                                                                            '일정에 추가하지 못했습니다.',
                                                                                        )
                                                                                    } finally {
                                                                                        setAddingPlaceId(
                                                                                            null,
                                                                                        )
                                                                                    }
                                                                                }}
                                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                                                            >
                                                                                <span className="text-xs font-bold text-brand">
                                                                                    Day{' '}
                                                                                    {
                                                                                        day.dayNumber
                                                                                    }
                                                                                </span>
                                                                                <span className="truncate text-[10px] text-slate-400">
                                                                                    {new Date(
                                                                                        day.itineraryDate +
                                                                                            'T00:00:00',
                                                                                    ).toLocaleDateString(
                                                                                        'ko-KR',
                                                                                        {
                                                                                            month: 'numeric',
                                                                                            day: 'numeric',
                                                                                        },
                                                                                    )}
                                                                                </span>
                                                                                {day
                                                                                    .items
                                                                                    .length >
                                                                                    0 && (
                                                                                    <span className="ml-auto shrink-0 text-[10px] text-slate-300">
                                                                                        {
                                                                                            day
                                                                                                .items
                                                                                                .length
                                                                                        }

                                                                                        개
                                                                                    </span>
                                                                                )}
                                                                            </button>
                                                                        ),
                                                                    )}
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

            <MapTypeToggle
                value={mapDisplayType}
                onChange={setMapDisplayType}
            />

            {itineraryRoutes.length > 0 && (
                <MapRouteFilter
                    routes={itineraryRoutes}
                    selectedDay={activeRouteDay}
                    onSelect={setSelectedRouteDay}
                />
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
            transportMode: string | null
            transportDetail: string | null
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
                                    onMouseLeave={() => setHoveredSegment(null)}
                                >
                                    <div className="relative">
                                        {hoveredSegment === segmentId && (
                                            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center shadow-lg">
                                                <p className="truncate text-[11px] font-bold text-slate-700">
                                                    {point.placeName} →{' '}
                                                    {next.placeName}
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
                                            <ArrowUpIcon
                                                size={15}
                                                strokeWidth={4}
                                            />
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
    transportMode,
    transportDetail,
}: {
    transportMinutes: number | null
    transportMeters: number | null
    transportMode: string | null
    transportDetail: string | null
}): string {
    if (
        transportMinutes == null &&
        transportMeters == null &&
        transportMode == null
    ) {
        return '이동 정보 미설정'
    }
    const distance =
        transportMeters == null
            ? null
            : transportMeters >= 1000
              ? `${(transportMeters / 1000).toFixed(1)}km`
              : `${transportMeters}m`
    return [
        transportMode,
        transportMinutes == null ? null : `예상 ${transportMinutes}분`,
        distance,
        transportDetail,
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
        Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(longitudeDelta)
    return (Math.atan2(y, x) * 180) / Math.PI
}

// selectedId가 바뀌면 해당 장소로 지도 이동
function MapController({
    places,
    initialLocation,
    selectedId,
}: {
    places: Place[]
    initialLocation?: string | null
    selectedId: string | null
}) {
    const map = useMap()
    const geocodingLibrary = useMapsLibrary('geocoding')

    useEffect(() => {
        if (!map) return

        if (places.length === 0) {
            const destination = initialLocation?.trim()
            if (
                !destination ||
                destination === '장소 미정' ||
                !geocodingLibrary
            ) {
                return
            }

            let active = true
            const geocoder = new geocodingLibrary.Geocoder()
            void geocoder
                .geocode({ address: destination })
                .then(({ results }: GeocoderResponse) => {
                    if (!active || results.length === 0) return
                    const geometry = results[0].geometry
                    map.setCenter(geometry.location.toJSON())
                    map.setZoom(DESTINATION_FOCUS_ZOOM)
                })
                .catch(() => {
                    // 지역 검색 실패 시 기존 기본 지도 위치를 유지한다.
                })

            return () => {
                active = false
            }
        }

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
    }, [geocodingLibrary, initialLocation, map, places])

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
