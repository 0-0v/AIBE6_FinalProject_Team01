/// <reference types="google.maps" />
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import {
    isAnchorPlace,
    resolvePlaceCategoryPresentation,
    resolvePlaceDisplayIcon,
    type ItineraryDay,
    type ItineraryItem,
    type Place,
} from '@/entities/trip'
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
const MARKER_SIMPLIFY_MIN_ZOOM = 12
const FOCUSED_CARD_VIEWPORT_PADDING = 12
const DIMMED_DAY_OPACITY = 'opacity-35'

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
        <div
            data-focused-map-card
            className="itinerary-map-card-enter absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
        >
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
        <div
            data-focused-map-card
            className="itinerary-map-card-enter absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
        >
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
    focusRequestVersion?: number
    highlightedPlaceId?: string | null
    emphasizedDayNumber?: number | null
    onItemFocus: (itemId: string | null) => void
    onPlaceFocus: (placeId: string | null) => void
}

function fitBoundsToPoints(
    map: NonNullable<ReturnType<typeof useMap>>,
    points: Array<{ lat: number; lng: number }>,
    padding?: number,
) {
    const lats = points.map((p) => p.lat)
    const lngs = points.map((p) => p.lng)
    map.fitBounds(
        {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs),
        },
        padding,
    )
}

function MapFocusController({
    lat,
    lng,
    secondaryLat = null,
    secondaryLng = null,
    focusRequestVersion,
}: {
    lat: number | null
    lng: number | null
    secondaryLat?: number | null
    secondaryLng?: number | null
    focusRequestVersion: number
}) {
    const map = useMap()

    useEffect(() => {
        if (map == null || lat == null || lng == null) return

        if (secondaryLat != null && secondaryLng != null) {
            // 클릭한 장소와 다음 장소가 함께 화면에 들어오도록 컴팩하게 맞춘다.
            fitBoundsToPoints(
                map,
                [
                    { lat, lng },
                    { lat: secondaryLat, lng: secondaryLng },
                ],
                80,
            )
        } else {
            map.panTo({ lat, lng })
            if ((map.getZoom() ?? 0) < 14) {
                map.setZoom(14)
            }
        }

        // fitBounds/panTo 전환이 끝나 카드가 실제 위치에 자리잡은 뒤에 여백을 보정해야
        // 정확하므로, 한 프레임 뒤가 아니라 지도가 idle 상태가 된 뒤에 계산한다.
        const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
            const mapRect = map.getDiv().getBoundingClientRect()
            const card = map
                .getDiv()
                .querySelector<HTMLElement>('[data-focused-map-card]')
            if (!card) return

            const cardRect = card.getBoundingClientRect()
            const minX = mapRect.left + FOCUSED_CARD_VIEWPORT_PADDING
            const maxX = mapRect.right - FOCUSED_CARD_VIEWPORT_PADDING
            const minY = mapRect.top + FOCUSED_CARD_VIEWPORT_PADDING
            const maxY = mapRect.bottom - FOCUSED_CARD_VIEWPORT_PADDING
            const contentShiftX =
                cardRect.left < minX
                    ? minX - cardRect.left
                    : cardRect.right > maxX
                      ? maxX - cardRect.right
                      : 0
            const contentShiftY =
                cardRect.top < minY
                    ? minY - cardRect.top
                    : cardRect.bottom > maxY
                      ? maxY - cardRect.bottom
                      : 0

            if (contentShiftX !== 0 || contentShiftY !== 0) {
                map.panBy(-contentShiftX, -contentShiftY)
            }
        })

        return () => google.maps.event.removeListener(listener)
    }, [focusRequestVersion, lat, lng, secondaryLat, secondaryLng, map])

    return null
}

