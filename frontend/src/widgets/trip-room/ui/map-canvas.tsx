'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    AdvancedMarker,
    Map as GoogleMap,
    useApiIsLoaded,
    useMap,
} from '@vis.gl/react-google-maps'
import {
    ClockIcon,
    ExternalLinkIcon,
    NavigationIcon,
    XIcon,
} from 'lucide-react'
import { Place } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem } from '@/entities/trip'
import { MapRouteFilter } from './map-route-filter'
import { ItineraryMapMarker } from './itinerary-map-marker'
import { ItineraryRoutePolyline } from './itinerary-route-polyline'
import { LazyPlacePhoto } from './lazy-place-photo'
import { MapTypeToggle, useMapDisplayType } from './map-type-toggle'
import { buildGoogleMapsPlaceUrl } from '../lib/google-maps-place-url'
import {
    getItineraryDayColor,
    hasMapCoordinates,
    ITINERARY_MAP_BOUNDS,
    ITINERARY_MAP_MIN_ZOOM,
} from '../lib/itinerary-map'
import { formatTimeRange } from '../lib/itinerary-time'
import { formatTransportSummary } from '../lib/itinerary-transport'
import { getPlaceDetails } from '@/features/search-place'
import type { PlaceSearchResult } from '@/features/search-place'
import { MapPoiPopup } from './map-poi-popup'

// POI 클릭 결과 세션 캐시 — 같은 장소 재클릭 시 API 호출 없음
const resolvedPoiDetails = new Map<string, PlaceSearchResult>()
const pendingPoiRequests = new Map<string, Promise<PlaceSearchResult>>()

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }
const DEFAULT_ZOOM = 10
const DESTINATION_FOCUS_ZOOM = 12
const SELECTED_PLACE_FOCUS_ZOOM = 16
const CATEGORY_BADGE_MIN_ZOOM = 10
const SELECTED_PLACE_VIEWPORT_PADDING = 16

type Props = {
    places: Place[]
    initialLat?: number | null
    initialLng?: number | null
    selectedId: string | null
    focusRequestVersion?: number
    showSelectedPlacePhoto?: boolean
    onSelect: (id: string) => void
    onDeselect: () => void
    onPlacePhotoResolved?: (
        placeId: string,
        photoUrl: string,
        attribution: string | null,
        attributionUrl: string | null,
        sourceUrl: string,
    ) => void
    days?: ItineraryDay[]
    initialRouteDay?: number | null
    initialFocusedSegmentIndex?: number | null
    routeOverview?: boolean
    outlinedPlaceIds?: string[]
    onAddFromPoi?: (result: PlaceSearchResult) => Promise<void>
    existingGooglePlaceIds?: Set<string>
    canWrite?: boolean
}

export function MapCanvas({
    places,
    initialLat,
    initialLng,
    selectedId,
    focusRequestVersion = 0,
    showSelectedPlacePhoto = false,
    onSelect,
    onDeselect,
    onPlacePhotoResolved,
    days,
    initialRouteDay,
    initialFocusedSegmentIndex,
    routeOverview = false,
    outlinedPlaceIds = [],
    onAddFromPoi,
    existingGooglePlaceIds,
    canWrite,
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
            initialLat={initialLat}
            initialLng={initialLng}
            selectedId={selectedId}
            focusRequestVersion={focusRequestVersion}
            showSelectedPlacePhoto={showSelectedPlacePhoto}
            onSelect={onSelect}
            onDeselect={onDeselect}
            onPlacePhotoResolved={onPlacePhotoResolved}
            days={days}
            initialRouteDay={initialRouteDay}
            initialFocusedSegmentIndex={initialFocusedSegmentIndex}
            routeOverview={routeOverview}
            outlinedPlaceIds={outlinedPlaceIds}
            onAddFromPoi={onAddFromPoi}
            existingGooglePlaceIds={existingGooglePlaceIds}
            canWrite={canWrite}
        />
    )
}

