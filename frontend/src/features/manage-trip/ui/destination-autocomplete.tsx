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
type SessionToken = object

type NewPlace = {
    fetchFields: (options: {
        fields: string[]
        sessionToken?: SessionToken
    }) => Promise<void>
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
        sessionToken?: SessionToken
    }) => Promise<{ suggestions: PlaceSuggestion[] }>
}

type Props = {
    value: string
    onChange: (result: DestinationResult | null, rawText: string) => void
    locked?: boolean
    onUnlock?: () => void
    placeholder?: string
    className?: string
}

export function DestinationAutocomplete({
    value,
    onChange,
    locked = false,
    onUnlock,
    placeholder = '예: 오사카, 제주도, 파리',
    className,
}: Props) {
    const placesLib = useMapsLibrary('places')
    const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const mountedRef = useRef(true)
    // 자동완성 세션 토큰: 타이핑 시작 ~ 장소 선택까지를 하나의 과금 단위로 묶음
    const sessionTokenRef = useRef<SessionToken | null>(null)
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
            AutocompleteSessionToken: new () => SessionToken
        }
        // 세션 토큰이 없으면 새로 생성 (타이핑 세션 시작)
        if (!sessionTokenRef.current && lib.AutocompleteSessionToken) {
            sessionTokenRef.current = new lib.AutocompleteSessionToken()
        }
        void lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: text,
            includedPrimaryTypes: ['locality', 'administrative_area_level_1'],
            language: 'en',
            sessionToken: sessionTokenRef.current ?? undefined,
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
    }, 400)

    function handleInputChange(text: string) {
        onChange(null, text)
        if (text.trim().length < 2 || !placesLib) {
            setSuggestions([])
            setOpen(false)
            return
        }
        fetchSuggestions(text)
    }

    function handleUnlock() {
        onUnlock?.()
        requestAnimationFrame(() => inputRef.current?.focus())
    }

    async function handleSelect(prediction: PlacePrediction) {
        setOpen(false)
        setSuggestions([])

        // 선택 시 세션 토큰을 fetchFields에 포함 → 세션 종료 후 토큰 초기화
        const token = sessionTokenRef.current
        sessionTokenRef.current = null

        try {
            const place = prediction.toPlace()
            await place.fetchFields({
                fields: ['location', 'addressComponents'],
                sessionToken: token ?? undefined,
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
                    name: prediction.mainText.text,
                    englishName:
                        metadata?.englishName ?? prediction.mainText.text,
                    countryCode:
                        metadata?.countryCode ??
                        countryCode?.toUpperCase() ??
                        null,
                    lat: loc.lat(),
                    lng: loc.lng(),
                },
                prediction.mainText.text,
            )
        } catch {
            onChange(null, prediction.mainText.text)
        }
    }

    return (
        <div ref={containerRef} className={`relative ${className ?? ''}`}>
            <div className="mt-2 flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    readOnly={locked}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() =>
                        !locked && suggestions.length > 0 && setOpen(true)
                    }
                    placeholder={placeholder}
                    autoComplete="off"
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 font-normal outline-none transition ${
                        locked
                            ? 'cursor-default border-slate-200 bg-slate-100 text-slate-500'
                            : 'border-slate-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/20'
                    }`}
                />
                {locked && (
                    <button
                        type="button"
                        onClick={handleUnlock}
                        className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand"
                    >
                        위치 변경
                    </button>
                )}
            </div>
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
