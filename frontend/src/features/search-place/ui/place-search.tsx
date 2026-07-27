'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
    SearchIcon,
    PlusIcon,
    XIcon,
    StarIcon,
    PhoneIcon,
    GlobeIcon,
    ClockIcon,
    BookOpenIcon,
} from 'lucide-react'
import {
    CategoryIcon,
    resolvePlaceCategoryPresentation,
} from '@/entities/trip'
import { searchPlaces } from '../api/placeApi'
import type { PlaceSearchResult } from '../model/types'
import { resolveGooglePlacePhotoUrl } from '@/shared/api/client'

type Props = {
    onAdd: (r: PlaceSearchResult) => Promise<void>
}

export function PlaceSearch({ onAdd }: Props) {
    const [q, setQ] = useState('')
    const [results, setResults] = useState<PlaceSearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [added, setAdded] = useState<string[]>([])
    const [adding, setAdding] = useState<string[]>([])
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
        <Tooltip.Provider delayDuration={400}>
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
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-100">
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
                                const isAdding = adding.includes(
                                    r.googlePlaceId,
                                )
                                const presentation =
                                    resolvePlaceCategoryPresentation(
                                        r.recommendedCategoryType,
                                    )
                                return (
                                    <div
                                        key={r.googlePlaceId}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                                    >
                                        <Tooltip.Root>
                                            <Tooltip.Trigger asChild>
                                                <div className="flex min-w-0 flex-1 cursor-default items-center gap-3">
                                                    <span
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                presentation.color +
                                                                '18',
                                                            color: presentation.color,
                                                        }}
                                                    >
                                                        <CategoryIcon
                                                            icon={
                                                                presentation.icon
                                                            }
                                                            size={16}
                                                        />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium">
                                                            {r.name}
                                                        </div>
                                                        <div className="truncate text-xs text-slate-400">
                                                            {r.address}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Tooltip.Trigger>
                                            <Tooltip.Portal>
                                                <Tooltip.Content
                                                    side="right"
                                                    sideOffset={8}
                                                    className="z-50 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg"
                                                >
                                                    {r.photoName && (
                                                        <img
                                                            src={
                                                                resolveGooglePlacePhotoUrl(
                                                                    r.photoName,
                                                                ) ?? undefined
                                                            }
                                                            alt={r.name}
                                                            className="h-36 w-full object-cover"
                                                        />
                                                    )}
                                                    <div className="p-3 space-y-2">
                                                        {/* 이름 + 카테고리 */}
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {r.name}
                                                            </p>
                                                            <span
                                                                className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold"
                                                                style={{
                                                                    backgroundColor:
                                                                        presentation.color +
                                                                        '20',
                                                                    color: presentation.color,
                                                                }}
                                                            >
                                                                {
                                                                    presentation.label
                                                                }
                                                            </span>
                                                        </div>

                                                        {/* 평점 + 영업여부 */}
                                                        <div className="flex items-center gap-2">
                                                            {r.rating !=
                                                                null && (
                                                                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                                                    <StarIcon
                                                                        size={
                                                                            11
                                                                        }
                                                                        className="fill-amber-400 text-amber-400"
                                                                    />
                                                                    {r.rating.toFixed(
                                                                        1,
                                                                    )}
                                                                    {r.userRatingCount !=
                                                                        null && (
                                                                        <span className="font-normal text-slate-400">
                                                                            (
                                                                            {r.userRatingCount.toLocaleString()}
                                                                            )
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            )}
                                                            {r.openNow !=
                                                                null && (
                                                                <span
                                                                    className={`flex items-center gap-1 text-xs font-bold ${r.openNow ? 'text-emerald-500' : 'text-red-400'}`}
                                                                >
                                                                    <ClockIcon
                                                                        size={
                                                                            11
                                                                        }
                                                                    />
                                                                    {r.openNow
                                                                        ? '영업 중'
                                                                        : '영업 종료'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 장소 설명 */}
                                                        {r.editorialSummary && (
                                                            <p className="text-[11px] leading-relaxed text-slate-500 italic border-l-2 border-slate-200 pl-2">
                                                                {
                                                                    r.editorialSummary
                                                                }
                                                            </p>
                                                        )}

                                                        {/* 주소 */}
                                                        <p className="text-xs leading-relaxed text-slate-500">
                                                            {r.address}
                                                        </p>

                                                        {/* 영업시간 */}
                                                        {r.weekdayDescriptions &&
                                                            r
                                                                .weekdayDescriptions
                                                                .length > 0 && (
                                                                <details className="text-xs text-slate-500">
                                                                    <summary className="flex cursor-pointer items-center gap-1 font-medium text-slate-600 hover:text-slate-800">
                                                                        <ClockIcon
                                                                            size={
                                                                                11
                                                                            }
                                                                        />{' '}
                                                                        영업시간
                                                                    </summary>
                                                                    <ul className="mt-1 space-y-0.5 pl-4">
                                                                        {r.weekdayDescriptions.map(
                                                                            (
                                                                                d,
                                                                                i,
                                                                            ) => (
                                                                                <li
                                                                                    key={
                                                                                        i
                                                                                    }
                                                                                    className="text-[10px] leading-relaxed"
                                                                                >
                                                                                    {
                                                                                        d
                                                                                    }
                                                                                </li>
                                                                            ),
                                                                        )}
                                                                    </ul>
                                                                </details>
                                                            )}

                                                        {/* 전화번호 */}
                                                        {r.phoneNumber && (
                                                            <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <PhoneIcon
                                                                    size={11}
                                                                    className="shrink-0"
                                                                />
                                                                {r.phoneNumber}
                                                            </p>
                                                        )}

                                                        {/* 웹사이트 */}
                                                        {r.websiteUri && (
                                                            <a
                                                                href={
                                                                    r.websiteUri
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-xs text-brand hover:underline"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <GlobeIcon
                                                                    size={11}
                                                                    className="shrink-0"
                                                                />
                                                                <span className="truncate">
                                                                    {r.websiteUri
                                                                        .replace(
                                                                            /^https?:\/\//,
                                                                            '',
                                                                        )
                                                                        .replace(
                                                                            /\/$/,
                                                                            '',
                                                                        )}
                                                                </span>
                                                            </a>
                                                        )}

                                                        {/* 최신 리뷰 */}
                                                        {r.topReviewText && (
                                                            <div className="rounded-lg bg-slate-50 p-2 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                                                                        <BookOpenIcon
                                                                            size={
                                                                                10
                                                                            }
                                                                        />
                                                                        {r.topReviewAuthor ??
                                                                            '익명'}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        {r.topReviewRating !=
                                                                            null && (
                                                                            <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold">
                                                                                <StarIcon
                                                                                    size={
                                                                                        9
                                                                                    }
                                                                                    className="fill-amber-400 text-amber-400"
                                                                                />
                                                                                {
                                                                                    r.topReviewRating
                                                                                }
                                                                            </span>
                                                                        )}
                                                                        {r.topReviewTime && (
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {
                                                                                    r.topReviewTime
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="line-clamp-3 text-[10px] leading-relaxed text-slate-500">
                                                                    {
                                                                        r.topReviewText
                                                                    }
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Tooltip.Arrow className="fill-white" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>
                                        <button
                                            disabled={isAdded || isAdding}
                                            onClick={async () => {
                                                if (isAdded || isAdding) return
                                                setAdding((prev) => [
                                                    ...prev,
                                                    r.googlePlaceId,
                                                ])
                                                try {
                                                    await onAdd(r)
                                                    setAdded((prev) =>
                                                        prev.includes(
                                                            r.googlePlaceId,
                                                        )
                                                            ? prev
                                                            : [
                                                                  ...prev,
                                                                  r.googlePlaceId,
                                                              ],
                                                    )
                                                } catch {
                                                    // 호출부에서 사용자 오류 UI를 처리한다.
                                                } finally {
                                                    setAdding((prev) =>
                                                        prev.filter(
                                                            (placeId) =>
                                                                placeId !==
                                                                r.googlePlaceId,
                                                        ),
                                                    )
                                                }
                                            }}
                                            className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                                isAdded || isAdding
                                                    ? 'bg-slate-100 text-slate-400'
                                                    : 'bg-brand text-white hover:bg-brand-700'
                                            }`}
                                        >
                                            {isAdded ? (
                                                '추가됨'
                                            ) : isAdding ? (
                                                '추가 중...'
                                            ) : (
                                                <>
                                                    <PlusIcon size={13} />{' '}
                                                    지도에 추가
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )
                            })}
                    </div>
                )}
            </div>
        </Tooltip.Provider>
    )
}
