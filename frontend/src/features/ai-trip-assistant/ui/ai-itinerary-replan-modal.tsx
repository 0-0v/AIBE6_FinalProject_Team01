'use client'

import { useMemo, useState } from 'react'
import {
    ArrowDownIcon,
    CheckIcon,
    LoaderCircleIcon,
    RouteIcon,
    XIcon,
} from 'lucide-react'
import type {
    ItineraryDay,
    RouteOption,
    RoutePlanPreview,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import {
    applyAiItineraryReplan,
    previewAiItineraryReplan,
} from '../api/ai-trip-api'
import { AiBrandMark } from './ai-brand-mark'

type Props = {
    tripId: number
    onClose: () => void
    onApplied: (days: ItineraryDay[]) => void
}

function toLocalDateTimeValue(date: Date) {
    const offset = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatDistance(meters: number) {
    if (meters < 1000) return `${meters}m`
    return `${(meters / 1000).toFixed(1)}km`
}

function ReplanPreview({ plan }: { plan: RoutePlanPreview }) {
    return (
        <div className="space-y-3">
            <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 p-4">
                <p className="text-xs font-bold leading-5 text-rose-700">
                    {plan.summary}
                </p>
                <div className="mt-2 flex gap-2 text-[10px] font-extrabold text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">
                        재배치 장소 {plan.totalPlaceCount}곳
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1">
                        예상 이동 {formatDistance(plan.totalDistanceMeters)}
                    </span>
                </div>
            </div>
            {plan.days.map((day) => (
                <section
                    key={day.dayId}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-black text-brand">
                            Day {day.dayNumber}
                            <span className="ml-2 font-medium text-slate-400">
                                {day.itineraryDate}
                            </span>
                        </p>
                        <span className="text-[10px] font-bold text-slate-400">
                            {formatDistance(day.totalDistanceMeters)}
                        </span>
                    </div>
                    {day.items.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 py-4 text-center text-xs text-slate-400">
                            재배치할 남은 장소가 없어요
                        </p>
                    ) : (
                        day.items.map((item, index) => (
                            <div key={`${day.dayId}-${item.tripPlaceId}`}>
                                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-extrabold text-slate-800">
                                                {item.placeName}
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
                                                {item.reason}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-[10px] font-bold text-slate-500">
                                            {item.startTime && item.endTime
                                                ? `${item.startTime}–${item.endTime}`
                                                : '시간 유지'}
                                        </span>
                                    </div>
                                </div>
                                {index < day.items.length - 1 && (
                                    <div className="flex items-center gap-1 py-1.5 pl-3 text-[10px] text-slate-400">
                                        <ArrowDownIcon size={11} />
                                        {item.transportMinutes ?? 0}분 ·{' '}
                                        {formatDistance(
                                            item.transportMeters ?? 0,
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </section>
            ))}
        </div>
    )
}

export function AiItineraryReplanModal({ tripId, onClose, onApplied }: Props) {
    const isLocalTest = process.env.NODE_ENV !== 'production'
    const [testCutoffAt, setTestCutoffAt] = useState(() =>
        toLocalDateTimeValue(new Date()),
    )
    const [options, setOptions] = useState<RouteOption[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const [applying, setApplying] = useState(false)
    const [applied, setApplied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const selectedPlan = useMemo(
        () => options[selectedIndex]?.plan ?? null,
        [options, selectedIndex],
    )

    async function preview() {
        setLoading(true)
        setApplied(false)
        setError(null)
        try {
            const result = await previewAiItineraryReplan(
                tripId,
                isLocalTest ? testCutoffAt : undefined,
            )
            setOptions(result)
            setSelectedIndex(0)
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    '남은 일정 재배치안을 만들지 못했습니다.',
                ),
            )
        } finally {
            setLoading(false)
        }
    }

    async function apply() {
        if (!selectedPlan) return
        setApplying(true)
        setError(null)
        try {
            const days = await applyAiItineraryReplan(
                tripId,
                selectedPlan,
                isLocalTest ? testCutoffAt : undefined,
            )
            onApplied(days)
            setApplied(true)
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    '재배치안을 일정에 반영하지 못했습니다.',
                ),
            )
        } finally {
            setApplying(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <section className="flex max-h-[88dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
                <header className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#fff8fa] via-white to-[#fff1f4] px-6 py-5">
                    <div className="flex min-w-0 items-start gap-4">
                        <AiBrandMark />
                        <div className="pt-1">
                            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-brand shadow-sm">
                                PLAMINGO AI
                            </span>
                            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                                남은 일정 다시 배치하기
                            </h2>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                기준 시각 이전 일정은 고정하고, 남은 장소의
                                순서만 안전하게 다시 구성해요.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="AI 일정 재배치 닫기"
                        className="rounded-xl border border-white bg-white/80 p-2 text-slate-400 shadow-sm hover:text-slate-700"
                    >
                        <XIcon size={18} />
                    </button>
                </header>

                <div className="mp-scroll flex-1 overflow-y-auto px-6 py-5">
                    {options.length === 0 && !loading && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                                <RouteIcon className="text-brand" size={24} />
                                <h3 className="mt-3 text-sm font-extrabold text-slate-800">
                                    지나간 일정은 그대로 보호합니다
                                </h3>
                                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                                    장소 운영 상태와 동선, 여행 스타일 관계
                                    점수를 함께 고려해 앞으로의 일정만 제안해요.
                                </p>
                            </div>
                            {isLocalTest && (
                                <label className="block text-xs font-extrabold text-slate-600">
                                    테스트 기준 시각
                                    <input
                                        type="datetime-local"
                                        value={testCutoffAt}
                                        onChange={(event) =>
                                            setTestCutoffAt(event.target.value)
                                        }
                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                                    />
                                    <span className="mt-1.5 block text-[10px] font-medium text-amber-600">
                                        로컬 테스트에서만 보이며 배포 환경에서는
                                        실제 현재 시각을 사용합니다.
                                    </span>
                                </label>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <LoaderCircleIcon
                                className="animate-spin text-brand"
                                size={30}
                            />
                            <p className="text-sm font-bold text-slate-600">
                                남은 일정과 이동 관계를 분석하고 있어요
                            </p>
                        </div>
                    )}

                    {options.length > 0 && !loading && (
                        <div className="space-y-4">
                            <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                                {options.map((option, index) => (
                                    <button
                                        key={`${option.routeLabel}-${index}`}
                                        type="button"
                                        onClick={() => {
                                            setSelectedIndex(index)
                                            setApplied(false)
                                        }}
                                        className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                                            selectedIndex === index
                                                ? 'bg-white text-slate-800 shadow-sm'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        {option.routeLabel}
                                    </button>
                                ))}
                            </div>
                            {selectedPlan && (
                                <ReplanPreview plan={selectedPlan} />
                            )}
                        </div>
                    )}

                    {error && (
                        <p
                            role="alert"
                            className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                        >
                            {error}
                        </p>
                    )}
                </div>

                <footer className="border-t border-slate-100 p-5">
                    {applied ? (
                        <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3 text-sm font-extrabold text-emerald-600">
                            <CheckIcon size={16} /> 일정에 반영했습니다
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={loading || applying}
                            onClick={() =>
                                selectedPlan ? void apply() : void preview()
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-[#ed7188] py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(225,91,116,0.28)] disabled:opacity-50"
                        >
                            {(loading || applying) && (
                                <LoaderCircleIcon
                                    className="animate-spin"
                                    size={16}
                                />
                            )}
                            {selectedPlan
                                ? applying
                                    ? '일정에 반영 중이에요'
                                    : '선택한 재배치안 적용하기'
                                : loading
                                  ? '재배치안 생성 중이에요'
                                  : '재배치안 미리보기'}
                        </button>
                    )}
                </footer>
            </section>
        </div>
    )
}
