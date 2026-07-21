'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SearchIcon, PlusIcon, XIcon } from 'lucide-react'
import { searchPlaces } from '../api/placeApi'
import type { PlaceSearchResult } from '../model/types'

function getPlaceEmoji(placeType: string | null): string {
    if (!placeType) return '📍'
    if (placeType.includes('restaurant') || placeType.includes('food'))
        return '🍜'
    if (placeType.includes('cafe') || placeType.includes('coffee')) return '☕️'
    if (placeType.includes('shopping') || placeType.includes('store'))
        return '🛍️'
    if (
        placeType.includes('park') ||
        placeType.includes('nature') ||
        placeType.includes('garden')
    )
        return '🌿'
    if (
        placeType.includes('museum') ||
        placeType.includes('attraction') ||
        placeType.includes('tourist')
    )
        return '🏛️'
    return '📍'
}

type Props = {
    onAdd: (r: PlaceSearchResult) => Promise<void>
}

export function PlaceSearch({ onAdd }: Props) {
    const [q, setQ] = useState('')
    const [results, setResults] = useState<PlaceSearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [added, setAdded] = useState<string[]>([])
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const requestId = useRef(0)

    useEffect(() => {
        const trimmed = q.trim()
        const currentRequestId = ++requestId.current
        const controller = new AbortController()

        if (debounceTimer.current) clearTimeout(debounceTimer.current)

        // 빈 쿼리 또는 2자 미만은 debounce 콜백 안에서 상태 초기화 (동기 setState 방지)
        debounceTimer.current = setTimeout(async () => {
            if (trimmed.length < 2) {
                setResults([])
                setError(null)
                setLoading(false)
                return
            }

            setLoading(true)
            setError(null)
            try {
                const data = await searchPlaces(trimmed, controller.signal)
                if (requestId.current === currentRequestId) setResults(data)
            } catch {
                if (
                    !controller.signal.aborted &&
                    requestId.current === currentRequestId
                ) {
                    setError('검색 중 오류가 발생했습니다.')
                    setResults([])
                }
            } finally {
                if (requestId.current === currentRequestId) setLoading(false)
            }
        }, 300)

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
            controller.abort()
        }
    }, [q])

    return (
        <div className="border-b border-slate-200 p-3">
            <div className="relative">
                <SearchIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    value={q}
                    aria-label="장소 검색"
                    onChange={(e) => {
                        setResults([])
                        setQ(e.target.value)
                    }}
                    placeholder="가고 싶은 장소 검색 (Google Maps)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
                {q && (
                    <button
                        onClick={() => setQ('')}
                        aria-label="검색어 지우기"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <XIcon size={15} />
                    </button>
                )}
            </div>

            {q.trim().length >= 2 && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
                    {loading && (
                        <p className="px-3 py-4 text-center text-sm text-slate-400">
                            검색 중...
                        </p>
                    )}
                    {!loading && error && (
                        <p className="px-3 py-4 text-center text-sm text-red-400">
                            {error}
                        </p>
                    )}
                    {!loading && !error && results.length === 0 && (
                        <p className="px-3 py-4 text-center text-sm text-slate-400">
                            검색 결과가 없어요
                        </p>
                    )}
                    {!loading &&
                        !error &&
                        results.map((r) => {
                            const isAdded = added.includes(r.googlePlaceId)
                            return (
                                <div
                                    key={r.googlePlaceId}
                                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                                >
                                    <span className="text-lg">
                                        {getPlaceEmoji(r.placeType)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">
                                            {r.name}
                                        </div>
                                        <div className="truncate text-xs text-slate-400">
                                            {r.address}
                                        </div>
                                    </div>
                                    <button
                                        disabled={isAdded}
                                        onClick={async () => {
                                            try {
                                                await onAdd(r)
                                                setAdded((prev) => [
                                                    ...prev,
                                                    r.googlePlaceId,
                                                ])
                                            } catch {
                                                // 호출부에서 사용자 오류 UI를 처리한다.
                                            }
                                        }}
                                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                            isAdded
                                                ? 'bg-slate-100 text-slate-400'
                                                : 'bg-brand text-white hover:bg-brand-700'
                                        }`}
                                    >
                                        {isAdded ? (
                                            '추가됨'
                                        ) : (
                                            <>
                                                <PlusIcon size={13} /> 후보 추가
                                            </>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                </div>
            )}
        </div>
    )
}
