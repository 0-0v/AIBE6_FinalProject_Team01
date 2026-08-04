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
    CheckIcon,
} from 'lucide-react'
import {
    CategoryIcon,
    resolvePlaceCategoryPresentation,
    CATEGORY_META,
} from '@/entities/trip'
import { searchPlaces } from '../api/placeApi'
import { PLACE_SEARCH_CATEGORIES } from '../model/categories'
import type {
    AiPlaceSearchRecommendation,
    PlaceSearchSuggestion,
    PlaceSearchResult,
} from '../model/types'
import { resolveGooglePlacePhotoUrl } from '@/shared/api/client'

type Props = {
    onAdd: (r: PlaceSearchResult) => Promise<void>
    location?: string
    latitude?: number
    longitude?: number
    existingGooglePlaceIds?: Set<string>
    aiRecommendations?: AiPlaceSearchRecommendation[] | null
}

export function PlaceSearch({
    onAdd,
    location,
    latitude,
    longitude,
    existingGooglePlaceIds,
    aiRecommendations,
}: Props) {
    const [q, setQ] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedSuggestion, setSelectedSuggestion] =
        useState<PlaceSearchSuggestion | null>(null)
    const [searchDismissed, setSearchDismissed] = useState(false)
    const [results, setResults] = useState<PlaceSearchResult[]>(() =>
        aiRecommendations
            ? aiRecommendations.map((recommendation) => recommendation.place)
            : [],
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [added, setAdded] = useState<string[]>([])
    const [adding, setAdding] = useState<string[]>([])
    const [activeAiRecommendations, setActiveAiRecommendations] = useState<
        AiPlaceSearchRecommendation[] | null
    >(aiRecommendations ?? null)
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const requestId = useRef(0)
    const inputRef = useRef<HTMLInputElement>(null)

    const activeTab =
        PLACE_SEARCH_CATEGORIES.find((t) => t.key === selectedCategory) ??
        PLACE_SEARCH_CATEGORIES[0]

    useEffect(() => {
        const trimmed = q.trim()
        const categoryQuery =
            selectedCategory === 'all' || searchDismissed ? '' : activeTab.label
        const searchQuery = trimmed || categoryQuery
        const includedType =
            selectedSuggestion?.includedType ??
            (selectedSuggestion || selectedCategory === 'all'
                ? undefined
                : selectedCategory)
        const currentRequestId = ++requestId.current
        const controller = new AbortController()

        if (debounceTimer.current) clearTimeout(debounceTimer.current)

        debounceTimer.current = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setResults([])
                setError(null)
                setLoading(false)
                return
            }

            setLoading(true)
            setError(null)
            try {
                const data = await searchPlaces(searchQuery, {
                    location,
                    includedType,
                    latitude,
                    longitude,
                    signal: controller.signal,
                })
                if (requestId.current === currentRequestId) {
                    setResults(data)
                }
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
        }, 700)

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
            controller.abort()
        }
    }, [
        q,
        selectedCategory,
        selectedSuggestion,
        activeTab.label,
        searchDismissed,
        location,
        latitude,
        longitude,
    ])

    function handleCategorySelect(key: string) {
        setActiveAiRecommendations(null)
        setSelectedCategory(key)
        setSelectedSuggestion(null)
        setSearchDismissed(false)
        setResults([])
        setQ('')
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    function handleSuggestionClick(suggestion: PlaceSearchSuggestion) {
        setActiveAiRecommendations(null)
        setSelectedSuggestion(suggestion)
        setSearchDismissed(false)
        setQ(suggestion.label)
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    function resetSearchAfterAdd() {
        requestId.current += 1
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        setQ('')
        setResults([])
        setActiveAiRecommendations(null)
        setSelectedSuggestion(null)
        setSearchDismissed(true)
        setError(null)
        setLoading(false)
    }

    return (
        <Tooltip.Provider delayDuration={400}>
            <div className="border-b border-slate-200 px-4 py-3">
                {/* 검색 입력 */}
                <div className="relative">
                    <SearchIcon
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        ref={inputRef}
                        value={q}
                        aria-label="장소 검색"
                        onChange={(e) => {
                            setActiveAiRecommendations(null)
                            setSelectedSuggestion(null)
                            setSearchDismissed(false)
                            setResults([])
                            setQ(e.target.value)
                        }}
                        placeholder={activeTab.placeholder}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                    {q && (
                        <button
                            onClick={() => {
                                setActiveAiRecommendations(null)
                                setSelectedSuggestion(null)
                                setSearchDismissed(true)
                                setQ('')
                            }}
                            aria-label="검색어 지우기"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <XIcon size={15} />
                        </button>
                    )}
                </div>

                {/* 카테고리 탭 */}
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    {PLACE_SEARCH_CATEGORIES.map((tab) => {
                        const isActive = selectedCategory === tab.key
                        const meta = tab.categoryKey
                            ? CATEGORY_META[tab.categoryKey]
                            : null
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleCategorySelect(tab.key)}
                                className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                    isActive
                                        ? 'border-transparent text-white'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                                style={
                                    isActive && meta
                                        ? {
                                              backgroundColor: meta.color,
                                              borderColor: meta.color,
                                          }
                                        : isActive
                                          ? {
                                                backgroundColor: '#334155',
                                                borderColor: '#334155',
                                            }
                                          : undefined
                                }
                            >
                                {meta && (
                                    <span
                                        className="flex items-center justify-center"
                                        style={{
                                            color: isActive
                                                ? 'white'
                                                : meta.color,
                                        }}
                                    >
                                        <CategoryIcon
                                            icon={meta.icon}
                                            size={11}
                                        />
                                    </span>
                                )}
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* 하위 키워드 칩 */}
                {activeTab.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {activeTab.suggestions.map((suggestion) => (
                            <button
                                key={suggestion.label}
                                onClick={() =>
                                    handleSuggestionClick(suggestion)
                                }
                                aria-pressed={
                                    selectedSuggestion?.label ===
                                    suggestion.label
                                }
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                                    selectedSuggestion?.label ===
                                    suggestion.label
                                        ? 'border-brand bg-brand-50 text-brand'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                            >
                                {suggestion.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* 검색 결과 */}
                {activeAiRecommendations && (
                    <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2">
                        <p className="text-xs font-extrabold text-brand">
                            AI가 현재 동선과 여행 취향을 함께 분석한 추천
                            결과예요
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            원하는 장소만 기존 추가 버튼으로 여행 후보에 등록할
                            수 있어요.
                        </p>
                    </div>
                )}
                {(q.trim().length >= 2 ||
                    (!searchDismissed && selectedCategory !== 'all') ||
                    activeAiRecommendations) && (
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-100">
                        <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
                            장소 정보 제공:{' '}
                            <a
                                href="https://maps.google.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-black text-blue-600 hover:underline"
                            >
                                Google Maps
                            </a>
                        </p>
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
                            <div className="px-3 py-4 text-center">
                                <p className="text-sm text-slate-400">
                                    검색 결과가 없어요
                                </p>
                                {selectedCategory !== 'all' && (
                                    <button
                                        onClick={() =>
                                            handleCategorySelect('all')
                                        }
                                        className="mt-2 text-xs font-semibold text-brand hover:underline"
                                    >
                                        전체 카테고리에서 다시 검색
                                    </button>
                                )}
                            </div>
                        )}
                        {!loading && !error && results.length > 0 && (
                            <p className="border-b border-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-400">
                                {results.length}개의 결과
                            </p>
                        )}
                        {!loading &&
                            !error &&
                            results.map((r) => {
                                const aiRecommendation =
                                    activeAiRecommendations?.find(
                                        (recommendation) =>
                                            recommendation.place
                                                .googlePlaceId ===
                                            r.googlePlaceId,
                                    )
                                const isExisting =
                                    existingGooglePlaceIds?.has(
                                        r.googlePlaceId,
                                    ) ?? false
                                const isAdded =
                                    isExisting ||
                                    added.includes(r.googlePlaceId)
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
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="truncate text-sm font-medium">
                                                                {r.name}
                                                            </span>
                                                            {isExisting && (
                                                                <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                                                                    이미 추가됨
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className="inline-block shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                                                                style={{
                                                                    backgroundColor:
                                                                        presentation.color +
                                                                        '18',
                                                                    color: presentation.color,
                                                                }}
                                                            >
                                                                {
                                                                    presentation.label
                                                                }
                                                            </span>
                                                            <span className="truncate text-xs text-slate-400">
                                                                {r.address}
                                                            </span>
                                                        </div>
                                                        {aiRecommendation && (
                                                            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-rose-500">
                                                                {
                                                                    aiRecommendation.reason
                                                                }
                                                            </p>
                                                        )}
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
                                                                className="mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-none"
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
                                                    resetSearchAfterAdd()
                                                } catch {
                                                    // 호출부에서 사용자 오류 UI를 처리한다.
                                                } finally {
                                                    setAdding((prev) =>
                                                        prev.filter(
                                                            (id) =>
                                                                id !==
                                                                r.googlePlaceId,
                                                        ),
                                                    )
                                                }
                                            }}
                                            className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                                isAdded
                                                    ? 'bg-slate-100 text-slate-400'
                                                    : isAdding
                                                      ? 'bg-slate-100 text-slate-400'
                                                      : 'bg-brand text-white hover:bg-brand-700'
                                            }`}
                                        >
                                            {isAdded ? (
                                                <>
                                                    <CheckIcon size={13} />{' '}
                                                    추가됨
                                                </>
                                            ) : isAdding ? (
                                                '추가 중...'
                                            ) : (
                                                <>
                                                    <PlusIcon size={13} /> 추가
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
