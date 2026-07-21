'use client'

import React, { useEffect } from 'react'
import {
    AdvancedMarker,
    Map,
    useApiIsLoaded,
    useMap,
} from '@vis.gl/react-google-maps'
import { CATEGORY_META, Place } from '@/entities/trip'

const JEJU_CENTER = { lat: 33.489, lng: 126.4983 }
const DEFAULT_ZOOM = 10

type Props = {
    places: Place[]
    selectedId: string | null
    onSelect: (id: string) => void
}

export function MapCanvas({ places, selectedId, onSelect }: Props) {
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
        />
    )
}

function GoogleMapCanvas({
    places,
    selectedId,
    onSelect,
}: Pick<Props, 'places' | 'selectedId' | 'onSelect'>) {
    const isLoaded = useApiIsLoaded()
    // NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID 미설정 시 Google 공식 데모 ID 사용 (개발용)
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
    const center = calculateCenter(places)

    if (!isLoaded) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <p className="text-sm text-slate-400">지도 로딩 중...</p>
            </div>
        )
    }

    return (
        <Map
            defaultCenter={center}
            defaultZoom={DEFAULT_ZOOM}
            mapId={mapId}
            gestureHandling="greedy"
            streetViewControl={false}
            style={{ width: '100%', height: '100%' }}
        >
            <MapController places={places} selectedId={selectedId} />
            {places.map((place) => {
                const meta = CATEGORY_META[place.category]
                const isSelected = place.id === selectedId
                return (
                    <AdvancedMarker
                        key={place.id}
                        position={{ lat: place.lat, lng: place.lng }}
                        onClick={() => onSelect(place.id)}
                        zIndex={isSelected ? 10 : 1}
                    >
                        <div
                            className={`flex flex-col items-center transition-transform ${
                                isSelected ? 'scale-125' : 'hover:scale-110'
                            }`}
                        >
                            <div
                                className={`flex items-center justify-center rounded-full border-2 border-white shadow-md ${
                                    isSelected
                                        ? 'h-10 w-10 text-base'
                                        : 'h-8 w-8 text-sm'
                                }`}
                                style={{
                                    backgroundColor: meta?.color ?? '#e7657a',
                                }}
                            >
                                {meta?.emoji ?? '📍'}
                            </div>
                            {isSelected && (
                                <div className="mt-1 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-xs font-semibold shadow-md">
                                    {place.name}
                                </div>
                            )}
                        </div>
                    </AdvancedMarker>
                )
            })}
        </Map>
    )
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
