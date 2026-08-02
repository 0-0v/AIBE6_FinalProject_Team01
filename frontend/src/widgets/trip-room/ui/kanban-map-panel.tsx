'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    ExternalLinkIcon,
    MapIcon,
    NavigationIcon,
} from 'lucide-react'
import {
    AdvancedMarker,
    Map as GoogleMap,
    useApiIsLoaded,
    useMap,
} from '@vis.gl/react-google-maps'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import { buildGoogleMapsPlaceUrl } from '../lib/google-maps-place-url'
import {
    getItineraryDayColor,
    hasMapCoordinates,
    ITINERARY_MAP_BOUNDS,
    ITINERARY_MAP_MIN_ZOOM,
} from '../lib/itinerary-map'
import { formatTimeRange } from '../lib/itinerary-time'
import { formatTransportSummary } from '../lib/itinerary-transport'
import { MapTypeToggle, useMapDisplayType } from './map-type-toggle'
import { ItineraryMapMarker } from './itinerary-map-marker'
import { ItineraryRoutePolyline } from './itinerary-route-polyline'

const DEFAULT_CENTER = { lat: 33.489, lng: 126.4983 }
const CATEGORY_BADGE_MIN_ZOOM = 10

function FocusedItineraryItemCard({
    dayNumber,
    order,
    item,
    nextItem,
    place,
}: {
    dayNumber: number
    order: number
    item: ItineraryItem
    nextItem: ItineraryItem | null
    place?: Place
}) {
    return (
        <div className="itinerary-map-card-enter absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl">
            <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">
                    {item.placeName ?? '장소'}
                </p>
                <span className="shrink-0 text-[10px] font-bold text-brand">
                    Day {dayNumber} · {order}번째
                </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-600">
                <ClockIcon size={11} aria-hidden />
                {formatTimeRange(item.startTime, item.endTime)}
            </p>
            {nextItem != null && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-slate-500">
                    <NavigationIcon
                        size={11}
                        className="mt-px shrink-0"
                        aria-hidden
                    />
                    <span className="line-clamp-2">
                        다음 장소까지 {formatTransportSummary(item)}
                    </span>
                </p>
            )}
            {item.memo && (
                <p className="mt-1.5 line-clamp-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
                    메모 · {item.memo}
                </p>
            )}
            <a
                href={buildGoogleMapsPlaceUrl({
                    name: item.placeName ?? '장소',
                    lat: item.lat,
                    lng: item.lng,
                    googlePlaceId: place?.googlePlaceId,
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
            >
                Google Maps에서 최신 정보 확인
                <ExternalLinkIcon size={10} aria-hidden />
            </a>
        </div>
    )
}

function FocusedSavedPlaceCard({ place }: { place: Place }) {
    return (
        <div className="itinerary-map-card-enter absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl">
            <p className="truncate text-xs font-bold text-slate-800">
                {place.name}
            </p>
            {place.address && (
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-400">
                    {place.address}
                </p>
            )}
            <a
                href={buildGoogleMapsPlaceUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
            >
                Google Maps에서 최신 정보 확인
                <ExternalLinkIcon size={10} aria-hidden />
            </a>
        </div>
    )
}

type Props = {
    days: ItineraryDay[]
    places: Place[]
    activeDragId: string | null
    previewDayId: string | null
    hoveredItemId: string | null
    onItemHoverChange: (itemId: string | null) => void
    focusedItemId: string | null
    focusedPlaceId: string | null
    highlightedPlaceId?: string | null
    onItemFocus: (itemId: string | null) => void
    onPlaceFocus: (placeId: string | null) => void
}

function MapFocusController({
    lat,
    lng,
}: {
    lat: number | null
    lng: number | null
}) {
    const map = useMap()

    useEffect(() => {
        if (map == null || lat == null || lng == null) return
        map.panTo({ lat, lng })
        if ((map.getZoom() ?? 0) < 14) {
            map.setZoom(14)
        }

        const animationFrame = window.requestAnimationFrame(() => {
            const mapHeight = map.getDiv().clientHeight
            const focusOffset = Math.min(
                96,
                Math.max(48, mapHeight * 0.25),
            )
            map.panBy(0, -focusOffset)
        })

        return () => window.cancelAnimationFrame(animationFrame)
    }, [lat, lng, map])

    return null
}

function MapContent({
    days,
    places,
    activeDragId,
    previewDayId,
    hoveredItemId,
    onItemHoverChange,
    focusedItemId,
    focusedPlaceId,
    highlightedPlaceId = null,
    onItemFocus,
    onPlaceFocus,
}: Props) {
    const isLoaded = useApiIsLoaded()
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'
    const [mapDisplayType, setMapDisplayType] = useMapDisplayType()
    const [showCategoryBadges, setShowCategoryBadges] = useState(true)

    const allItems = useMemo(() => days.flatMap((d) => d.items), [days])
    const placeById = useMemo(
        () => new Map(places.map((place) => [String(place.id), place])),
        [places],
    )

    const center = useMemo(() => {
        const valid = allItems.filter(hasMapCoordinates)
        if (valid.length === 0) return DEFAULT_CENTER
        return {
            lat: valid.reduce((s, i) => s + i.lat, 0) / valid.length,
            lng: valid.reduce((s, i) => s + i.lng, 0) / valid.length,
        }
    }, [allItems])

    const segments = useMemo(
        () =>
            days.flatMap((day) => {
                const color = getItineraryDayColor(day.dayNumber)
                const itemsWithCoords = day.items.filter(hasMapCoordinates)
                return itemsWithCoords.slice(0, -1).map((item, index) => ({
                    key: `${day.id}-${item.id}`,
                    color,
                    fromItemId: String(item.id),
                    from: { lat: item.lat, lng: item.lng },
                    to: {
                        lat: itemsWithCoords[index + 1].lat,
                        lng: itemsWithCoords[index + 1].lng,
                    },
                }))
            }),
        [days],
    )

    const previewDay = days.find((day) => String(day.id) === previewDayId)
    const previewDayNumber = previewDay?.dayNumber ?? null
    const draggedItem =
        activeDragId != null && !activeDragId.startsWith('place-')
            ? allItems.find((item) => String(item.id) === activeDragId)
            : null
    const draggedPlace =
        activeDragId?.startsWith('place-') === true
            ? places.find(
                  (place) =>
                      String(place.id) === activeDragId.replace('place-', ''),
              )
            : null
    const previewPosition =
        draggedItem != null
            ? { lat: draggedItem.lat, lng: draggedItem.lng }
            : draggedPlace != null
              ? { lat: draggedPlace.lat, lng: draggedPlace.lng }
              : null
    const focusedItem =
        focusedItemId == null
            ? null
            : (allItems.find((item) => String(item.id) === focusedItemId) ??
              null)
    const scheduledItemForFocusedPlace =
        focusedPlaceId == null
            ? null
            : (allItems.find(
                  (item) => String(item.tripPlaceId) === focusedPlaceId,
              ) ?? null)
    const effectiveFocusedItem = focusedItem ?? scheduledItemForFocusedPlace
    const effectiveFocusedItemId =
        effectiveFocusedItem == null ? null : String(effectiveFocusedItem.id)

    const focusedNextItemId = useMemo(() => {
        if (effectiveFocusedItemId == null) return null
        for (const day of days) {
            const idx = day.items.findIndex(
                (item) => String(item.id) === effectiveFocusedItemId,
            )
            if (idx >= 0 && idx + 1 < day.items.length) {
                return String(day.items[idx + 1].id)
            }
        }
        return null
    }, [days, effectiveFocusedItemId])
    const focusedPosition =
        effectiveFocusedItem != null && hasMapCoordinates(effectiveFocusedItem)
            ? {
                  lat: effectiveFocusedItem.lat,
                  lng: effectiveFocusedItem.lng,
              }
            : null
    const scheduledPlaceIds = new Set(
        allItems
            .map((item) => item.tripPlaceId)
            .filter((id) => id != null)
            .map(String),
    )
    const unscheduledMapPlaces = places.filter(
        (place) =>
            !scheduledPlaceIds.has(String(place.id)) &&
            activeDragId !== `place-${place.id}` &&
            hasMapCoordinates(place),
    )
    const focusedPlace =
        focusedPlaceId == null
            ? null
            : (places.find((place) => String(place.id) === focusedPlaceId) ??
              null)
    const highlightedPlace =
        highlightedPlaceId == null
            ? null
            : (places.find(
                  (place) => String(place.id) === highlightedPlaceId,
              ) ?? null)
    const activeFocusPosition =
        focusedPosition ??
        (focusedPlace == null
            ? highlightedPlace == null
                ? null
                : { lat: highlightedPlace.lat, lng: highlightedPlace.lng }
            : { lat: focusedPlace.lat, lng: focusedPlace.lng })

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-100">
                <p className="text-sm text-slate-400">지도 로딩 중...</p>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full">
            <GoogleMap
                defaultCenter={center}
                defaultZoom={12}
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
                onCameraChanged={(event) => {
                    const shouldShow =
                        event.detail.zoom >= CATEGORY_BADGE_MIN_ZOOM
                    setShowCategoryBadges((current) =>
                        current === shouldShow ? current : shouldShow,
                    )
                }}
                onClick={() => {
                    onItemHoverChange(null)
                    onItemFocus(null)
                    onPlaceFocus(null)
                }}
            >
                <MapFocusController
                    lat={activeFocusPosition?.lat ?? null}
                    lng={activeFocusPosition?.lng ?? null}
                />
                {segments.map((segment) => {
                    const isFocusMode = effectiveFocusedItemId != null
                    const isFocused =
                        isFocusMode &&
                        segment.fromItemId === effectiveFocusedItemId
                    const segOpacity = isFocusMode
                        ? isFocused
                            ? 1.0
                            : 0.15
                        : 0.9
                    const segWeight = isFocusMode
                        ? isFocused
                            ? 6
                            : 3
                        : 4
                    const path = [segment.from, segment.to]
                    return (
                        <ItineraryRoutePolyline
                            key={segment.key}
                            path={path}
                            color={segment.color}
                            opacity={segOpacity}
                            strokeWeight={segWeight}
                            zIndex={isFocused ? 3 : 2}
                            emphasis={
                                isFocusMode
                                    ? isFocused
                                        ? 'focused'
                                        : 'dimmed'
                                    : 'normal'
                            }
                        />
                    )
                })}
                {days.map((day) => {
                    return day.items
                        .filter(hasMapCoordinates)
                        .map((item, index) => {
                            const isFocusMode = effectiveFocusedItemId != null
                            const isItemFocused =
                                effectiveFocusedItemId === String(item.id)
                            const isNextFocused =
                                focusedNextItemId === String(item.id)
                            const markerOpacity =
                                isFocusMode && !isItemFocused && !isNextFocused
                                    ? 'opacity-25'
                                    : 'opacity-100'
                            return (
                            <AdvancedMarker
                                key={item.id}
                                position={{ lat: item.lat, lng: item.lng }}
                                onMouseEnter={() =>
                                    onItemHoverChange(String(item.id))
                                }
                                onMouseLeave={() => onItemHoverChange(null)}
                                onClick={() =>
                                    onItemFocus(
                                        isItemFocused
                                            ? null
                                            : String(item.id),
                                    )
                                }
                                zIndex={
                                    isItemFocused
                                        ? 100
                                        : hoveredItemId === String(item.id)
                                          ? 90
                                          : 5
                                }
                            >
                                <div className={`relative flex flex-col items-center transition-opacity ${markerOpacity}`}>
                                    {effectiveFocusedItemId ===
                                        String(item.id) && (
                                        <FocusedItineraryItemCard
                                            dayNumber={day.dayNumber}
                                            order={index + 1}
                                            item={item}
                                            nextItem={
                                                day.items[index + 1] ?? null
                                            }
                                            place={
                                                item.tripPlaceId == null
                                                    ? undefined
                                                    : placeById.get(
                                                          String(
                                                              item.tripPlaceId,
                                                          ),
                                                      )
                                            }
                                        />
                                    )}
                                    <ItineraryMapMarker
                                        color={
                                            previewDayNumber != null &&
                                            String(item.id) === activeDragId
                                                ? getItineraryDayColor(
                                                      previewDayNumber,
                                                  )
                                                : getItineraryDayColor(
                                                      day.dayNumber,
                                                  )
                                        }
                                        label={index + 1}
                                        categoryIcon={item.categoryIcon}
                                        categoryColor={item.categoryColor}
                                        categoryLabel={item.categoryName}
                                        showCategoryBadge={showCategoryBadges}
                                        selected={isItemFocused}
                                        hovered={
                                            hoveredItemId === String(item.id)
                                        }
                                    />
                                </div>
                            </AdvancedMarker>
                            )
                        })
                })}
                {unscheduledMapPlaces.map((place) => (
                    <AdvancedMarker
                        key={`saved-${place.id}`}
                        position={{ lat: place.lat, lng: place.lng }}
                        className={
                            highlightedPlaceId === String(place.id)
                                ? 'outline-none focus:outline-none'
                                : undefined
                        }
                        onClick={() => onPlaceFocus(String(place.id))}
                        zIndex={
                            highlightedPlaceId === String(place.id)
                                ? 110
                                : focusedPlaceId === String(place.id)
                                  ? 100
                                  : 1
                        }
                    >
                        <div className="relative flex flex-col items-center">
                            {focusedPlaceId === String(place.id) && (
                                <FocusedSavedPlaceCard place={place} />
                            )}
                            {highlightedPlaceId === String(place.id) ? (
                                <div className="relative flex flex-col items-center outline-none">
                                    <div className="relative z-10 flex size-9 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
                                        추천
                                    </div>
                                    <span
                                        className="-mt-2 size-3 rotate-45 rounded-[2px] bg-brand"
                                        aria-hidden
                                    />
                                </div>
                            ) : (
                                <ItineraryMapMarker
                                    color={place.categoryColor ?? '#64748b'}
                                    categoryIcon={place.categoryIcon}
                                    categoryColor={place.categoryColor}
                                    categoryLabel={place.categoryName}
                                    selected={
                                        focusedPlaceId === String(place.id)
                                    }
                                />
                            )}
                        </div>
                    </AdvancedMarker>
                ))}
                {draggedPlace != null &&
                    previewDayNumber != null &&
                    previewPosition != null &&
                    (previewPosition.lat !== 0 ||
                        previewPosition.lng !== 0) && (
                        <AdvancedMarker position={previewPosition}>
                            <ItineraryMapMarker
                                color={getItineraryDayColor(previewDayNumber)}
                                label="+"
                                categoryIcon={
                                    draggedItem?.categoryIcon ??
                                    draggedPlace?.categoryIcon
                                }
                                categoryColor={
                                    draggedItem?.categoryColor ??
                                    draggedPlace?.categoryColor
                                }
                                categoryLabel={
                                    draggedItem?.categoryName ??
                                    draggedPlace?.categoryName
                                }
                                showCategoryBadge={showCategoryBadges}
                                preview
                            />
                        </AdvancedMarker>
                    )}
            </GoogleMap>
            <MapTypeToggle
                value={mapDisplayType}
                onChange={setMapDisplayType}
            />
        </div>
    )
}

export function KanbanMapPanel(props: Props) {
    const { days, focusedItemId, focusedPlaceId, onItemFocus, onPlaceFocus } =
        props
    const [open, setOpen] = useState(true)
    const effectiveOpen =
        open || focusedItemId != null || focusedPlaceId != null
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const totalItems = days.reduce((sum, d) => sum + d.items.length, 0)

    return (
        <div className="shrink-0 border-b border-slate-200 bg-white">
            <button
                type="button"
                onClick={() => {
                    setOpen(!effectiveOpen)
                    if (effectiveOpen) {
                        onItemFocus(null)
                        onPlaceFocus(null)
                    }
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-slate-50"
            >
                <MapIcon size={14} className="shrink-0 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">
                    지도 보기
                </span>
                {totalItems > 0 && (
                    <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                        {totalItems}개 장소
                    </span>
                )}
                <span className="ml-auto text-slate-400">
                    {effectiveOpen ? (
                        <ChevronUpIcon size={14} />
                    ) : (
                        <ChevronDownIcon size={14} />
                    )}
                </span>
            </button>
            {effectiveOpen && (
                <div className="h-52">
                    {!apiKey ? (
                        <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center">
                            <p className="text-sm text-slate-500">
                                Google Maps API 키를 설정해 주세요.
                            </p>
                        </div>
                    ) : (
                        <MapContent {...props} />
                    )}
                </div>
            )}
        </div>
    )
}
