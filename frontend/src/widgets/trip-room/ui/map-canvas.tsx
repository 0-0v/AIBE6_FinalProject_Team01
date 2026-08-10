'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    AdvancedMarker,
    InfoWindow,
    Map as GoogleMap,
    useApiIsLoaded,
    useMap,
} from '@vis.gl/react-google-maps'
import {
    Place,
    addMapPinComment,
    getMapPinComments,
    isAnchorPlace,
    resolvePlaceDisplayIcon,
} from '@/entities/trip'
import type {
    ItineraryDay,
    ItineraryItem,
    MapPinCommentResponse,
    MapPinSummaryResponse,
} from '@/entities/trip'
import { MapRouteFilter } from './map-route-filter'
import { ItineraryMapMarker } from './itinerary-map-marker'
import { MapTypeToggle, useMapDisplayType } from './map-type-toggle'
import {
    getItineraryDayColor,
    hasMapCoordinates,
    ITINERARY_MAP_BOUNDS,
    ITINERARY_MAP_MIN_ZOOM,
} from '../lib/itinerary-map'
import { getPlaceDetails } from '@/features/search-place'
import type { PlaceSearchResult } from '@/features/search-place'
import { MapPoiPopup } from './map-poi-popup'
import { MapRouteLayer } from './map-route-layer'
import { MapPinCommentBadge } from './map-pin-comment-badge'
import { MapPinCommentSection } from './map-pin-comment-section'

// POI 클릭 결과 세션 캐시 — 같은 장소 재클릭 시 API 호출 없음
const resolvedPoiDetails = new Map<string, PlaceSearchResult>()
const pendingPoiRequests = new Map<string, Promise<PlaceSearchResult>>()

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }
const DEFAULT_ZOOM = 10
const DESTINATION_FOCUS_ZOOM = 12
const SELECTED_PLACE_FOCUS_ZOOM = 16
const CATEGORY_BADGE_MIN_ZOOM = 10
const MARKER_SIMPLIFY_MIN_ZOOM = 12
const PLACE_INFO_WINDOW_OFFSET_Y = -52

type Props = {
    places: Place[]
    initialLat?: number | null
    initialLng?: number | null
    selectedId: string | null
    focusRequestVersion?: number
    onSelect: (id: string) => void
    onDeselect: () => void
    days?: ItineraryDay[]
    initialRouteDay?: number | null
    initialFocusedSegmentIndex?: number | null
    routeOverview?: boolean
    outlinedPlaceIds?: string[]
    onAddFromPoi?: (result: PlaceSearchResult) => Promise<void>
    existingGooglePlaceIds?: Set<string>
    canWrite?: boolean
    hoveredPlaceId?: string | null
    onHoverPlace?: (placeId: string | null) => void
    onRouteDayChange?: (dayNumber: number | null) => void
    tripId?: number | null
    mapPins?: MapPinSummaryResponse[]
    onMapPinCommentAdded?: (pin: MapPinSummaryResponse) => void
}

export function MapCanvas({
    places,
    initialLat,
    initialLng,
    selectedId,
    focusRequestVersion = 0,
    onSelect,
    onDeselect,
    days,
    initialRouteDay,
    initialFocusedSegmentIndex,
    routeOverview = false,
    outlinedPlaceIds = [],
    onAddFromPoi,
    existingGooglePlaceIds,
    canWrite,
    hoveredPlaceId,
    onHoverPlace,
    onRouteDayChange,
    tripId,
    mapPins = [],
    onMapPinCommentAdded,
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
            onSelect={onSelect}
            onDeselect={onDeselect}
            days={days}
            initialRouteDay={initialRouteDay}
            initialFocusedSegmentIndex={initialFocusedSegmentIndex}
            routeOverview={routeOverview}
            outlinedPlaceIds={outlinedPlaceIds}
            onAddFromPoi={onAddFromPoi}
            existingGooglePlaceIds={existingGooglePlaceIds}
            canWrite={canWrite}
            hoveredPlaceId={hoveredPlaceId}
            onHoverPlace={onHoverPlace}
            onRouteDayChange={onRouteDayChange}
            tripId={tripId}
            mapPins={mapPins}
            onMapPinCommentAdded={onMapPinCommentAdded}
        />
    )
}

