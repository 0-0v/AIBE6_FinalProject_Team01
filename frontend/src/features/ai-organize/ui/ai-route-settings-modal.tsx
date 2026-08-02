'use client'

import { useMemo, useState } from 'react'
import {
    AlertCircleIcon,
    AlertTriangleIcon,
    MapPinIcon,
    SparklesIcon,
    XIcon,
} from 'lucide-react'
import type { ItineraryDay, Place, RoutePlanSettings } from '@/entities/trip'
import { Select, TimePicker, type SelectOption } from '@/shared/ui'
import {
    validateForRoutePlan,
    type ValidationIssue,
} from '../model/route-validation'

export type { RoutePlanSettings }

export type DepartureChange = {
    dayId: string
    payload: { type: 'NONE' } | { type: 'TRIP_PLACE'; tripPlaceId: number }
}

type Props = {
    places: Place[]
    days: ItineraryDay[]
    onClose: () => void
    onConfirm: (
        settings: RoutePlanSettings,
        departures: DepartureChange[],
    ) => void
}

function IssueItem({ issue }: { issue: ValidationIssue }) {
    const isError = issue.level === 'error'
    return (
        <div
            className={`flex gap-2 rounded-xl p-3 text-xs ${
                isError
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700'
            }`}
        >
            {isError ? (
                <AlertCircleIcon size={14} className="mt-0.5 shrink-0" />
            ) : (
                <AlertTriangleIcon size={14} className="mt-0.5 shrink-0" />
            )}
            <div>
                <p className="font-semibold">{issue.message}</p>
                {issue.placeNames && issue.placeNames.length > 0 && (
                    <p className="mt-0.5 font-normal opacity-80">
                        {issue.placeNames.join(', ')}
                    </p>
                )}
            </div>
        </div>
    )
}

function initDepartures(days: ItineraryDay[]): Record<string, string> {
    return Object.fromEntries(
        days.map((day) => {
            const dep = day.departure
            if (dep?.type === 'TRIP_PLACE' && dep.tripPlaceId != null) {
                return [day.id, String(dep.tripPlaceId)]
            }
            if (dep?.type === 'CUSTOM') {
                return [day.id, 'custom']
            }
            return [day.id, 'none']
        }),
    )
}

