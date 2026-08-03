'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPinIcon } from 'lucide-react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useDebounce } from '@/shared/lib/use-debounce'
import { fetchDestinationMetadata } from '../api/destination-api'

export type DestinationResult = {
    name: string
    englishName: string
    countryCode: string | null
    lat: number
    lng: number
}

// Places API (New) 타입 정의
type NewPlace = {
    fetchFields: (options: { fields: string[] }) => Promise<void>
    location?: { lat: () => number; lng: () => number }
    addressComponents?: Array<{
        shortText: string
        types: string[]
    }>
}

type PlacePrediction = {
    text: { text: string }
    placeId: string
    mainText: { text: string }
    secondaryText?: { text: string }
    toPlace: () => NewPlace
}

type PlaceSuggestion = {
    placePrediction: PlacePrediction | null
}

type AutocompleteSuggestionLib = {
    fetchAutocompleteSuggestions: (request: {
        input: string
        includedPrimaryTypes?: string[]
        language?: string
    }) => Promise<{ suggestions: PlaceSuggestion[] }>
}

type Props = {
    value: string
    onChange: (result: DestinationResult | null, rawText: string) => void
    placeholder?: string
    className?: string
}

export function DestinationAutocomplete({
    value,
    onChange,
    placeholder = '예: 오사카, 제주도, 파리',
    className,
}: Props) {
    const placesLib = useMapsLibrary('places')
    const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    // 외부 클릭 시 닫기
    useEffect(() => {
        function handlePointerDown(e: PointerEvent) {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('pointerdown', handlePointerDown)
        return () =>
            document.removeEventListener('pointerdown', handlePointerDown)
    }, [])

    const fetchSuggestions = useDebounce((text: string) => {
        if (!placesLib) return
        const lib = placesLib as unknown as {
            AutocompleteSuggestion: AutocompleteSuggestionLib
        }
        void lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: text,
            includedPrimaryTypes: ['locality', 'administrative_area_level_1'],
            language: 'en',
        })
            .then(({ suggestions: results }) => {
                if (!mountedRef.current) return
                const predictions = results
                    .map((s) => s.placePrediction)
                    .filter((p): p is PlacePrediction => p !== null)
                setSuggestions(predictions)
                setOpen(predictions.length > 0)
            })
            .catch(() => {
                if (!mountedRef.current) return
                setSuggestions([])
                setOpen(false)
            })
    }, 250)

    function handleInputChange(text: string) {
        onChange(null, text)
        if (!text.trim() || !placesLib) {
            setSuggestions([])
            setOpen(false)
            return
        }
        fetchSuggestions(text)
    }

    async function handleSelect(prediction: PlacePrediction) {
        setOpen(false)
        setSuggestions([])

        try {
            const place = prediction.toPlace()
            await place.fetchFields({
                fields: ['location', 'addressComponents'],
            })

            const loc = place.location
            if (!loc) return
            const countryCode = place.addressComponents?.find((component) =>
                component.types.includes('country'),
            )?.shortText
            const metadata = await fetchDestinationMetadata(
                prediction.placeId,
            ).catch(() => null)

            onChange(
                {
                    name: value.trim() || prediction.mainText.text,
                    englishName:
                        metadata?.englishName ?? prediction.mainText.text,
                    countryCode:
                        metadata?.countryCode ??
                        countryCode?.toUpperCase() ??
                        null,
                    lat: loc.lat(),
                    lng: loc.lng(),
                },
                value.trim() || prediction.mainText.text,
            )
        } catch {
            onChange(null, prediction.mainText.text)
        }
    }

    return (
        <div ref={containerRef} className={`relative ${className ?? ''}`}>
            <input
                type="text"
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                placeholder={placeholder}
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {open && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {suggestions.map((s) => (
                        <li key={s.placeId}>
                            <button
                                type="button"
                                onClick={() => void handleSelect(s)}
                                className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-slate-50"
                            >
                                <MapPinIcon
                                    size={14}
                                    className="mt-0.5 shrink-0 text-brand"
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">
                                        {s.mainText.text}
                                    </p>
                                    {s.secondaryText && (
                                        <p className="truncate text-xs text-slate-400">
                                            {s.secondaryText.text}
                                        </p>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