function MapAutoFitController({
    points,
    enabled,
}: {
    points: Array<{ lat: number; lng: number }>
    enabled: boolean
}) {
    const map = useMap()
    const appliedKeyRef = useRef<string | null>(null)
    const key = points.map((p) => `${p.lat}:${p.lng}`).join('|')

    useEffect(() => {
        if (!map || !enabled || points.length === 0) return
        if (appliedKeyRef.current === key) return
        appliedKeyRef.current = key

        if (points.length === 1) {
            map.setCenter(points[0])
            map.setZoom(14)
            return
        }

        fitBoundsToPoints(map, points, 64)
    }, [enabled, key, map, points])

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
    emphasizedDayNumber = null,
    focusRequestVersion = 0,
    onItemFocus,
    onPlaceFocus,
}: Props) {
    const isLoaded = useApiIsLoaded()
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'
    const [mapDisplayType, setMapDisplayType] = useMapDisplayType()
    const [showCategoryBadges, setShowCategoryBadges] = useState(true)
    const [simplifyMarkers, setSimplifyMarkers] = useState(false)

    const allItems = useMemo(() => days.flatMap((d) => d.items), [days])
    const autoFitPoints = useMemo(() => {
        if (emphasizedDayNumber == null) {
            return allItems.filter(hasMapCoordinates)
        }
        const emphasizedDay = days.find(
            (day) => day.dayNumber === emphasizedDayNumber,
        )
        return (emphasizedDay?.items ?? []).filter(hasMapCoordinates)
    }, [allItems, days, emphasizedDayNumber])
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
                    dayNumber: day.dayNumber,
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
    const focusedNextItem =
        focusedNextItemId == null
            ? null
            : (allItems.find((item) => String(item.id) === focusedNextItemId) ??
              null)
    const focusedNextPosition =
        focusedNextItem != null && hasMapCoordinates(focusedNextItem)
            ? { lat: focusedNextItem.lat, lng: focusedNextItem.lng }
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
                    const shouldSimplify =
                        event.detail.zoom < MARKER_SIMPLIFY_MIN_ZOOM
                    setSimplifyMarkers((current) =>
                        current === shouldSimplify ? current : shouldSimplify,
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
                    secondaryLat={
                        focusedPosition != null
                            ? (focusedNextPosition?.lat ?? null)
                            : null
                    }
                    secondaryLng={
                        focusedPosition != null
                            ? (focusedNextPosition?.lng ?? null)
                            : null
                    }
                    focusRequestVersion={focusRequestVersion}
                />
                <MapAutoFitController
                    points={autoFitPoints}
                    enabled={activeFocusPosition == null}
                />
                {segments.map((segment) => {
                    const isFocusMode = effectiveFocusedItemId != null
                    const isFocused =
                        isFocusMode &&
                        segment.fromItemId === effectiveFocusedItemId
                    const isHoveredSegment =
                        hoveredItemId === segment.fromItemId
                    const isEmphasizedDay =
                        emphasizedDayNumber == null ||
                        segment.dayNumber === emphasizedDayNumber
                    const segOpacity = isFocusMode
                        ? isFocused
                            ? 1.0
                            : 0.15
                        : isEmphasizedDay
                          ? 0.9
                          : 0.2
                    const segWeight = isFocusMode
                        ? isFocused
                            ? 6
                            : 3
                        : isEmphasizedDay
                          ? 4
                          : 2
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
                                    : isEmphasizedDay
                                      ? 'normal'
                                      : 'dimmed'
                            }
                            animated={
                                isFocusMode ? isFocused : isHoveredSegment
                            }
                            visible={isFocusMode || isHoveredSegment}
                        />
                    )
                })}
                {days.map((day) => {
                    return day.items
                        .filter(hasMapCoordinates)
                        .map((item, index) => {
                            const associatedPlace =
                                item.tripPlaceId == null
                                    ? undefined
                                    : placeById.get(String(item.tripPlaceId))
                            const itemCategory =
                                associatedPlace?.category ??
                                resolvePlaceCategoryPresentation(
                                    item.categoryType,
                                ).category
                            const itemPlaceType =
                                associatedPlace?.placeType ?? item.placeType
                            const displayIcon = resolvePlaceDisplayIcon(
                                itemCategory,
                                item.categoryIcon,
                                itemPlaceType,
                            )
                            const isFocusMode = effectiveFocusedItemId != null
                            const isItemFocused =
                                effectiveFocusedItemId === String(item.id)
                            const isNextFocused =
                                focusedNextItemId === String(item.id)
                            const isEmphasizedDay =
                                emphasizedDayNumber == null ||
                                day.dayNumber === emphasizedDayNumber
                            const isAnchor = isAnchorPlace(
                                itemCategory,
                                itemPlaceType,
                            )
                            const markerOpacity =
                                isFocusMode && !isItemFocused && !isNextFocused
                                    ? 'opacity-25'
                                    : !isFocusMode && !isEmphasizedDay
                                      ? DIMMED_DAY_OPACITY
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
                                    <div
                                        className={`relative flex flex-col items-center transition-opacity ${markerOpacity}`}
                                    >
                                        {effectiveFocusedItemId ===
                                            String(item.id) && (
                                            <FocusedItineraryItemCard
                                                dayNumber={day.dayNumber}
                                                order={index + 1}
                                                item={item}
                                                nextItem={
                                                    day.items[index + 1] ?? null
                                                }
                                                place={associatedPlace}
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
                                            categoryIcon={displayIcon}
                                            categoryColor={item.categoryColor}
                                            categoryLabel={item.categoryName}
                                            showCategoryBadge={
                                                showCategoryBadges
                                            }
                                            selected={isItemFocused}
                                            hovered={
                                                hoveredItemId ===
                                                String(item.id)
                                            }
                                            simplified={
                                                simplifyMarkers &&
                                                !isNextFocused &&
                                                !isAnchor
                                            }
                                            anchor={isAnchor}
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
                                    color={
                                        place.categoryColor ??
                                        'var(--color-app-text-secondary)'
                                    }
                                    categoryIcon={resolvePlaceDisplayIcon(
                                        place.category,
                                        place.categoryIcon,
                                        place.placeType,
                                    )}
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
                                    draggedPlace
                                        ? resolvePlaceDisplayIcon(
                                              draggedPlace.category,
                                              draggedPlace.categoryIcon,
                                              draggedPlace.placeType,
                                          )
                                        : draggedItem
                                          ? resolvePlaceDisplayIcon(
                                                resolvePlaceCategoryPresentation(
                                                    draggedItem.categoryType,
                                                ).category,
                                                draggedItem.categoryIcon,
                                                draggedItem.placeType,
                                            )
                                          : undefined
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
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (focusedItemId == null && focusedPlaceId == null) return

        function handlePointerDown(event: PointerEvent) {
            if (containerRef.current?.contains(event.target as Node)) return
            onItemFocus(null)
            onPlaceFocus(null)
        }

        document.addEventListener('pointerdown', handlePointerDown)
        return () =>
            document.removeEventListener('pointerdown', handlePointerDown)
    }, [focusedItemId, focusedPlaceId, onItemFocus, onPlaceFocus])

    return (
        <div
            ref={containerRef}
            className="shrink-0 border-b border-slate-200 bg-white"
        >
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