function GoogleMapCanvas({
    places,
    initialLat,
    initialLng,
    selectedId,
    focusRequestVersion = 0,
    onSelect,
    onDeselect,
    days,
    initialRouteDay,
    initialFocusedSegmentIndex,
    routeOverview,
    outlinedPlaceIds = [],
    onAddFromPoi,
    existingGooglePlaceIds,
    canWrite = false,
    hoveredPlaceId = null,
    onHoverPlace,
    onRouteDayChange,
    tripId,
    mapPins = [],
    onMapPinCommentAdded,
}: Pick<
    Props,
    | 'places'
    | 'initialLat'
    | 'initialLng'
    | 'selectedId'
    | 'focusRequestVersion'
    | 'onSelect'
    | 'onDeselect'
    | 'days'
    | 'initialRouteDay'
    | 'initialFocusedSegmentIndex'
    | 'routeOverview'
    | 'outlinedPlaceIds'
    | 'onAddFromPoi'
    | 'existingGooglePlaceIds'
    | 'canWrite'
    | 'hoveredPlaceId'
    | 'onHoverPlace'
    | 'onRouteDayChange'
    | 'tripId'
    | 'mapPins'
    | 'onMapPinCommentAdded'
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
        fallbackPlaceName: string | null
        error: string | null
        saving: boolean
    }

    const [poiState, setPoiState] = useState<PoiState | null>(null)
    type PinCommentsState = {
        placeId: string
        comments: MapPinCommentResponse[]
        loading: boolean
        submitting: boolean
        error: string | null
    }
    const [pinCommentsState, setPinCommentsState] =
        useState<PinCommentsState | null>(null)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [selectedRouteDay, setSelectedRouteDay] = useState<number | null>(
        initialRouteDay ?? null,
    )
    const [focusedSegmentIndex, setFocusedSegmentIndex] = useState<
        number | null
    >(initialFocusedSegmentIndex ?? null)
    const [prevSelectedIdForSegment, setPrevSelectedIdForSegment] =
        useState(selectedId)
    // Day 필터를 직접 클릭해서 켰을 때만("day-route") 전체 동선 보기로 카메라를 맞추고,
    // 그 외(장소 선택 등)에는 카메라를 건드리지 않는다.
    const [routeFocusMode, setRouteFocusMode] = useState<'day-route' | 'none'>(
        'none',
    )
    const [showCategoryBadges, setShowCategoryBadges] = useState(true)
    const [simplifyMarkers, setSimplifyMarkers] = useState(false)
    const [mapDisplayType, setMapDisplayType] = useMapDisplayType()
    const loadingPoiPlaceId = poiState?.loading ? poiState.placeId : null
    const savedGooglePlaceIds = useMemo(
        () =>
            new Set(
                places.flatMap((place) =>
                    place.googlePlaceId ? [place.googlePlaceId] : [],
                ),
            ),
        [places],
    )
    const commentCountByGooglePlaceId = useMemo(
        () =>
            new Map(
                mapPins.map((pin) => [pin.googlePlaceId, pin.commentCount]),
            ),
        [mapPins],
    )

    useEffect(() => {
        if (!loadingPoiPlaceId) return
        let cancelled = false
        const placeId = loadingPoiPlaceId

        const pending = pendingPoiRequests.get(placeId)
        const request = pending ?? getPlaceDetails(placeId)
        if (!pending) {
            pendingPoiRequests.set(placeId, request)
            const clearPendingRequest = () => {
                if (pendingPoiRequests.get(placeId) === request) {
                    pendingPoiRequests.delete(placeId)
                }
            }
            void request.then(clearPendingRequest, clearPendingRequest)
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
                            ? {
                                  ...prev,
                                  loading: false,
                                  error: '장소 정보를 불러오지 못했습니다.',
                              }
                            : prev,
                    )
                }
            })

        return () => {
            cancelled = true
        }
    }, [loadingPoiPlaceId])

    // pinCommentsState의 loading:true 초기화는 poiState를 여는 클릭 핸들러에서 동기적으로
    // 수행한다(react-hooks/set-state-in-effect 회피). 이 effect는 실제 비동기 조회와
    // 그 결과 반영(.then/.catch 콜백 내 setState)만 담당한다.
    useEffect(() => {
        const placeId = poiState?.placeId
        if (!placeId || !tripId) return
        const controller = new AbortController()
        getMapPinComments(tripId, placeId, controller.signal)
            .then((comments) => {
                setPinCommentsState((prev) =>
                    prev?.placeId === placeId
                        ? { ...prev, comments, loading: false, error: null }
                        : prev,
                )
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return
                }
                setPinCommentsState((prev) =>
                    prev?.placeId === placeId
                        ? {
                              ...prev,
                              comments: [],
                              loading: false,
                              error: '댓글을 불러오지 못했습니다.',
                          }
                        : prev,
                )
            })
        return () => controller.abort()
    }, [poiState?.placeId, tripId])

    // 일반 POI 클릭과 댓글 배지 마커 클릭이 동일하게 poiState/pinCommentsState를 초기화하도록
    // 공유하는 헬퍼 — 두 클릭 핸들러에 동일한 초기화 블록이 중복돼 한쪽만 수정되면
    // 이전 장소의 댓글이 잠깐 보이는 stale-flash 버그가 재발할 수 있어 하나로 모았다.
    function openPlacePopup(
        placeId: string,
        latLng: { lat: number; lng: number },
        options: {
            fallbackPlaceName?: string | null
            loadDetails?: boolean
            deselectPlace?: boolean
        } = {},
    ) {
        const loadDetails = options.loadDetails ?? true
        const cached = loadDetails ? resolvedPoiDetails.get(placeId) : undefined
        setPoiState({
            placeId,
            latLng,
            loading: loadDetails && !cached,
            result: cached ?? null,
            fallbackPlaceName: options.fallbackPlaceName ?? null,
            error: null,
            saving: false,
        })
        setPinCommentsState((prev) =>
            tripId != null
                ? prev?.placeId === placeId
                    ? prev
                    : {
                          placeId,
                          comments: [],
                          loading: true,
                          submitting: false,
                          error: null,
                      }
                : null,
        )
        setHoveredId(null)
        if (options.deselectPlace ?? true) onDeselect()
    }

    async function submitPinComment(content: string): Promise<boolean> {
        if (!poiState || !tripId) return false
        const { placeId, latLng, result, fallbackPlaceName } = poiState
        const placeName = result?.name ?? fallbackPlaceName
        if (!placeName) return false
        setPinCommentsState((prev) =>
            prev?.placeId === placeId
                ? { ...prev, submitting: true, error: null }
                : prev,
        )
        try {
            const comment = await addMapPinComment(tripId, placeId, {
                content,
                lat: latLng.lat,
                lng: latLng.lng,
                placeName,
            })
            setPinCommentsState((prev) =>
                prev?.placeId === placeId
                    ? {
                          ...prev,
                          submitting: false,
                          comments: [...prev.comments, comment],
                      }
                    : prev,
            )
            const previousCount =
                mapPins.find((pin) => pin.googlePlaceId === placeId)
                    ?.commentCount ?? 0
            onMapPinCommentAdded?.({
                googlePlaceId: placeId,
                lat: latLng.lat,
                lng: latLng.lng,
                placeName,
                commentCount: previousCount + 1,
            })
            return true
        } catch {
            setPinCommentsState((prev) =>
                prev?.placeId === placeId
                    ? {
                          ...prev,
                          submitting: false,
                          error: '댓글 등록에 실패했습니다.',
                      }
                    : prev,
            )
            return false
        }
    }

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

    // 일정 목록에서 다른 장소를 선택하는 등 마커 클릭이 아닌 경로로 selectedId가 바뀌면,
    // 이전에 탐색하던 구간(focusedSegmentIndex)이 새 선택과 안 맞을 수 있다 —
    // 이 경우 구간 탐색바("Day 1 · 3/3")가 엉뚱하게 남아있지 않도록 초기화한다.
    // (selectedId가 실제로 바뀐 경우에만 검사 — 이전/다음 버튼으로 구간만 옮길 땐 selectedId가
    // 그대로라 여기 안 걸리고, 마커 클릭은 focusedSegmentIndex도 같이 올바르게 세팅되므로 안 걸린다)
    if (selectedId !== prevSelectedIdForSegment) {
        setPrevSelectedIdForSegment(selectedId)
        if (focusedSegmentIndex != null) {
            const selectedIndex =
                selectedId != null
                    ? activeDayPlaceIndexMap.get(selectedId)
                    : undefined
            const segmentMatchesSelection =
                selectedIndex === focusedSegmentIndex ||
                selectedIndex === focusedSegmentIndex + 1
            if (!segmentMatchesSelection) {
                setFocusedSegmentIndex(null)
            }
        }
    }

    // focusedSegmentIndex → focusedSegment ({fromPlaceId, toPlaceId})
    const focusedSegment = useMemo(() => {
        if (focusedSegmentIndex == null || activeDayPoints.length < 2) {
            // Day 필터로 구간 탐색 중이 아니어도, 장소를 직접 선택했다면
            // 그 장소 → 다음 장소 구간을 대시보드와 동일하게 보여준다.
            if (selectedId == null) return null
            const scheduled = scheduledPlaceDetailsMap.get(selectedId)
            const nextTripPlaceId = scheduled?.nextItem?.tripPlaceId
            if (nextTripPlaceId == null) return null
            return {
                fromPlaceId: selectedId,
                toPlaceId: nextTripPlaceId,
            }
        }
        const from = activeDayPoints[focusedSegmentIndex]
        const to = activeDayPoints[focusedSegmentIndex + 1]
        if (!from?.tripPlaceId || !to?.tripPlaceId) return null
        return { fromPlaceId: from.tripPlaceId, toPlaceId: to.tripPlaceId }
    }, [
        focusedSegmentIndex,
        activeDayPoints,
        selectedId,
        scheduledPlaceDetailsMap,
    ])

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
        // 장소가 선택된 상태라면 그 장소 포커싱은 MapController가 전담한다 —
        // Day 필터가 선택에 맞춰 조용히 따라왔을 뿐이라면(routeFocusMode !== 'day-route')
        // 여기서 전체 동선 보기로 카메라를 끌고 가지 않는다.
        if (selectedId != null) {
            return []
        }
        if (activeRouteDay != null && routeFocusMode === 'day-route') {
            return itineraryRoutes
                .filter((route) => route.dayNumber === activeRouteDay)
                .flatMap((route) => route.points)
        }
        // 전체 일정 + 선택 없음: 모든 날짜의 장소가 한 화면에 컴팩하게 들어오도록 맞춘다.
        return visibleRoutes.flatMap((route) => route.points)
    }, [
        activeRouteDay,
        itineraryRoutes,
        routeFocusMode,
        routeOverview,
        selectedId,
        visibleRoutes,
    ])
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
                    const shouldSimplify =
                        event.detail.zoom < MARKER_SIMPLIFY_MIN_ZOOM
                    setSimplifyMarkers((current) =>
                        current === shouldSimplify ? current : shouldSimplify,
                    )
                }}
                onClick={(event) => {
                    const clickedPlaceId = event.detail.placeId
                    if (clickedPlaceId && event.detail.latLng) {
                        event.stop()
                        openPlacePopup(clickedPlaceId, event.detail.latLng)
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
                <MapRouteLayer
                    routes={visibleRoutes}
                    emphasized={activeRouteDay != null}
                    focusedSegment={focusedSegment}
                />
                {poiState && (
                    <InfoWindow
                        position={poiState.latLng}
                        zIndex={200}
                        headerDisabled
                        shouldFocus={false}
                        pixelOffset={[0, PLACE_INFO_WINDOW_OFFSET_Y]}
                        onCloseClick={() => {
                            setPoiState(null)
                            setPinCommentsState(null)
                        }}
                    >
                        <div className="relative flex flex-col items-center">
                            <MapPoiPopup
                                loading={poiState.loading}
                                result={poiState.result}
                                fallbackPlaceName={poiState.fallbackPlaceName}
                                error={poiState.error}
                                isAlreadySaved={
                                    poiState.result != null &&
                                    (existingGooglePlaceIds?.has(
                                        poiState.result.googlePlaceId,
                                    ) ??
                                        false)
                                }
                                canWrite={canWrite}
                                saving={poiState.saving}
                                onSave={async () => {
                                    if (!poiState.result || !onAddFromPoi)
                                        return
                                    setPoiState((prev) =>
                                        prev ? { ...prev, saving: true } : null,
                                    )
                                    try {
                                        await onAddFromPoi(poiState.result)
                                        setPoiState(null)
                                        setPinCommentsState(null)
                                    } catch {
                                        setPoiState((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      saving: false,
                                                      error: '저장에 실패했습니다.',
                                                  }
                                                : null,
                                        )
                                    }
                                }}
                                onClose={() => {
                                    setPoiState(null)
                                    setPinCommentsState(null)
                                }}
                            />
                            {tripId != null && pinCommentsState && (
                                <div className="w-64 rounded-xl bg-white px-3 pb-3 shadow-lg">
                                    <MapPinCommentSection
                                        key={poiState.placeId}
                                        comments={pinCommentsState.comments}
                                        loading={pinCommentsState.loading}
                                        canWrite={
                                            (canWrite ?? false) &&
                                            (poiState.result != null ||
                                                poiState.fallbackPlaceName !=
                                                    null)
                                        }
                                        submitting={pinCommentsState.submitting}
                                        error={pinCommentsState.error}
                                        onSubmit={submitPinComment}
                                    />
                                </div>
                            )}
                        </div>
                    </InfoWindow>
                )}
                {mapPins
                    .filter(
                        (pin) =>
                            pin.commentCount > 0 &&
                            !savedGooglePlaceIds.has(pin.googlePlaceId),
                    )
                    .map((pin) => (
                        <AdvancedMarker
                            key={`pin-comment-${pin.googlePlaceId}`}
                            position={{ lat: pin.lat, lng: pin.lng }}
                            zIndex={150}
                            onClick={() => {
                                openPlacePopup(
                                    pin.googlePlaceId,
                                    { lat: pin.lat, lng: pin.lng },
                                    { fallbackPlaceName: pin.placeName },
                                )
                            }}
                        >
                            <MapPinCommentBadge
                                commentCount={pin.commentCount}
                            />
                        </AdvancedMarker>
                    ))}
                {places.map((place) => {
                    const isSelected = place.id === selectedId
                    const isSelfHovered = place.id === hoveredId
                    // 목록에서 이 장소에 마우스를 올렸을 때도 마커를 함께 강조한다.
                    const isHovered =
                        isSelfHovered || place.id === hoveredPlaceId
                    const scheduled = scheduledPlaceDetailsMap.get(place.id)
                    // Day 선택 시 해당 Day 외 마커 완전히 숨김
                    // — 단, 지금 선택했거나 목록에서 호버 중인 장소는 다른 Day(또는 미배치)여도 예외로 보여준다
                    if (
                        activeRouteDay != null &&
                        scheduled?.dayNumber !== activeRouteDay &&
                        place.id !== hoveredPlaceId &&
                        place.id !== selectedId
                    ) {
                        return null
                    }
                    // Day 필터와 다른 날짜 소속이라 예외로 보이는 마커인지 (호버로 잠깐 보일 때만 구분 표시 —
                    // 선택된 장소는 "장소" 탭과 동일하게 필터 상태와 무관하게 항상 같은 모습으로 포커싱된다)
                    const isDayMismatch =
                        !isSelected &&
                        activeRouteDay != null &&
                        scheduled != null &&
                        scheduled.dayNumber !== activeRouteDay
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
                    const isAnchor = isAnchorPlace(
                        place.category,
                        place.placeType,
                    )
                    const displayIcon = resolvePlaceDisplayIcon(
                        place.category,
                        place.categoryIcon,
                        place.placeType,
                    )
                    const commentCount = place.googlePlaceId
                        ? (commentCountByGooglePlaceId.get(
                              place.googlePlaceId,
                          ) ?? 0)
                        : 0
                    return (
                        <AdvancedMarker
                            key={place.id}
                            position={{ lat: place.lat, lng: place.lng }}
                            onClick={() => {
                                onSelect(place.id)
                                if (place.googlePlaceId) {
                                    openPlacePopup(
                                        place.googlePlaceId,
                                        { lat: place.lat, lng: place.lng },
                                        {
                                            fallbackPlaceName: place.name,
                                            loadDetails: false,
                                            deselectPlace: false,
                                        },
                                    )
                                } else {
                                    setPoiState(null)
                                    setPinCommentsState(null)
                                }
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
                                onMouseEnter={() => {
                                    setHoveredId(place.id)
                                    onHoverPlace?.(place.id)
                                }}
                                onMouseLeave={() => {
                                    setHoveredId(null)
                                    onHoverPlace?.(null)
                                }}
                            >
                                {/* 호버 인포카드 — 실제로 마우스가 올라간 경우에만 표시 */}
                                {isSelfHovered && !isSelected && (
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
                                    categoryIcon={displayIcon}
                                    categoryColor={place.categoryColor}
                                    categoryLabel={place.categoryName}
                                    showCategoryBadge={
                                        showCategoryBadges &&
                                        (commentCount === 0 ||
                                            isSelected ||
                                            isHovered)
                                    }
                                    selected={isSelected}
                                    hovered={isHovered}
                                    focused={isFromPlace}
                                    outlined={
                                        isDayMismatch ||
                                        outlinedPlaceIds.includes(place.id)
                                    }
                                    simplified={simplifyMarkers && !isAnchor}
                                    anchor={isAnchor}
                                    commentCount={commentCount}
                                />
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
                        // 날짜를 고르면 특정 구간이 아니라 그 날짜 전체가 컴팩하게 보여야 하므로,
                        // 이전에 남아있던 장소 선택/구간 탐색 상태를 먼저 정리한다.
                        onDeselect()
                        setSelectedRouteDay(day)
                        setRouteFocusMode(day != null ? 'day-route' : 'none')
                        setFocusedSegmentIndex(null)
                        onRouteDayChange?.(day)
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
            map.setCenter({
                lat: places[0].lat,
                lng: places[0].lng,
            })
            map.setZoom(14)
            return
        }

        fitBoundsToPoints(map, places)
    }, [autoFitKey, autoFitPlaces, initialLat, initialLng, map, places])

    useEffect(() => {
        if (!map || selectedLat == null || selectedLng == null) return
        map.panTo({ lat: selectedLat, lng: selectedLng })
        map.setZoom(SELECTED_PLACE_FOCUS_ZOOM)
    }, [focusRequestVersion, map, selectedLat, selectedLng])

    return null
}

function calculateCenter(places: Place[]): { lat: number; lng: number } {
    const lat = places.reduce((sum, p) => sum + p.lat, 0) / places.length
    const lng = places.reduce((sum, p) => sum + p.lng, 0) / places.length
    return { lat, lng }
}
