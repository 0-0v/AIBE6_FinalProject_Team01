'use client'

import { useEffect, useRef, useState } from 'react'
import {
    ArrowDownIcon,
    LoaderCircleIcon,
    MapPinIcon,
    MapPinnedIcon,
    RotateCcwIcon,
    XIcon,
} from 'lucide-react'
import {
    applyItineraryRoutePlan,
    initializeItinerary,
    previewItineraryRoutePlan,
    updateDayDeparture,
    type ItineraryDay,
    type Place,
    type RouteOption,
    type RoutePlanPreview,
    TransportModeIcon,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { AnalysisStatusAnimation } from '@/shared/ui'
import { AiBrandMark } from '@/features/ai-trip-assistant'
import {
    AiRouteSettingsModal,
    type DepartureChange,
    type RoutePlanSettings,
} from './ai-route-settings-modal'

type Props = {
    tripId: number
    places: Place[]
    days: ItineraryDay[]
    onClose: () => void
    onApplied: (days: ItineraryDay[]) => void
}

function formatDistance(meters: number): string {
    if (meters < 1000) return `${meters}m`
    return `${(meters / 1000).toFixed(1)}km`
}

function RoutePlanView({
    plan,
    itineraryDays,
}: {
    plan: RoutePlanPreview
    itineraryDays: ItineraryDay[]
}) {
    const [selectedDayId, setSelectedDayId] = useState(
        plan.days[0]?.dayId ?? null,
    )
    const selectedDay =
        plan.days.find((day) => day.dayId === selectedDayId) ?? plan.days[0]
    const departure = itineraryDays.find(
        (day) => Number(day.id) === selectedDay?.dayId,
    )?.departure

    return (
        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="mp-scroll space-y-3 overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                    {plan.days.map((day) => (
                        <button
                            key={day.dayId}
                            type="button"
                            onClick={() => setSelectedDayId(day.dayId)}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                                selectedDay?.dayId === day.dayId
                                    ? 'border-brand bg-brand-50 text-brand'
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-xs font-extrabold">
                                Day {day.dayNumber}
                            </span>
                            <span className="text-[10px]">
                                {day.items.length}곳
                            </span>
                        </button>
                    ))}
                </div>
            </aside>

            {selectedDay && (
                <section className="mp-scroll min-w-0 overflow-y-auto rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <span className="text-sm font-extrabold text-brand">
                                Day {selectedDay.dayNumber}
                            </span>
                            <span className="ml-2 text-xs text-slate-400">
                                {selectedDay.itineraryDate}
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">
                            {formatDistance(selectedDay.totalDistanceMeters)}
                        </span>
                    </div>

                    {departure && (
                        <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-50 px-3 py-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                                <MapPinIcon size={13} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold text-brand">
                                    고정 출발지
                                </p>
                                <p className="truncate text-xs font-bold text-slate-700">
                                    {departure.name}
                                </p>
                            </div>
                        </div>
                    )}

                    {selectedDay.items.length === 0 ? (
                        <p className="rounded-lg bg-slate-50 py-6 text-center text-xs text-slate-300">
                            배치된 방문 장소가 없습니다
                        </p>
                    ) : (
                        selectedDay.items.map((item, index) => (
                            <div key={item.tripPlaceId}>
                                {(index > 0 || departure) && (
                                    <div className="flex h-5 items-center gap-1 pl-3 text-[9px] text-slate-400">
                                        <ArrowDownIcon size={10} />
                                        {index > 0 && (
                                            <>
                                                <TransportModeIcon
                                                    mode={
                                                        selectedDay.items[
                                                            index - 1
                                                        ]?.transportMode
                                                    }
                                                />
                                                {selectedDay.items[index - 1]
                                                    ?.transportMode ??
                                                    '이동'}{' '}
                                                {selectedDay.items[index - 1]
                                                    ?.transportMinutes ?? '-'}
                                                분
                                            </>
                                        )}
                                        {index === 0 && '첫 방문지로 이동'}
                                    </div>
                                )}
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="min-w-0 truncate text-xs font-bold text-slate-700">
                                            {index + 1}. {item.placeName}
                                        </p>
                                        <span className="shrink-0 text-[10px] font-bold text-slate-500">
                                            {item.startTime && item.endTime
                                                ? `${item.startTime}–${item.endTime}`
                                                : '시간 미정'}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[9px] text-slate-400">
                                        {item.reason}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </section>
            )}
        </div>
    )
}

export function AiAgentPanel({
    tripId,
    places,
    days,
    onClose,
    onApplied,
}: Props) {
    const [showSettings, setShowSettings] = useState(true)
    const [options, setOptions] = useState<RouteOption[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [applying, setApplying] = useState(false)
    const [applied, setApplied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [resolvedDays, setResolvedDays] = useState(days)
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        }
    }, [])

    const preview: RoutePlanPreview | null =
        options.length > 0 ? (options[selectedIndex]?.plan ?? null) : null

    async function analyze(
        settings?: RoutePlanSettings,
        departureChanges?: DepartureChange[],
    ) {
        setShowSettings(false)
        setLoading(true)
        setShowSuccess(false)
        setApplied(false)
        setError(null)
        try {
            if (departureChanges && departureChanges.length > 0) {
                for (const change of departureChanges) {
                    await updateDayDeparture(
                        tripId,
                        Number(change.dayId),
                        change.payload,
                    )
                }
            }
            const latestDays = await initializeItinerary(tripId, {
                force: true,
            })
            setResolvedDays(latestDays)
            const result = await previewItineraryRoutePlan(tripId, settings)
            setOptions(result)
            setSelectedIndex(0)
            setShowSuccess(true)
        } catch (requestError) {
            setError(
                getApiErrorMessage(requestError, '동선 분석에 실패했습니다.'),
            )
        } finally {
            setLoading(false)
        }
    }

    // 설정 모달 표시 중
    if (showSettings) {
        return (
            <AiRouteSettingsModal
                places={places}
                days={days}
                onClose={onClose}
                onConfirm={(settings, departures) =>
                    void analyze(settings, departures)
                }
            />
        )
    }

    async function applyPlan() {
        if (!preview) return
        setApplying(true)
        setError(null)
        try {
            const days = await applyItineraryRoutePlan(tripId, preview)
            onApplied(days)
            setApplied(true)
            closeTimerRef.current = setTimeout(onClose, 1000)
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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="flex h-[min(720px,calc(100dvh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                <header className="flex shrink-0 items-center justify-between border-b border-rose-100 bg-gradient-to-r from-[#fff8fa] to-white px-5 py-4">
                    <div className="flex items-center gap-3">
                        <AiBrandMark size="sm" />
                        <div>
                            <p className="text-sm font-extrabold">
                                스마트 동선 추천
                            </p>
                            <p className="text-[10px] text-slate-400">
                                지난 일정은 유지하고 승인 전에는 변경하지 않아요
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                        aria-label="스마트 동선 추천 닫기"
                    >
                        <XIcon size={18} />
                    </button>
                </header>

                <div className="flex min-h-0 flex-1 flex-col p-5">
                    {options.length === 0 && !loading && (
                        <div className="rounded-2xl bg-brand-50 p-4">
                            <MapPinnedIcon
                                className="mb-3 text-brand"
                                size={24}
                            />
                            <h3 className="text-sm font-extrabold text-slate-800">
                                저장 장소로 일정을 만들어 볼까요?
                            </h3>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                저장한 장소를 여행 스타일에 맞게 정렬하고 이동
                                거리를 최소화한 동선을 추천해 드려요.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                            >
                                동선 추천 받기
                            </button>
                        </div>
                    )}

                    {loading && !showSuccess && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <AnalysisStatusAnimation phase="loading" />
                            <p className="text-sm font-medium text-slate-500">
                                장소와 이동 거리를 분석하고 있어요
                            </p>
                            <p className="text-[11px] text-slate-400">
                                여행 스타일에 맞는 최적 동선을 계산 중입니다
                            </p>
                        </div>
                    )}

                    {showSuccess && !loading && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <AnalysisStatusAnimation
                                phase="complete"
                                onComplete={() => setShowSuccess(false)}
                            />
                            <p className="text-sm font-medium text-slate-500">
                                분석이 완료됐어요
                            </p>
                        </div>
                    )}

                    {options.length > 0 && !loading && !showSuccess && (
                        <div className="flex min-h-0 flex-1 flex-col gap-3">
                            {/* 경로 선택 탭 */}
                            <div className="mp-scroll flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                                {options.map((opt, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            setSelectedIndex(i)
                                            setApplied(false)
                                        }}
                                        className={`flex-1 whitespace-nowrap rounded-lg py-1.5 text-[11px] font-bold transition ${
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
                            {preview && (
                                <RoutePlanView
                                    plan={preview}
                                    itineraryDays={resolvedDays}
                                />
                            )}
                        </div>
                    )}

                    {error && (
                        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {error}
                        </p>
                    )}
                </div>

                {options.length > 0 && !loading && !showSuccess && (
                    <footer className="shrink-0 border-t border-slate-200 p-5">
                        {applied ? (
                            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-green-50 py-2.5 text-sm font-bold text-green-600">
                                <AnalysisStatusAnimation
                                    phase="complete"
                                    size={28}
                                />
                                일정에 반영했습니다
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void applyPlan()}
                                disabled={
                                    applying ||
                                    (preview?.totalPlaceCount ?? 0) === 0
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
                            onClick={() => setShowSettings(true)}
                            disabled={loading || applying}
                            className="mt-2 flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600"
                        >
                            <RotateCcwIcon size={12} />
                            다시 분석하기
                        </button>
                    </footer>
                )}
            </div>
        </div>
    )
}