function isValidTime(value: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function AiRouteSettingsModal({
    places,
    days,
    onClose,
    onConfirm,
}: Props) {
    const issues = useMemo(
        () => validateForRoutePlan(places, days),
        [places, days],
    )
    const hasError = issues.some((i) => i.level === 'error')

    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('21:00')
    const [travelPace, setTravelPace] = useState<'FAST' | 'NORMAL' | 'RELAXED'>(
        'NORMAL',
    )
    const [initialDeps] = useState(() => initDepartures(days))
    const [departures, setDepartures] = useState<Record<string, string>>(
        () => ({ ...initialDeps }),
    )
    const hasInvalidTimeRange =
        !isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime

    function handleConfirm() {
        const departureChanges: DepartureChange[] = days
            .filter(
                (day) =>
                    departures[day.id] !== initialDeps[day.id] &&
                    departures[day.id] !== 'custom',
            )
            .map((day) => ({
                dayId: day.id,
                payload:
                    departures[day.id] === 'none'
                        ? { type: 'NONE' as const }
                        : {
                              type: 'TRIP_PLACE' as const,
                              tripPlaceId: Number(departures[day.id]),
                          },
            }))

        onConfirm(
            { dayStartTime: startTime, dayEndTime: endTime, travelPace },
            departureChanges,
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* 헤더 */}
                <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-rose-100 bg-rose-50">
                            <img
                                src="/favicon.png"
                                alt=""
                                aria-hidden="true"
                                className="h-7 w-7 object-contain"
                            />
                        </span>
                        <div>
                            <p className="text-sm font-extrabold">
                                동선 추천 설정
                            </p>
                            <p className="text-[10px] text-slate-400">
                                원하는 조건을 설정하고 분석을 시작하세요
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                        aria-label="닫기"
                    >
                        <XIcon size={18} />
                    </button>
                </header>

                {/* 본문 */}
                <div className="min-h-0 flex-1">
                    {/* 유효성 이슈 */}
                    {issues.length > 0 && (
                        <div className="grid gap-2 p-4 md:grid-cols-2">
                            {issues.map((issue) => (
                                <IssueItem key={issue.code} issue={issue} />
                            ))}
                        </div>
                    )}

                    {!hasError && (
                        <div className="grid min-h-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                            <div className="space-y-4 bg-slate-50 p-4 md:p-5">
                                <section>
                                    <p className="mb-2 text-xs font-bold text-slate-700">
                                        하루 일정 시간
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                시작
                                            </span>
                                            <TimePicker
                                                value={startTime}
                                                onChange={setStartTime}
                                            />
                                        </div>
                                        <span className="mt-4 text-xs text-slate-300">
                                            ~
                                        </span>
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                종료
                                            </span>
                                            <TimePicker
                                                value={endTime}
                                                onChange={setEndTime}
                                            />
                                        </div>
                                    </div>
                                    {hasInvalidTimeRange && (
                                        <p className="mt-1.5 text-[10px] font-semibold text-red-500">
                                            종료 시간은 시작 시간보다 늦게
                                            설정해주세요.
                                        </p>
                                    )}
                                </section>

                                <section>
                                    <p className="mb-2 text-xs font-bold text-slate-700">
                                        여행 페이스
                                    </p>
                                    <div className="space-y-1.5">
                                        {(
                                            [
                                                {
                                                    value: 'FAST',
                                                    label: '빠르게',
                                                    desc: '일정을 빽빽하게 채워요',
                                                },
                                                {
                                                    value: 'NORMAL',
                                                    label: '보통',
                                                    desc: '무난한 속도로 즐겨요',
                                                },
                                                {
                                                    value: 'RELAXED',
                                                    label: '여유롭게',
                                                    desc: '여유롭게 충분히 머물러요',
                                                },
                                            ] as const
                                        ).map((p) => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() =>
                                                    setTravelPace(p.value)
                                                }
                                                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${travelPace === p.value ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                                            >
                                                <div>{p.label}</div>
                                                <div
                                                    className={`text-[10px] font-normal ${travelPace === p.value ? 'text-white/80' : 'text-slate-400'}`}
                                                >
                                                    {p.desc}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {days.length > 0 && (
                                <section className="p-4 md:p-5">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <MapPinIcon
                                                size={13}
                                                className="text-slate-400"
                                            />
                                            <p className="text-xs font-bold text-slate-600">
                                                날짜별 출발지
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            첫 이동의 기준점이에요
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {days.map((day) => {
                                            const isCustom =
                                                departures[day.id] === 'custom'
                                            const options: SelectOption[] =
                                                isCustom
                                                    ? [
                                                          {
                                                              value: 'custom',
                                                              label:
                                                                  day.departure
                                                                      ?.name ??
                                                                  '사용자 지정',
                                                          },
                                                      ]
                                                    : [
                                                          {
                                                              value: 'none',
                                                              label: '출발지 없음',
                                                          },
                                                          ...places.map(
                                                              (place) => ({
                                                                  value: String(
                                                                      place.id,
                                                                  ),
                                                                  label: place.name,
                                                              }),
                                                          ),
                                                      ]
                                            return (
                                                <div
                                                    key={day.id}
                                                    className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-2.5"
                                                >
                                                    <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                                                        <span className="text-[11px] font-extrabold text-brand">
                                                            Day {day.dayNumber}
                                                        </span>
                                                        <span className="truncate text-[10px] text-slate-400">
                                                            {day.itineraryDate}
                                                        </span>
                                                    </div>
                                                    <Select
                                                        aria-label={`Day ${day.dayNumber} 출발지`}
                                                        value={
                                                            departures[
                                                                day.id
                                                            ] ?? 'none'
                                                        }
                                                        options={options}
                                                        onChange={(val) =>
                                                            setDepartures(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [day.id]:
                                                                        val,
                                                                }),
                                                            )
                                                        }
                                                        disabled={isCustom}
                                                        variant="form"
                                                        className="min-w-0"
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <footer className="shrink-0 border-t border-slate-200 px-5 py-3.5">
                    {hasError ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex w-full items-center justify-center rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200"
                        >
                            확인
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={hasInvalidTimeRange}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                        >
                            <SparklesIcon size={15} />
                            분석 시작
                        </button>
                    )}
                </footer>
            </div>
        </div>
    )
}
