'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, MapIcon } from 'lucide-react'
import {
    AdvancedMarker,
    Map as GoogleMap,
    Polyline,
    useApiIsLoaded,
} from '@vis.gl/react-google-maps'
import type { ItineraryDay } from '@/entities/trip'

const DAY_COLORS = [
    '#f97316',
    '#10b981',
    '#3b82f6',
    '#a855f7',
    '#ef4444',
    '#eab308',
    '#06b6d4',
    '#ec4899',
]

const DEFAULT_CENTER = { lat: 33.489, lng: 126.4983 }

type Props = {
    days: ItineraryDay[]
}

function MapContent({ days }: Props) {
    const isLoaded = useApiIsLoaded()
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'

    const allItems = useMemo(() => days.flatMap((d) => d.items), [days])

    const center = useMemo(() => {
        const valid = allItems.filter((i) => i.lat !== 0 || i.lng !== 0)
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
                    color: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length],
                    path: day.items
                        .filter((i) => i.lat !== 0 || i.lng !== 0)
                        .map((i) => ({ lat: i.lat, lng: i.lng })),
                }))
                .filter((r) => r.path.length >= 2),
        [days],
    )

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-100">
                <p className="text-sm text-slate-400">지도 로딩 중...</p>
            </div>
        )
    }

    return (
        <GoogleMap
            defaultCenter={center}
            defaultZoom={12}
            mapId={mapId}
            gestureHandling="greedy"
            streetViewControl={false}
            style={{ width: '100%', height: '100%' }}
        >
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
                const color = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length]
                return day.items
                    .filter((item) => item.lat !== 0 || item.lng !== 0)
                    .map((item, index) => (
                        <AdvancedMarker
                            key={item.id}
                            position={{ lat: item.lat, lng: item.lng }}
                        >
                            <div
                                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md"
                                style={{ backgroundColor: color }}
                            >
                                {index + 1}
                            </div>
                        </AdvancedMarker>
                    ))
            })}
        </GoogleMap>
    )
}

export function KanbanMapPanel({ days }: Props) {
    const [open, setOpen] = useState(false)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const totalItems = days.reduce((sum, d) => sum + d.items.length, 0)

    return (
        <div className="shrink-0 border-b border-slate-200 bg-white">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-slate-50"
            >
                <MapIcon size={14} className="shrink-0 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">지도 보기</span>
                {totalItems > 0 && (
                    <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                        {totalItems}개 장소
                    </span>
                )}
                <span className="ml-auto text-slate-400">
                    {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                </span>
            </button>
            {open && (
                <div className="h-52">
                    {!apiKey ? (
                        <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center">
                            <p className="text-sm text-slate-500">
                                Google Maps API 키를 설정해 주세요.
                            </p>
                        </div>
                    ) : (
                        <MapContent days={days} />
                    )}
                </div>
            )}
        </div>
    )
}
