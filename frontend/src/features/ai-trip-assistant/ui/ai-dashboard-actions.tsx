'use client'

import { useState } from 'react'
import { LoaderCircleIcon, MapPinnedIcon, RouteIcon, XIcon } from 'lucide-react'
import type { ItineraryDay } from '@/entities/trip'
import { PLACE_SEARCH_CATEGORIES } from '@/features/search-place'
import { getApiErrorMessage } from '@/shared/api/client'
import { recommendPlacesAlongRoute } from '../api/ai-trip-api'
import { savePendingAiTripAction } from '../lib/pending-ai-trip-action'
import { AiBrandMark } from './ai-brand-mark'

type Props = {
    tripId: number
    days: ItineraryDay[]
    selectedDayId: number | null
    onOpenTrip: () => void
}

const categories = PLACE_SEARCH_CATEGORIES.filter(
    (category) => category.key !== 'all',
)

export function AiDashboardActions({
    tripId,
    days,
    selectedDayId,
    onOpenTrip,
}: Props) {
    const [mode, setMode] = useState<'place' | 'replan' | null>(null)
    const [category, setCategory] = useState(categories[0].key)
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fallbackDayId = days[0] ? Number(days[0].id) : null
    const targetDayId = selectedDayId ?? fallbackDayId

    async function submitPlaceRecommendation() {
        if (!targetDayId) {
            setError('추천 기준이 될 여행 일정이 없습니다.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const recommendations = await recommendPlacesAlongRoute(tripId, {
                dayId: targetDayId,
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

    function submitReplan() {
        if (!prompt.trim()) {
            setError('일정을 바꾸려는 이유를 입력해 주세요.')
            return
        }
        setError('AI 일정 재배치 결과 화면은 별도로 준비 중입니다.')
    }

    return (
        <>
            <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setMode('place')
                        setPrompt('')
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
                        setPrompt('')
                        setError(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800"
                >
                    <RouteIcon size={15} />
                    AI 일정 재배치
                </button>
            </div>

            {mode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[5px]">
                    <section className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
                        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
                        <header className="relative flex items-start justify-between gap-4 bg-gradient-to-br from-[#fff8fa] via-white to-[#fff1f4] px-6 pb-5 pt-6">
                            <div className="flex min-w-0 items-start gap-4">
                                <AiBrandMark />
                                <div className="pt-1">
                                    <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-brand shadow-sm">
                                        PLAMINGO AI
                                    </span>
                                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                                        {mode === 'place'
                                            ? '동선 사이 장소 추천'
                                            : '현재 이후 일정 재배치'}
                                    </h2>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        {mode === 'place'
                                            ? '선택한 Day의 기존 동선에서 크게 벗어나지 않는 실제 장소만 추천해요.'
                                            : '이미 지난 일정은 그대로 두고 앞으로 남은 일정만 다시 배치해요.'}
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

                        <div className="relative px-6 pb-6 pt-5">
                            {mode === 'place' && (
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
                            )}

                            <label className="mt-5 block text-xs font-extrabold text-slate-600">
                                {mode === 'place'
                                    ? '원하는 분위기나 취향'
                                    : '재배치가 필요한 이유'}
                                <textarea
                                    value={prompt}
                                    onChange={(event) =>
                                        setPrompt(event.target.value)
                                    }
                                    maxLength={500}
                                    rows={4}
                                    placeholder={
                                        mode === 'place'
                                            ? '예: 진한 돈코츠 라멘을 좋아하고 너무 비싸지 않았으면 좋겠어'
                                            : '예: 비가 와서 야외 장소는 내일로 옮기고 실내 위주로 바꿔줘'
                                    }
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
                                disabled={loading}
                                onClick={() =>
                                    mode === 'place'
                                        ? void submitPlaceRecommendation()
                                        : submitReplan()
                                }
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
                                    : mode === 'place'
                                      ? '장소 추천 받기'
                                      : '재배치안 확인하기'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </>
    )
}