function GoogleMapCanvas({
    places,
    initialLat,
    initialLng,
    selectedId,
    focusRequestVersion = 0,
    showSelectedPlacePhoto,
    onSelect,
    onDeselect,
    onPlacePhotoResolved,
    days,
    initialRouteDay,
    initialFocusedSegmentIndex,
    routeOverview,
    outlinedPlaceIds = [],
    onAddFromPoi,
    existingGooglePlaceIds,
    canWrite = false,
}: Pick<
    Props,
    | 'places'
    | 'initialLat'
    | 'initialLng'
    | 'selectedId'
    | 'focusRequestVersion'
    | 'showSelectedPlacePhoto'
    | 'onSelect'
    | 'onDeselect'
    | 'onPlacePhotoResolved'
    | 'days'
    | 'initialRouteDay'
    | 'initialFocusedSegmentIndex'
    | 'routeOverview'
    | 'outlinedPlaceIds'
    | 'onAddFromPoi'
    | 'existingGooglePlaceIds'
    | 'canWrite'
>) {
    const isLoaded = useApiIsLoaded()
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'

    // 첫 번째 일정 장소가 있으면 그 위치에서 줌인 시작, 없으면 저장 장소 평균 또는 목적지 좌표 또는 서울
    const firstScheduledPoint = days
        ?.flatMap((d) => d.items)
        .find((item) => item.lat != null && item.lng != null)
    const destinationCenter =
        initialLat != null && initialLng != null
            ? { lat: initialLat, lng: initialLng }
            : null
    const center = firstScheduledPoint
        ? { lat: firstScheduledPoint.lat, lng: firstScheduledPoint.lng }
        : places.length > 0
          ? calculateCenter(places)
          : (destinationCenter ?? SEOUL_CENTER)
    const initialZoom = firstScheduledPoint
        ? 14
        : places.length > 0
          ? DEFAULT_ZOOM
          : DESTINATION_FOCUS_ZOOM
    type PoiState = {
        placeId: string
        latLng: { lat: number; lng: number }
        loading: boolean
        result: PlaceSearchResult | null
        error: string | null
        saving: boolean
    }

    const [poiState, setPoiState] = useState<PoiState | null>(null)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [selectedRouteDay, setSelectedRouteDay] = useState<number | null>(
        initialRouteDay ?? null,
    )
    const [focusedSegmentIndex, setFocusedSegmentIndex] = useState<
        number | null
    >(initialFocusedSegmentIndex ?? null)
    const [showCategoryBadges, setShowCategoryBadges] = useState(true)
    const [mapDisplayType, setMapDisplayType] = useMapDisplayType()

    useEffect(() => {
        if (!poiState?.loading || !poiState.placeId) return
        let cancelled = false
        const { placeId } = poiState

        const pending = pendingPoiRequests.get(placeId)
        const request = pending ?? getPlaceDetails(placeId)
        if (!pending) {
            pendingPoiRequests.set(placeId, request)
            void request
                .finally(() => {
                    if (pendingPoiRequests.get(placeId) === request) {
                        pendingPoiRequests.delete(placeId)
                    }
                })
                .catch(() => {})
        }

        void request
            .then((fetched) => {
                resolvedPoiDetails.set(placeId, fetched)
                if (!cancelled) {
                    setPoiState((prev) =>
                        prev?.placeId === placeId
                            ? { ...prev, loading: false, result: fetched }
                            : prev,
                    )
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setPoiState((prev) =>
                        prev?.placeId === placeId
                            ? { ...prev, loading: false, error: '장소 정보를 불러오지 못했습니다.' }
                            : prev,
                    )
                }
            })

        return () => {
            cancelled = true
        }
    }, [poiState?.placeId, poiState?.loading]) // eslint-disable-line react-hooks/exhaustive-deps

    const scheduledPlaceDetailsMap = useMemo(() => {
        if (!days) {
            return new Map<
                string,
                {
                    order: number
                    color: string
                    dayNumber: number
                    item: ItineraryItem
                    nextItem: ItineraryItem | null
                }
            >()
        }
        const map = new Map<
            string,
            {
                order: number
                color: string
                dayNumber: number
                item: ItineraryItem
                nextItem: ItineraryItem | null
            }
        >()
        for (const day of days) {
            const color = getItineraryDayColor(day.dayNumber)
            day.items.forEach((item, index) => {
                if (item.tripPlaceId != null) {
                    map.set(String(item.tripPlaceId), {
                        order: index + 1,
                        color,
                        dayNumber: day.dayNumber,
                        item,
                        nextItem: day.items[index + 1] ?? null,
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
                    tripPlaceId:
                        item.tripPlaceId != null
                            ? String(item.tripPlaceId)
                            : null,
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
    const visibleRoutes = useMemo(
        () =>
            activeRouteDay == null
                ? itineraryRoutes
                : itineraryRoutes.filter(
                      (route) => route.dayNumber === activeRouteDay,
                  ),
        [activeRouteDay, itineraryRoutes],
    )

    // 현재 선택된 Day의 좌표 목록 (구간 네비게이션용)
    const activeDayPoints = useMemo(
        () =>
            activeRouteDay == null
                ? []
                : (itineraryRoutes.find((r) => r.dayNumber === activeRouteDay)
                      ?.points ?? []),
        [activeRouteDay, itineraryRoutes],
    )
    const totalSegments = Math.max(0, activeDayPoints.length - 1)

    // placeId → activeDayPoints 인덱스 맵
    const activeDayPlaceIndexMap = useMemo(() => {
        const map = new Map<string, number>()
        activeDayPoints.forEach((point, idx) => {
            if (point.tripPlaceId) map.set(point.tripPlaceId, idx)
        })
        return map
    }, [activeDayPoints])

    // focusedSegmentIndex → focusedSegment ({fromPlaceId, toPlaceId})
    const focusedSegment = useMemo(() => {
        if (focusedSegmentIndex == null || activeDayPoints.length < 2)
            return null
        const from = activeDayPoints[focusedSegmentIndex]
        const to = activeDayPoints[focusedSegmentIndex + 1]
        if (!from?.tripPlaceId || !to?.tripPlaceId) return null
        return { fromPlaceId: from.tripPlaceId, toPlaceId: to.tripPlaceId }
    }, [focusedSegmentIndex, activeDayPoints])

    // 집중 구간의 두 장소 ID (마커 dim용)
    const focusedPlaceIds = useMemo(
        () =>
            focusedSegment
                ? new Set([
                      focusedSegment.fromPlaceId,
                      focusedSegment.toPlaceId,
                  ])
                : null,
        [focusedSegment],
    )

    // 구간 네비게이션 시 두 마커에 맞춰 fitBounds
    const focusedSegmentPoints = useMemo(() => {
        if (focusedSegmentIndex == null) return null
        const from = activeDayPoints[focusedSegmentIndex]
        const to = activeDayPoints[focusedSegmentIndex + 1]
        if (!from || !to) return null
        return { from, to }
    }, [focusedSegmentIndex, activeDayPoints])

    const selectedRoutePoints = useMemo(() => {
        if (routeOverview) {
            return visibleRoutes.flatMap((route) => route.points)
        }
        if (activeRouteDay != null) {
            return itineraryRoutes
                .filter((route) => route.dayNumber === activeRouteDay)
                .flatMap((route) => route.points)
        }
        // 전체 일정: Day 1 첫 번째 장소만 → panTo + zoom 으로 확대
        const firstDayPoints = itineraryRoutes[0]?.points ?? []
        return firstDayPoints.slice(0, 1)
    }, [activeRouteDay, itineraryRoutes, routeOverview, visibleRoutes])
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
                defaultZoom={initialZoom}
                minZoom={ITINERARY_MAP_MIN_ZOOM}
                restriction={{
                    latLngBounds: ITINERARY_MAP_BOUNDS,
                    strictBounds: true,
                }}
                mapId={mapId}
                mapTypeId={mapDisplayType}
                mapTypeControl={false}
                fullscreenControl={!routeOverview}
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
                onClick={(event) => {
                    const clickedPlaceId = event.detail.placeId
                    if (clickedPlaceId && event.detail.latLng) {
                        event.stop()
                        const cached = resolvedPoiDetails.get(clickedPlaceId)
                        setPoiState({
                            placeId: clickedPlaceId,
                            latLng: event.detail.latLng,
                            loading: !cached,
                            result: cached ?? null,
                            error: null,
                            saving: false,
                        })
                        return
                    }
                    setHoveredId(null)
                    setFocusedSegmentIndex(null)
                    setPoiState(null)
                    onDeselect()
                }}
            >
                <MapController
                    places={places}
                    initialLat={initialLat}
                    initialLng={initialLng}
                    selectedId={selectedId}
                    autoFitPlaces={!routeOverview}
                    focusRequestVersion={focusRequestVersion}
                />
                <RouteFocusController
                    points={
                        focusedSegmentIndex == null ? selectedRoutePoints : []
                    }
                    padding={routeOverview ? 8 : 96}
                />
                <SegmentPanController points={focusedSegmentPoints} />
                <RouteLayer
                    routes={visibleRoutes}
                    emphasized={activeRouteDay != null}
                    focusedSegment={focusedSegment}
                />
                {poiState && (
                    <AdvancedMarker
                        position={poiState.latLng}
                        zIndex={200}
                        onClick={() => {}}
                    >
                        <div className="relative flex flex-col items-center">
                            <MapPoiPopup
                                loading={poiState.loading}
                                result={poiState.result}
                                error={poiState.error}
                                isAlreadySaved={
                                    poiState.result != null &&
                                    (existingGooglePlaceIds?.has(poiState.result.googlePlaceId) ?? false)
                                }
                                canWrite={canWrite}
                                saving={poiState.saving}
                                onSave={async () => {
                                    if (!poiState.result || !onAddFromPoi) return
                                    setPoiState((prev) =>
                                        prev ? { ...prev, saving: true } : null,
                                    )
                                    try {
                                        await onAddFromPoi(poiState.result)
                                        setPoiState(null)
                                    } catch {
                                        setPoiState((prev) =>
                                            prev
                                                ? { ...prev, saving: false, error: '저장에 실패했습니다.' }
                                                : null,
                                        )
                                    }
                                }}
                                onClose={() => setPoiState(null)}
                            />
                        </div>
                    </AdvancedMarker>
                )}
                {places.map((place) => {
                    const isSelected = place.id === selectedId
                    const isHovered = place.id === hoveredId
                    const scheduled = scheduledPlaceDetailsMap.get(place.id)
                    // Day 선택 시 해당 Day 외 마커 완전히 숨김
                    if (
                        activeRouteDay != null &&
                        scheduled?.dayNumber !== activeRouteDay
                    ) {
                        return null
                    }
                    // 구간 집중 모드 dim
                    const isFocusModeActive = focusedSegment != null
                    const isFocusedPlace =
                        focusedPlaceIds?.has(place.id) ?? false
                    const isFromPlace =
                        isFocusModeActive &&
                        focusedSegment?.fromPlaceId === place.id
                    const markerOpacity =
                        isFocusModeActive &&
                        scheduled != null &&
                        !isFocusedPlace
                            ? 'opacity-20'
                            : 'opacity-100'
                    return (
                        <AdvancedMarker
                            key={place.id}
                            position={{ lat: place.lat, lng: place.lng }}
                            onClick={() => {
                                onSelect(place.id)
                                // 현재 Day 소속 마커 클릭 → 해당 구간으로 이동
                                if (
                                    !routeOverview &&
                                    activeRouteDay != null &&
                                    scheduled?.dayNumber === activeRouteDay
                                ) {
                                    const idx = activeDayPlaceIndexMap.get(
                                        place.id,
                                    )
                                    if (idx != null && idx < totalSegments) {
                                        setFocusedSegmentIndex(idx)
                                    }
                                }
                            }}
                            zIndex={
                                isSelected
                                    ? 100
                                    : isHovered
                                      ? 90
                                      : scheduled
                                        ? 5
                                        : 1
                            }
                        >
                            <div
                                className={`relative flex flex-col items-center transition-opacity ${markerOpacity}`}
                                onMouseEnter={() => setHoveredId(place.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                {/* 호버 인포카드 */}
                                {isHovered && !isSelected && (
                                    <div className="itinerary-map-card-enter pointer-events-none absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-xl border border-slate-100 bg-white p-2.5 shadow-xl">
                                        <div className="flex items-start gap-2">
                                            <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">
                                                {place.name}
                                            </p>
                                            <span
                                                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                                                style={{
                                                    backgroundColor:
                                                        place.categoryColor +
                                                        '20',
                                                    color: place.categoryColor,
                                                }}
                                            >
                                                {place.categoryName}
                                            </span>
                                        </div>
                                        {place.address && (
                                            <p className="mt-1 line-clamp-1 text-[10px] text-slate-400">
                                                {place.address}
                                            </p>
                                        )}
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
                                    categoryIcon={place.categoryIcon}
                                    categoryColor={place.categoryColor}
                                    categoryLabel={place.categoryName}
                                    showCategoryBadge={showCategoryBadges}
                                    selected={isSelected}
                                    hovered={isHovered}
                                    focused={isFromPlace}
                                    outlined={outlinedPlaceIds.includes(
                                        place.id,
                                    )}
                                />
                                {isSelected && (
                                    <div
                                        data-selected-place-card
                                        className="itinerary-map-card-enter absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl"
                                    >
                                        <button
                                            type="button"
                                            aria-label={`${place.name} 상세 정보 닫기`}
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                setHoveredId(null)
                                                onDeselect()
                                            }}
                                            className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                                        >
                                            <XIcon size={14} aria-hidden />
                                        </button>
                                        {showSelectedPlacePhoto &&
                                        place.photoSourceUrl ? (
                                            <div className="relative bg-slate-100">
                                                <img
                                                    src={place.image}
                                                    alt={place.name}
                                                    className="h-20 w-full object-cover"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-slate-950/65 px-2 py-1 text-[9px] text-white">
                                                    <a
                                                        href={
                                                            place.photoAttributionUrl ??
                                                            place.photoSourceUrl
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="truncate hover:underline"
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    >
                                                        {place.photoAttribution
                                                            ? `사진: ${place.photoAttribution}`
                                                            : 'Google Maps 사진'}
                                                    </a>
                                                    <a
                                                        href={
                                                            place.photoSourceUrl
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex shrink-0 items-center gap-0.5 font-bold hover:underline"
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    >
                                                        원본
                                                        <ExternalLinkIcon
                                                            size={9}
                                                            aria-hidden
                                                        />
                                                    </a>
                                                </div>
                                            </div>
                                        ) : showSelectedPlacePhoto &&
                                          place.googlePlaceId ? (
                                            <LazyPlacePhoto
                                                key={place.googlePlaceId}
                                                placeId={place.id}
                                                googlePlaceId={
                                                    place.googlePlaceId
                                                }
                                                placeName={place.name}
                                                onPhotoResolved={
                                                    onPlacePhotoResolved
                                                }
                                            />
                                        ) : showSelectedPlacePhoto ? (
                                            <img
                                                src={place.image}
                                                alt={place.name}
                                                className="h-20 w-full bg-slate-100 object-cover"
                                            />
                                        ) : null}
                                        <div className="space-y-2 px-3 pb-3 pt-2.5">
                                            <div>
                                                <div className="flex items-start gap-2">
                                                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">
                                                        {place.name}
                                                    </p>
                                                    {place.categoryName && (
                                                        <span
                                                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
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
                                                </div>
                                                {place.address && (
                                                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-400">
                                                        {place.address}
                                                    </p>
                                                )}
                                            </div>

                                            {scheduled != null && (
                                                <div className="space-y-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px]">
                                                    <p className="font-bold text-brand">
                                                        Day{' '}
                                                        {scheduled.dayNumber} ·{' '}
                                                        {scheduled.order}번째
                                                        장소
                                                    </p>
                                                    <p className="flex items-center gap-1 text-slate-600">
                                                        <ClockIcon
                                                            size={11}
                                                            aria-hidden
                                                        />
                                                        {formatTimeRange(
                                                            scheduled.item
                                                                .startTime,
                                                            scheduled.item
                                                                .endTime,
                                                        )}
                                                    </p>
                                                    {scheduled.nextItem !=
                                                        null && (
                                                        <p className="flex items-start gap-1 text-slate-500">
                                                            <NavigationIcon
                                                                size={11}
                                                                className="mt-px shrink-0"
                                                                aria-hidden
                                                            />
                                                            <span className="line-clamp-2">
                                                                다음 장소까지{' '}
                                                                {formatTransportSummary(
                                                                    scheduled.item,
                                                                )}
                                                            </span>
                                                        </p>
                                                    )}
                                                    {scheduled.item.memo && (
                                                        <p className="line-clamp-2 border-t border-slate-200 pt-1.5 text-slate-500">
                                                            메모 ·{' '}
                                                            {
                                                                scheduled.item
                                                                    .memo
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <a
                                                href={buildGoogleMapsPlaceUrl(
                                                    place,
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                                className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
                                            >
                                                Google Maps에서 최신 정보 확인
                                                <ExternalLinkIcon
                                                    size={10}
                                                    aria-hidden
                                                />
                                            </a>
                                            <p className="text-center text-[9px] text-slate-400">
                                                영업시간은 방문 전에 다시 확인해
                                                주세요.
                                            </p>
                                        </div>
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-white" />
                                    </div>
                                )}
                            </div>
                        </AdvancedMarker>
                    )
                })}
            </GoogleMap>

            {!routeOverview && (
                <MapTypeToggle
                    value={mapDisplayType}
                    onChange={setMapDisplayType}
                />
            )}
            {!routeOverview && itineraryRoutes.length > 0 && (
                <MapRouteFilter
                    routes={itineraryRoutes}
                    selectedDay={activeRouteDay}
                    onSelect={(day) => {
                        setSelectedRouteDay(day)
                        setFocusedSegmentIndex(day != null ? 0 : null)
                    }}
                />
            )}
            {focusedSegmentIndex != null &&
                activeRouteDay != null &&
                totalSegments > 0 && (
                    <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2">
                        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
                            <button
                                type="button"
                                disabled={focusedSegmentIndex === 0}
                                onClick={() =>
                                    setFocusedSegmentIndex(
                                        focusedSegmentIndex - 1,
                                    )
                                }
                                className="text-xs font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-30"
                            >
                                ‹ 이전
                            </button>
                            <span className="text-xs font-bold text-slate-700">
                                Day {activeRouteDay} · {focusedSegmentIndex + 1}{' '}
                                / {totalSegments}
                            </span>
                            <button
                                type="button"
                                disabled={
                                    focusedSegmentIndex >= totalSegments - 1
                                }
                                onClick={() =>
                                    setFocusedSegmentIndex(
                                        focusedSegmentIndex + 1,
                                    )
                                }
                                className="text-xs font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-30"
                            >
                                다음 ›
                            </button>
                        </div>
                    </div>
                )}

            {!routeOverview && itineraryRoutes.length > 0 && (
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
    emphasized,
    focusedSegment,
}: {
    routes: Array<{
        points: Array<{
            lat: number
            lng: number
            tripPlaceId: string | null
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
    emphasized: boolean
    focusedSegment: { fromPlaceId: string; toPlaceId: string } | null
}) {
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)
    const isFocusMode = focusedSegment != null

    return (
        <>
            {routes.map((route) =>
                route.points.slice(0, -1).map((point, index) => {
                    const next = route.points[index + 1]
                    const segmentId = `${route.dayId}-${index}`
                    const segPath = [
                        { lat: point.lat, lng: point.lng },
                        { lat: next.lat, lng: next.lng },
                    ]
                    const midpoint = {
                        lat: (point.lat + next.lat) / 2,
                        lng: (point.lng + next.lng) / 2,
                    }
                    const isFocusedSeg =
                        isFocusMode &&
                        point.tripPlaceId === focusedSegment!.fromPlaceId &&
                        next.tripPlaceId === focusedSegment!.toPlaceId
                    const segOpacity = isFocusMode
                        ? isFocusedSeg
                            ? 1
                            : 0.08
                        : emphasized
                          ? 0.95
                          : route.confirmed
                            ? 0.85
                            : 0.65
                    return (
                        <React.Fragment key={segmentId}>
                            <ItineraryRoutePolyline
                                path={segPath}
                                color={route.color}
                                opacity={segOpacity}
                                strokeWeight={2}
                                zIndex={isFocusedSeg ? 3 : 2}
                                emphasis={
                                    isFocusMode
                                        ? isFocusedSeg
                                            ? 'focused'
                                            : 'dimmed'
                                        : 'normal'
                                }
                            />
                            <AdvancedMarker
                                position={midpoint}
                                zIndex={isFocusedSeg ? 10 : 5}
                                onMouseEnter={() =>
                                    setHoveredSegment(segmentId)
                                }
                                onMouseLeave={() => setHoveredSegment(null)}
                            >
                                <div
                                    className={`relative transition-opacity ${
                                        isFocusMode && !isFocusedSeg
                                            ? 'opacity-10'
                                            : 'opacity-100'
                                    }`}
                                >
                                    {hoveredSegment === segmentId && (
                                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center shadow-lg">
                                            <p className="truncate text-[11px] font-bold text-slate-700">
                                                {point.placeName} →{' '}
                                                {next.placeName}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-slate-400">
                                                {formatTransportSummary(point)}
                                            </p>
                                        </div>
                                    )}
                                    <div className="size-6 cursor-default" />
                                </div>
                            </AdvancedMarker>
                        </React.Fragment>
                    )
                }),
            )}
        </>
    )
}

// 구간 선택 시 출발 장소 중심으로 확대
function SegmentPanController({
    points,
}: {
    points: {
        from: { lat: number; lng: number }
        to: { lat: number; lng: number }
    } | null
}) {
    const map = useMap()
    useEffect(() => {
        if (map == null || points == null) return
        map.panTo(points.from)
        map.setZoom(16)
    }, [map, points])
    return null
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

function RouteFocusController({
    points,
    padding = 96,
}: {
    points: Array<{ lat: number; lng: number }>
    padding?: number
}) {
    const map = useMap()
    const lastAppliedFocusKeyRef = useRef<string | null>(null)
    const focusKey = `${padding}:${points
        .map((point) => `${point.lat},${point.lng}`)
        .join('|')}`

    useEffect(() => {
        if (map == null) return
        if (points.length === 0) {
            lastAppliedFocusKeyRef.current = null
            return
        }
        if (lastAppliedFocusKeyRef.current === focusKey) return

        lastAppliedFocusKeyRef.current = focusKey
        if (points.length === 1) {
            map.panTo(points[0])
            map.setZoom(16)
            return
        }

        fitBoundsToPoints(map, points, padding)
        const listener = map.addListener('idle', () => {
            if ((map.getZoom() ?? 0) > 15) map.setZoom(15)
            listener.remove()
        })
        return () => listener.remove()
    }, [focusKey, map, padding, points])

    return null
}

// selectedId가 바뀌면 해당 장소로 지도 이동 / 장소 수 변화 시 지도 범위 조정
function MapController({
    places,
    initialLat,
    initialLng,
    selectedId,
    autoFitPlaces,
    focusRequestVersion,
}: {
    places: Place[]
    initialLat?: number | null
    initialLng?: number | null
    selectedId: string | null
    autoFitPlaces: boolean
    focusRequestVersion: number
}) {
    const map = useMap()
    const lastAppliedPlacesKeyRef = useRef<string | null>(null)
    const selectedPlace = places.find((place) => place.id === selectedId)
    const selectedLat = selectedPlace?.lat
    const selectedLng = selectedPlace?.lng
    const placesKey = places
        .map((place) => `${place.id}:${place.lat},${place.lng}`)
        .join('|')
    const autoFitKey = `${initialLat ?? ''}:${initialLng ?? ''}:${placesKey}`

    useEffect(() => {
        if (!map) return
        if (!autoFitPlaces) {
            lastAppliedPlacesKeyRef.current = null
            return
        }
        if (lastAppliedPlacesKeyRef.current === autoFitKey) return

        lastAppliedPlacesKeyRef.current = autoFitKey

        if (places.length === 0) {
            if (initialLat != null && initialLng != null) {
                map.setCenter({ lat: initialLat, lng: initialLng })
                map.setZoom(DESTINATION_FOCUS_ZOOM)
            }
            return
        }

        if (places.length === 1) {
            map.setCenter({ lat: places[0].lat, lng: places[0].lng })
            map.setZoom(14)
            return
        }

        fitBoundsToPoints(map, places)
    }, [autoFitKey, autoFitPlaces, initialLat, initialLng, map, places])

    useEffect(() => {
        if (!map || selectedLat == null || selectedLng == null) return

        let animationFrame: number | null = null
        const idleListener = map.addListener('idle', () => {
            idleListener.remove()
            animationFrame = window.requestAnimationFrame(() => {
                const mapRect = map.getDiv().getBoundingClientRect()
                const card = map
                    .getDiv()
                    .querySelector<HTMLElement>('[data-selected-place-card]')
                if (!card) return

                const cardRect = card.getBoundingClientRect()
                const minX = mapRect.left + SELECTED_PLACE_VIEWPORT_PADDING
                const maxX = mapRect.right - SELECTED_PLACE_VIEWPORT_PADDING
                const minY = mapRect.top + SELECTED_PLACE_VIEWPORT_PADDING
                const maxY = mapRect.bottom - SELECTED_PLACE_VIEWPORT_PADDING
                let contentShiftX = 0
                let contentShiftY = 0

                if (cardRect.left < minX) {
                    contentShiftX = minX - cardRect.left
                } else if (cardRect.right > maxX) {
                    contentShiftX = maxX - cardRect.right
                }
                if (cardRect.top < minY) {
                    contentShiftY = minY - cardRect.top
                } else if (cardRect.bottom > maxY) {
                    contentShiftY = maxY - cardRect.bottom
                }

                if (contentShiftX !== 0 || contentShiftY !== 0) {
                    map.panBy(-contentShiftX, -contentShiftY)
                }
            })
        })

        map.panTo({ lat: selectedLat, lng: selectedLng })
        map.setZoom(SELECTED_PLACE_FOCUS_ZOOM)

        return () => {
            idleListener.remove()
            if (animationFrame != null) {
                window.cancelAnimationFrame(animationFrame)
            }
        }
    }, [focusRequestVersion, map, selectedLat, selectedLng])

    return null
}

function calculateCenter(places: Place[]): { lat: number; lng: number } {
    const lat = places.reduce((sum, p) => sum + p.lat, 0) / places.length
    const lng = places.reduce((sum, p) => sum + p.lng, 0) / places.length
    return { lat, lng }
}
