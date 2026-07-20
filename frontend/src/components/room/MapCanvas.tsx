import React, { useMemo, useState } from 'react'
import { Place } from '../../data/types'
import { CATEGORY_META } from '../../data/mockData'

type Props = {
    places: Place[]
    selectedId: string | null
    onSelect: (id: string) => void
}

type MarkerGroup = {
    id: string
    places: Place[]
    lat: number
    lng: number
}

export function MapCanvas({ places, selectedId, onSelect }: Props) {
    const [zoom, setZoom] = useState(1)
    const [focus, setFocus] = useState({ lat: 50, lng: 50 })
    const markerGroups = useMemo(
        () => buildMarkerGroups(places, zoom),
        [places, zoom],
    )

    function zoomIn() {
        setZoom((current) => Math.min(1.6, Number((current + 0.2).toFixed(1))))
    }

    function zoomOut() {
        setZoom((current) => {
            const next = Math.max(1, Number((current - 0.2).toFixed(1)))
            if (next === 1) setFocus({ lat: 50, lng: 50 })
            return next
        })
    }

    function expandCluster(group: MarkerGroup) {
        setFocus({ lat: group.lat, lng: group.lng })
        setZoom(1.5)
    }

    return (
        <div className="relative h-full w-full overflow-hidden bg-[#edf0f3]">
            <div
                className="absolute inset-0 origin-center transition-transform duration-300 ease-out"
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: `${focus.lng}% ${focus.lat}%`,
                }}
            >
                <img
                    src="/801-23.png"
                    alt="제주 여행 지도"
                    className="absolute inset-0 h-full w-full object-cover opacity-70 grayscale-[0.15]"
                />
                <div className="absolute inset-0 bg-white/20" />
                <svg
                    className="absolute inset-0 h-full w-full opacity-75"
                    aria-hidden
                >
                    <path
                        d="M90,120 C260,210 210,330 380,360 S650,515 790,430"
                        stroke="#e7657a"
                        strokeWidth="7"
                        fill="none"
                        strokeLinecap="round"
                    />
                </svg>

                {markerGroups.map((group) => {
                    const isCluster = group.places.length > 1
                    const place = group.places[0]
                    const meta = CATEGORY_META[place.category]
                    const active = group.places.some(
                        (item) => item.id === selectedId,
                    )

                    if (isCluster) {
                        return (
                            <button
                                key={group.id}
                                onClick={() => expandCluster(group)}
                                className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:z-20 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d0ff]"
                                style={{
                                    left: `${group.lng}%`,
                                    top: `${group.lat}%`,
                                    zIndex: 20,
                                }}
                                aria-label={`${group.places.length}개의 가까운 장소 확대하기`}
                            >
                                <span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-[#5b32ea] text-sm font-extrabold text-white shadow-lg ring-4 ring-[#5b32ea]/20">
                                    {group.places.length}
                                </span>
                                <span className="mt-1 block whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">
                                    가까운 장소
                                </span>
                            </button>
                        )
                    }

                    return (
                        <button
                            key={place.id}
                            onClick={() => onSelect(place.id)}
                            className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:z-20 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d0ff]"
                            style={{
                                left: `${place.lng}%`,
                                top: `${place.lat}%`,
                                zIndex: active ? 30 : 10,
                            }}
                            aria-label={place.name}
                        >
                            <span className="relative flex flex-col items-center">
                                <span
                                    className={`flex items-center justify-center rounded-full border-2 border-white text-sm shadow-md transition-all ${active ? 'h-10 w-10' : 'h-8 w-8'}`}
                                    style={{ backgroundColor: meta.color }}
                                >
                                    {meta.emoji}
                                </span>
                                <span
                                    className="h-2 w-2 -translate-y-1 rotate-45 border-b-2 border-r-2 border-white"
                                    style={{ backgroundColor: meta.color }}
                                />
                                {active && (
                                    <span className="absolute top-11 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-xs font-semibold shadow-md">
                                        {place.name}
                                    </span>
                                )}
                            </span>
                        </button>
                    )
                })}
            </div>

            <div className="absolute bottom-6 right-6 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                <button
                    onClick={zoomIn}
                    disabled={zoom >= 1.6}
                    className="px-3 py-2 text-lg font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    aria-label="지도 확대"
                >
                    +
                </button>
                <span className="h-px bg-slate-200" />
                <button
                    onClick={zoomOut}
                    disabled={zoom <= 1}
                    className="px-3 py-2 text-lg font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    aria-label="지도 축소"
                >
                    −
                </button>
            </div>

            <div className="absolute bottom-4 left-4 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-400 shadow-sm backdrop-blur">
                Google Maps · 데모 지도
            </div>
        </div>
    )
}

function buildMarkerGroups(places: Place[], zoom: number): MarkerGroup[] {
    if (zoom >= 1.25)
        return places.map((place) => ({
            id: place.id,
            places: [place],
            lat: place.lat,
            lng: place.lng,
        }))

    const threshold = 6
    return places.reduce<MarkerGroup[]>((groups, place) => {
        const nearbyGroup = groups.find(
            (group) =>
                Math.hypot(group.lat - place.lat, group.lng - place.lng) <=
                threshold,
        )
        if (!nearbyGroup) {
            groups.push({
                id: place.id,
                places: [place],
                lat: place.lat,
                lng: place.lng,
            })
            return groups
        }

        nearbyGroup.places.push(place)
        nearbyGroup.lat =
            nearbyGroup.places.reduce((total, item) => total + item.lat, 0) /
            nearbyGroup.places.length
        nearbyGroup.lng =
            nearbyGroup.places.reduce((total, item) => total + item.lng, 0) /
            nearbyGroup.places.length
        return groups
    }, [])
}
