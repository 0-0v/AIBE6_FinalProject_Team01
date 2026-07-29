'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
    CheckIcon,
    LayersIcon,
    MapIcon,
    SatelliteIcon,
} from 'lucide-react'

export type MapDisplayType = 'roadmap' | 'hybrid'

const DISPLAY_TYPE_STORAGE_KEY = 'trip-room-map-display-type'
const DISPLAY_TYPE_CHANGE_EVENT = 'trip-room-map-display-type-change'

function getSnapshot(): MapDisplayType {
    return window.localStorage.getItem(DISPLAY_TYPE_STORAGE_KEY) === 'hybrid'
        ? 'hybrid'
        : 'roadmap'
}

function subscribe(onStoreChange: () => void): () => void {
    window.addEventListener('storage', onStoreChange)
    window.addEventListener(DISPLAY_TYPE_CHANGE_EVENT, onStoreChange)
    return () => {
        window.removeEventListener('storage', onStoreChange)
        window.removeEventListener(DISPLAY_TYPE_CHANGE_EVENT, onStoreChange)
    }
}

function getServerSnapshot(): MapDisplayType {
    return 'roadmap'
}

export function useMapDisplayType(): [
    MapDisplayType,
    (type: MapDisplayType) => void,
] {
    const type = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

    function setType(nextType: MapDisplayType) {
        window.localStorage.setItem(DISPLAY_TYPE_STORAGE_KEY, nextType)
        window.dispatchEvent(new Event(DISPLAY_TYPE_CHANGE_EVENT))
    }

    return [type, setType]
}

type Props = {
    value: MapDisplayType
    onChange: (type: MapDisplayType) => void
    className?: string
}

export function MapTypeToggle({
    value,
    onChange,
    className = '',
}: Props) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const options = [
        { value: 'roadmap' as const, label: '일반 지도', icon: MapIcon },
        { value: 'hybrid' as const, label: '위성 지도', icon: SatelliteIcon },
    ]

    useEffect(() => {
        if (!open) return

        function closeOnOutsideClick(event: PointerEvent) {
            if (!menuRef.current?.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('pointerdown', closeOnOutsideClick)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [open])

    return (
        <div
            ref={menuRef}
            className={`absolute right-3 top-16 z-30 ${className}`}
        >
            <button
                type="button"
                aria-label="지도 표시 방식 변경"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                title="지도 표시 방식"
                className={`relative flex size-10 items-center justify-center rounded-lg border border-white/80 bg-white/95 shadow-md backdrop-blur transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    open ? 'text-brand ring-2 ring-brand/20' : 'text-slate-600'
                }`}
            >
                <LayersIcon size={18} aria-hidden />
                <span
                    className={`absolute bottom-1.5 right-1.5 size-1.5 rounded-full ring-1 ring-white ${
                        value === 'hybrid' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                    aria-hidden
                />
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="지도 표시 방식"
                    className="absolute right-full top-0 mr-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                    {options.map((option) => {
                        const Icon = option.icon
                        const selected = value === option.value
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={selected}
                                onClick={() => {
                                    onChange(option.value)
                                    setOpen(false)
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-brand ${
                                    selected
                                        ? 'bg-slate-100 font-bold text-slate-900'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Icon size={14} aria-hidden />
                                <span className="flex-1">{option.label}</span>
                                {selected && (
                                    <CheckIcon
                                        size={13}
                                        className="text-brand"
                                        aria-hidden
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
