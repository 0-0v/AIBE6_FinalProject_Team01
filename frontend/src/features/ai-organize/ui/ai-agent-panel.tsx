'use client'

import { useState } from 'react'
import {
    ArrowDownIcon,
    CheckIcon,
    LoaderCircleIcon,
    MapPinnedIcon,
    RotateCcwIcon,
    SparklesIcon,
    XIcon,
} from 'lucide-react'
import {
    applyItineraryRoutePlan,
    previewItineraryRoutePlan,
    type ItineraryDay,
    type RouteOption,
    type RoutePlanPreview,
    TransportModeIcon,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'

type Props = {
    tripId: number
    onClose: () => void
    onApplied: (days: ItineraryDay[]) => void
}

function formatDistance(meters: number): string {
    if (meters < 1000) return `${meters}m`
    return `${(meters / 1000).toFixed(1)}km`
}

function RoutePlanView({ plan }: { plan: RoutePlanPreview }) {
    return (
        <div className="space-y-3">
            <div className="rounded-xl bg-brand-50 p-3">
                <p className="text-xs font-semibold leading-relaxed text-brand-700">
                    {plan.summary}
                </p>
                <div className="mt-2 flex gap-2 text-[10px] font-bold text-slate-500">
                    <span className="rounded-full bg-white px-2 py-1">
                        장소 {plan.totalPlaceCount}곳
                    </span>
                    <span className="rounded-full bg-white px-2 py-1">
                        예상 이동 {formatDistance(plan.totalDistanceMeters)}
                    </span>
                </div>
            </div>

            {plan.days.map((day) => (
                <section
                    key={day.dayId}
                    className="rounded-xl border border-slate-200 p-3"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-extrabold text-brand">
                                Day {day.dayNumber}
                            </span>
                            <span className="ml-1.5 text-[10px] text-slate-400">
                                {day.itineraryDate}
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                            {formatDistance(day.totalDistanceMeters)}
                        </span>
                    </div>

                    {day.items.length === 0 ? (
                        <p className="rounded-lg bg-slate-50 py-3 text-center text-xs text-slate-300">
                            배치된 장소가 없습니다
                        </p>
                    ) : (
                        day.items.map((item, index) => (
                            <div key={item.tripPlaceId}>
                                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-bold text-slate-700">
                                                {item.placeName}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-slate-400">
                                                {item.reason}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-[10px] font-bold text-slate-500">
                                            {item.startTime && item.endTime
                                                ? `${item.startTime}–${item.endTime}`
                                                : '시간 미정'}
                                        </span>
                                    </div>
                                </div>
                                {index < day.items.length - 1 && (
                                    <>
                                        <div className="flex items-center gap-1 py-1 pl-3 text-[10px] text-slate-400">
                                            <ArrowDownIcon size={11} />
                                            <TransportModeIcon
                                                mode={item.transportMode}
                                            />
                                            {item.transportMode ?? '이동'}{' '}
                                            {item.transportMinutes}분 ·{' '}
                                            {formatDistance(
                                                item.transportMeters ?? 0,
                                            )}
                                        </div>
                                        {item.transportDetail && (
                                            <p className="pb-1 pl-3 text-[9px] text-slate-400">
                                                {item.transportDetail}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </section>
            ))}
        </div>
    )
}

export function AiAgentPanel({ tripId, onClose, onApplied }: Props) {
    const [options, setOptions] = useState<RouteOption[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const [applying, setApplying] = useState(false)
    const [applied, setApplied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const preview: RoutePlanPreview | null =
        options.length > 0 ? (options[selectedIndex]?.plan ?? null) : null

    async function analyze() {
        setLoading(true)
        setApplied(false)
        setError(null)
        try {
            const result = await previewItineraryRoutePlan(tripId)
            setOptions(result)
            setSelectedIndex(0)
        } catch (requestError) {
            setError(
                getApiErrorMessage(requestError, '동선 분석에 실패했습니다.'),
            )
        } finally {
            setLoading(false)
        }
    }

    async function applyPlan() {
        if (!preview) return
        setApplying(true)
        setError(null)
        try {
            const days = await applyItineraryRoutePlan(tripId, preview)
            onApplied(days)
            setApplied(true)
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    '추천 동선을 적용하지 못했습니다.',
                ),
            )
        } finally {
            setApplying(false)
        }
    }

    return (
        <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                        <SparklesIcon size={16} />
                    </span>
                    <div>
                        <p className="text-sm font-extrabold">
                            스마트 동선 추천
                        </p>
                        <p className="text-[10px] text-slate-400">
                            승인 전에는 일정을 변경하지 않아요
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    aria-label="스마트 동선 추천 패널 닫기"
                >
                    <XIcon size={18} />
                </button>
            </header>

            <div className="mp-scroll flex-1 overflow-y-auto p-4">
                {options.length === 0 && !loading && (
                    <div className="rounded-2xl bg-brand-50 p-4">
                        <MapPinnedIcon className="mb-3 text-brand" size={24} />
                        <h3 className="text-sm font-extrabold text-slate-800">
                            저장 장소로 일정을 만들어 볼까요?
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                            저장한 장소를 여행 스타일에 맞게 정렬하고
                            이동 거리를 최소화한 동선을 추천해 드려요.
                        </p>
                        <button
                            type="button"
                            onClick={() => void analyze()}
                            className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                        >
                            동선 추천 받기
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <LoaderCircleIcon
                            className="animate-spin text-brand"
                            size={28}
                        />
                        <p className="text-sm font-medium text-slate-500">
                            장소와 이동 거리를 분석하고 있어요
                        </p>
                        <p className="text-[11px] text-slate-400">
                            여행 스타일에 맞는 최적 동선을 계산 중입니다
                        </p>
                    </div>
                )}

                {options.length > 0 && !loading && (
                    <div className="space-y-3">
                        {/* 경로 선택 탭 */}
                        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto scrollbar-hide">
                            {options.map((opt, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        setSelectedIndex(i)
                                        setApplied(false)
                                    }}
                                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition whitespace-nowrap ${
                                        selectedIndex === i
                                            ? 'bg-white text-slate-800 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {opt.routeLabel}
                                </button>
                            ))}
                        </div>

                        {/* 선택된 경로 상세 */}
                        {preview && <RoutePlanView plan={preview} />}
                    </div>
                )}

                {error && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                        {error}
                    </p>
                )}
            </div>

            {options.length > 0 && !loading && (
                <footer className="border-t border-slate-200 p-4">
                    {applied ? (
                        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-green-50 py-2.5 text-sm font-bold text-green-600">
                            <CheckIcon size={15} />
                            일정에 반영했습니다
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void applyPlan()}
                            disabled={
                                applying || (preview?.totalPlaceCount ?? 0) === 0
                            }
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {applying && (
                                <LoaderCircleIcon
                                    className="animate-spin"
                                    size={15}
                                />
                            )}
                            {applying
                                ? '적용 중...'
                                : '이 동선으로 일정 만들기'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => void analyze()}
                        disabled={loading || applying}
                        className="mt-2 flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600"
                    >
                        <RotateCcwIcon size={12} />
                        다시 분석하기
                    </button>
                </footer>
            )}
        </aside>
    )
}
