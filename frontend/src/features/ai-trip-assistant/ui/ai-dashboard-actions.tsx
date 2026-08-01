'use client'

import { useState } from 'react'
import {
    ArrowRightIcon,
    Clock3Icon,
    LoaderCircleIcon,
    MapPinnedIcon,
    RouteIcon,
    XIcon,
} from 'lucide-react'
import type { ItineraryDay } from '@/entities/trip'
import { PLACE_SEARCH_CATEGORIES } from '@/features/search-place'
import { getApiErrorMessage } from '@/shared/api/client'
import { recommendPlacesAlongRoute } from '../api/ai-trip-api'
import { savePendingAiTripAction } from '../lib/pending-ai-trip-action'
import { AiBrandMark } from './ai-brand-mark'
import { AiItineraryReplanModal } from './ai-itinerary-replan-modal'

type Props = {
    tripId: number
    days: ItineraryDay[]
    selectedDayId: number | null
    onOpenTrip: () => void
    onReplanApplied: (days: ItineraryDay[]) => void
}

const categories = PLACE_SEARCH_CATEGORIES.filter(
    (category) => category.key !== 'all' && category.key !== 'transit_station',
)

function localDateValue(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function localTimeValue(date: Date) {
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute}`
}

function isUpcomingSegment(
    itineraryDate: string,
    destinationStartTime: string | null,
    referenceTime: Date | null,
) {
    if (!referenceTime) return true
    const today = localDateValue(referenceTime)
    if (itineraryDate < today) return false
    if (itineraryDate > today || !destinationStartTime) return true
    return destinationStartTime.slice(0, 5) > localTimeValue(referenceTime)
}

export function AiDashboardActions({
    tripId,
    days,
    selectedDayId,
    onOpenTrip,
    onReplanApplied,
}: Props) {
    const [mode, setMode] = useState<'place' | 'replan' | null>(null)
    const [category, setCategory] = useState(categories[0].key)
    const [prompt, setPrompt] = useState('')
    const [selectedSegmentKey, setSelectedSegmentKey] = useState<string | null>(
        null,
    )
    const [recommendationReferenceTime, setRecommendationReferenceTime] =
        useState<Date | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const routeSegments = days.flatMap((day) => {
        const orderedItems = [...day.items]
            .filter(
                (item): item is typeof item & { tripPlaceId: string } =>
                    item.tripPlaceId !== null,
            )
            .sort((first, second) => first.sortOrder - second.sortOrder)
        return orderedItems
            .slice(0, -1)
            .map((from, index) => {
                const to = orderedItems[index + 1]
                return {
                    key: `${day.id}:${from.tripPlaceId}:${to.tripPlaceId}`,
                    dayId: Number(day.id),
                    dayNumber: day.dayNumber,
                    itineraryDate: day.itineraryDate,
                    segmentNumber: index + 1,
                    from,
                    to,
                }
            })
            .filter((segment) =>
                isUpcomingSegment(
                    segment.itineraryDate,
                    segment.to.startTime,
                    recommendationReferenceTime,
                ),
            )
    })
    const defaultSegment =
        routeSegments.find((segment) => segment.dayId === selectedDayId) ??
        routeSegments[0]
    const selectedSegment =
        routeSegments.find((segment) => segment.key === selectedSegmentKey) ??
        defaultSegment

    async function submitPlaceRecommendation() {
        if (!selectedSegment) {
            setError('장소가 2개 이상 배치된 Day에서 동선을 선택해 주세요.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const recommendations = await recommendPlacesAlongRoute(tripId, {
                dayId: selectedSegment.dayId,
                fromTripPlaceId: Number(selectedSegment.from.tripPlaceId),
                toTripPlaceId: Number(selectedSegment.to.tripPlaceId),
                category,
                prompt,
                limit: 5,
            })
            savePendingAiTripAction(tripId, {
                kind: 'place-recommendations',
                recommendations,
            })
            onOpenTrip()
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    'AI 장소 추천을 불러오지 못했습니다.',
                ),
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setMode('place')
                        setPrompt('')
                        setSelectedSegmentKey(null)
                        setRecommendationReferenceTime(new Date())
                        setError(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff0f3] px-3 py-2 text-xs font-extrabold text-[#c94c63] transition hover:bg-rose-100"
                >
                    <MapPinnedIcon size={15} />
                    AI 장소 추천
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode('replan')
                        setError(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800"
                >
                    <RouteIcon size={15} />
                    AI 일정 재배치
                </button>
            </div>

            {mode === 'place' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[5px]">
                    <section className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
                        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
                        <header className="relative flex items-start justify-between gap-4 bg-gradient-to-br from-[#fff8fa] via-white to-[#fff1f4] px-6 pb-5 pt-6">
                            <div className="flex min-w-0 items-start gap-4">
                                <AiBrandMark />
                                <div className="pt-1">
                                    <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-brand shadow-sm">
                                        PLAMINGO AI
                                    </span>
                                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                                        동선 사이 장소 추천
                                    </h2>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        선택한 Day의 기존 동선에서 크게 벗어나지
                                        않는 실제 장소만 추천해요.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMode(null)}
                                className="rounded-xl border border-white bg-white/80 p-2 text-slate-400 shadow-sm transition hover:bg-white hover:text-slate-700"
                                aria-label="AI 기능 창 닫기"
                            >
                                <XIcon size={18} />
                            </button>
                        </header>

                        <div className="mp-scroll relative overflow-y-auto px-6 pb-6 pt-5">
                            <div>
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-extrabold text-slate-700">
                                            어느 동선 사이를 추천할까요?
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            전체 일정의 연속된 장소 구간을
                                            모아봤어요.
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-rose-500">
                                        필수 선택
                                    </span>
                                </div>

                                {routeSegments.length > 0 ? (
                                    <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                                        {routeSegments.map((segment) => {
                                            const isSelected =
                                                selectedSegment?.key ===
                                                segment.key
                                            return (
                                                <button
                                                    key={segment.key}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSegmentKey(
                                                            segment.key,
                                                        )
                                                        setError(null)
                                                    }}
                                                    className={`w-full rounded-2xl border p-3 text-left transition ${
                                                        isSelected
                                                            ? 'border-brand bg-rose-50 shadow-[0_6px_18px_rgba(225,91,116,0.12)]'
                                                            : 'border-slate-200 bg-white hover:border-rose-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                                                                isSelected
                                                                    ? 'bg-brand text-white'
                                                                    : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                        >
                                                            {segment.dayNumber}
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-700">
                                                            {segment.from
                                                                .placeName ??
                                                                '출발 장소'}
                                                        </span>
                                                        <ArrowRightIcon
                                                            className="shrink-0 text-brand"
                                                            size={14}
                                                        />
                                                        <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-700">
                                                            {segment.to
                                                                .placeName ??
                                                                '도착 장소'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-1 pl-8 text-[10px] font-medium text-slate-400">
                                                        <Clock3Icon size={11} />
                                                        Day {
                                                            segment.dayNumber
                                                        }{' '}
                                                        · 구간{' '}
                                                        {segment.segmentNumber}{' '}
                                                        ·{' '}
                                                        {segment.itineraryDate}{' '}
                                                        ·{' '}
                                                        {segment.from
                                                            .startTime ??
                                                            '시간 미정'}{' '}
                                                        →{' '}
                                                        {segment.to.startTime ??
                                                            '시간 미정'}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-4 text-center">
                                        <p className="text-xs font-bold text-amber-700">
                                            선택한 Day에 장소를 2개 이상 먼저
                                            배치해 주세요.
                                        </p>
                                        <p className="mt-1 text-[10px] text-amber-600">
                                            연속된 두 장소가 있어야 중간 추천
                                            구간을 만들 수 있어요.
                                        </p>
                                    </div>
                                )}

                                <div className="my-5 h-px bg-slate-100" />
                            </div>
                            <div>
                                <p className="mb-2 text-xs font-extrabold text-slate-600">
                                    어떤 장소가 필요하세요?
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() =>
                                                setCategory(item.key)
                                            }
                                            className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                                                category === item.key
                                                    ? 'bg-brand text-white shadow-[0_6px_16px_rgba(225,91,116,0.25)]'
                                                    : 'border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="mt-5 block text-xs font-extrabold text-slate-600">
                                원하는 분위기나 취향
                                <textarea
                                    value={prompt}
                                    onChange={(event) =>
                                        setPrompt(event.target.value)
                                    }
                                    maxLength={500}
                                    rows={4}
                                    placeholder="예: 진한 돈코츠 라멘을 좋아하고 너무 비싸지 않았으면 좋겠어"
                                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-medium leading-6 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
                                />
                            </label>

                            {error && (
                                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                                    {error}
                                </p>
                            )}

                            <button
                                type="button"
                                disabled={loading || routeSegments.length === 0}
                                onClick={() => void submitPlaceRecommendation()}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-[#ed7188] py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(225,91,116,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(225,91,116,0.34)] disabled:translate-y-0 disabled:opacity-50"
                            >
                                {loading && (
                                    <LoaderCircleIcon
                                        className="animate-spin"
                                        size={16}
                                    />
                                )}
                                {loading
                                    ? '동선과 취향을 분석하고 있어요'
                                    : '장소 추천 받기'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {mode === 'replan' && (
                <AiItineraryReplanModal
                    tripId={tripId}
                    onClose={() => setMode(null)}
                    onApplied={onReplanApplied}
                />
            )}
        </>
    )
}
