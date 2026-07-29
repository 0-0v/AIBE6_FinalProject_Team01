'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, MapIcon } from 'lucide-react'
import {
    AdvancedMarker,
    Map as GoogleMap,
    Polyline,
    useApiIsLoaded,
    useMap,
} from '@vis.gl/react-google-maps'
import type { ItineraryDay, Place } from '@/entities/trip'
import {
    getItineraryDayColor,
    hasMapCoordinates,
    ITINERARY_MAP_BOUNDS,
    ITINERARY_MAP_MIN_ZOOM,
} from '../lib/itinerary-map'
import { MapTypeToggle, useMapDisplayType } from './map-type-toggle'
import { ItineraryMapMarker } from './itinerary-map-marker'

const DEFAULT_CENTER = { lat: 33.489, lng: 126.4983 }

type Props = {
    days: ItineraryDay[]
    places: Place[]
    activeDragId: string | null
    previewDayId: string | null
    hoveredItemId: string | null
    onItemHoverChange: (itemId: string | null) => void
    focusedItemId: string | null
    focusedPlaceId: string | null
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
    onItemFocus,
    onPlaceFocus,
}: Props) {
    const isLoaded = useApiIsLoaded()
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'
    const [mapDisplayType, setMapDisplayType] = useMapDisplayType()

    const allItems = useMemo(() => days.flatMap((d) => d.items), [days])

    const center = useMemo(() => {
        const valid = allItems.filter(hasMapCoordinates)
        if (valid.length === 0) return DEFAULT_CENTER
        return {
            lat: valid.reduce((s, i) => s + i.lat, 0) / valid.length,
            lng: valid.reduce((s, i) => s + i.lng, 0) / valid.length,
        }
    }, [allItems])

    const routes = useMemo(
        () =>
            days
                .map((day) => ({
                    color: getItineraryDayColor(day.dayNumber),
                    path: day.items
                        .filter(hasMapCoordinates)
                        .map((i) => ({ lat: i.lat, lng: i.lng })),
                }))
                .filter((r) => r.path.length >= 2),
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
    const activeFocusPosition =
        focusedPosition ??
        (focusedPlace == null
            ? null
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
            >
                <MapFocusController
                    lat={activeFocusPosition?.lat ?? null}
                    lng={activeFocusPosition?.lng ?? null}
                />
                {routes.map((route, i) => (
                    <Polyline
                        key={i}
                        path={route.path}
                        strokeColor={route.color}
                        strokeWeight={2.5}
                        strokeOpacity={0.7}
                    />
                ))}
                {days.map((day) => {
                    return day.items
                        .filter(hasMapCoordinates)
                        .map((item, index) => (
                            <AdvancedMarker
                                key={item.id}
                                position={{ lat: item.lat, lng: item.lng }}
                                onMouseEnter={() =>
                                    onItemHoverChange(String(item.id))
                                }
                                onMouseLeave={() => onItemHoverChange(null)}
                                onClick={() => onItemFocus(String(item.id))}
                            >
                                <div className="relative flex flex-col items-center">
                                    {effectiveFocusedItemId ===
                                        String(item.id) && (
                                        <span className="absolute bottom-full mb-1 max-w-40 truncate rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                                            {item.placeName ?? '장소'}
                                        </span>
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
                                        selected={
                                            effectiveFocusedItemId ===
                                            String(item.id)
                                        }
                                        hovered={
                                            hoveredItemId === String(item.id)
                                        }
                                    />
                                </div>
                            </AdvancedMarker>
                        ))
                })}
                {unscheduledMapPlaces.map((place) => (
                    <AdvancedMarker
                        key={`saved-${place.id}`}
                        position={{ lat: place.lat, lng: place.lng }}
                        onClick={() => onPlaceFocus(String(place.id))}
                    >
                        <div className="relative flex flex-col items-center">
                            {focusedPlaceId === String(place.id) && (
                                <span className="absolute bottom-full mb-1 max-w-40 truncate rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                                    {place.name}
                                </span>
                            )}
                            <ItineraryMapMarker
                                color={place.categoryColor ?? '#64748b'}
                                categoryIcon={place.categoryIcon}
                                selected={focusedPlaceId === String(place.id)}
                            />
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
