import { Fragment, useState } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { formatTransportSummary } from '../lib/itinerary-transport'
import { ItineraryRoutePolyline } from './itinerary-route-polyline'

type RoutePoint = {
    lat: number
    lng: number
    tripPlaceId: string | null
    placeName: string
    transportMinutes: number | null
    transportMeters: number | null
    transportMode: string | null
    transportDetail: string | null
}

export type MapRoute = {
    points: RoutePoint[]
    color: string
    dayId: string
    dayNumber: number
    confirmed: boolean
}

export function MapRouteLayer({
    routes,
    emphasized,
    focusedSegment,
}: {
    routes: MapRoute[]
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
                    const segmentPath = [
                        { lat: point.lat, lng: point.lng },
                        { lat: next.lat, lng: next.lng },
                    ]
                    const midpoint = {
                        lat: (point.lat + next.lat) / 2,
                        lng: (point.lng + next.lng) / 2,
                    }
                    const isFocused =
                        isFocusMode &&
                        point.tripPlaceId === focusedSegment.fromPlaceId &&
                        next.tripPlaceId === focusedSegment.toPlaceId
                    const opacity = isFocusMode
                        ? isFocused
                            ? 1
                            : 0.08
                        : emphasized
                          ? 0.95
                          : route.confirmed
                            ? 0.85
                            : 0.65

                    return (
                        <Fragment key={segmentId}>
                            <ItineraryRoutePolyline
                                path={segmentPath}
                                color={route.color}
                                opacity={opacity}
                                strokeWeight={2}
                                zIndex={isFocused ? 3 : 2}
                                emphasis={
                                    isFocusMode
                                        ? isFocused
                                            ? 'focused'
                                            : 'dimmed'
                                        : 'normal'
                                }
                                animated={
                                    isFocusMode
                                        ? isFocused
                                        : hoveredSegment === segmentId
                                }
                                visible={
                                    isFocusMode || hoveredSegment === segmentId
                                }
                            />
                            <AdvancedMarker
                                position={midpoint}
                                zIndex={isFocused ? 10 : 5}
                                onMouseEnter={() =>
                                    setHoveredSegment(segmentId)
                                }
                                onMouseLeave={() => setHoveredSegment(null)}
                            >
                                <div
                                    className={`relative transition-opacity ${
                                        isFocusMode && !isFocused
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
                        </Fragment>
                    )
                }),
            )}
        </>
    )
}
