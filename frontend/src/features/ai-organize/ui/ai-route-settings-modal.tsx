'use client'

import { useMemo, useState } from 'react'
import {
    AlertCircleIcon,
    AlertTriangleIcon,
    MapPinIcon,
    PlusIcon,
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

type RoutePlanScope = 'ALL_DAYS' | 'SINGLE_DAY'

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

function getRoutablePlaceCount(day: ItineraryDay): number {
    return new Set(
        day.items
            .filter(
                (item) =>
                    item.tripPlaceId != null &&
                    Number.isFinite(item.lat) &&
                    Number.isFinite(item.lng) &&
                    !(item.lat === 0 && item.lng === 0) &&
                    Number(item.tripPlaceId) !== day.departure?.tripPlaceId,
            )
            .map((item) => item.tripPlaceId),
    ).size
}

function isRoutablePlace(place: Place): boolean {
    return (
        Number.isFinite(place.lat) &&
        Number.isFinite(place.lng) &&
        !(place.lat === 0 && place.lng === 0)
    )
}

/** 어느 Day에도 배치되지 않은, 새로 채워넣을 수 있는 저장 장소 수 */
function getUnscheduledRoutablePlaceCount(
    places: Place[],
    days: ItineraryDay[],
): number {
    const scheduledPlaceIds = new Set(
        days.flatMap((day) =>
            day.items
                .map((item) => item.tripPlaceId)
                .filter((tripPlaceId): tripPlaceId is string => tripPlaceId != null),
        ),
    )
    return places.filter(
        (place) =>
            place.status === 'saved' &&
            !scheduledPlaceIds.has(place.id) &&
            isRoutablePlace(place),
    ).length
}

export function AiRouteSettingsModal({
    places,
    days,
    onClose,
    onConfirm,
}: Props) {
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('21:00')
    const [travelPace, setTravelPace] = useState<'FAST' | 'NORMAL' | 'RELAXED'>(
        'NORMAL',
    )
    const [initialDeps] = useState(() => initDepartures(days))
    const [departures, setDepartures] = useState<Record<string, string>>(
        () => ({ ...initialDeps }),
    )
    // "전체 일정" 모드의 기본 출발지 — 예외로 지정하지 않은 모든 Day가 이 값을 따른다.
    // 'custom'(직접 지정 좌표)은 Day별로만 의미가 있어 기본값으로는 쓸 수 없으므로,
    // 그 경우엔 'none'을 기본값으로 삼고 해당 Day는 예외로 남긴다.
    const [defaultDeparture, setDefaultDeparture] = useState(() => {
        const first = initialDeps[days[0]?.id ?? ''] ?? 'none'
        return first === 'custom' ? 'none' : first
    })
    const [exceptionDayIds, setExceptionDayIds] = useState<string[]>(() => {
        const first = initialDeps[days[0]?.id ?? ''] ?? 'none'
        const baseline = first === 'custom' ? 'none' : first
        return days
            .filter((day) => (initialDeps[day.id] ?? 'none') !== baseline)
            .map((day) => day.id)
    })
    const [exceptionsOpen, setExceptionsOpen] = useState(
        () => exceptionDayIds.length > 0,
    )
    const [scope, setScope] = useState<RoutePlanScope>('ALL_DAYS')
    const unscheduledRoutablePlaceCount = useMemo(
        () => getUnscheduledRoutablePlaceCount(places, days),
        [places, days],
    )
    const eligibleDays = useMemo(
        () =>
            days.filter(
                (day) =>
                    getRoutablePlaceCount(day) + unscheduledRoutablePlaceCount >=
                    2,
            ),
        [days, unscheduledRoutablePlaceCount],
    )
    const [selectedDayId, setSelectedDayId] = useState<string | null>(
        () => eligibleDays[0]?.id ?? null,
    )
    const selectedDay = days.find((day) => day.id === selectedDayId) ?? null
    const issues = useMemo<ValidationIssue[]>(() => {
        if (scope === 'ALL_DAYS') return validateForRoutePlan(places, days)
        if (!selectedDay) {
            return [
                {
                    level: 'error',
                    code: 'NO_REPLANNABLE_DAY',
                    message:
                        '동선을 추천할 수 있는 Day가 없어요. 저장된 장소를 2개 이상 등록해주세요.',
                },
            ]
        }
        const dayOwnCount = getRoutablePlaceCount(selectedDay)
        if (dayOwnCount + unscheduledRoutablePlaceCount < 2) {
            return [
                {
                    level: 'error',
                    code: 'TOO_FEW_DAY_PLACES',
                    message: `Day ${selectedDay.dayNumber}에 배치할 장소가 부족해요. 저장된 장소를 2개 이상 등록해주세요.`,
                },
            ]
        }
        if (dayOwnCount < 2) {
            return [
                {
                    level: 'warning',
                    code: 'FILLING_EMPTY_DAY',
                    message: `Day ${selectedDay.dayNumber}에는 아직 배치된 장소가 ${dayOwnCount}개예요. 저장된 장소를 더해서 동선을 추천해드릴게요.`,
                },
            ]
        }
        return []
    }, [scope, places, days, selectedDay, unscheduledRoutablePlaceCount])
    const hasError = issues.some((issue) => issue.level === 'error')
    // Day 카드 안에서 바로 보여줄 안내라, 상단 배너에서는 빼고 그 카드 옆에 둔다.
    const fillingEmptyDayIssue = issues.find(
        (issue) => issue.code === 'FILLING_EMPTY_DAY',
    )
    const topLevelIssues = issues.filter(
        (issue) => issue.code !== 'FILLING_EMPTY_DAY',
    )
    const departureDays =
        scope === 'SINGLE_DAY' && selectedDay ? [selectedDay] : days
    const hasInvalidTimeRange =
        !isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime

    function buildDepartureOptions(day: ItineraryDay): SelectOption[] {
        if (departures[day.id] === 'custom') {
            return [
                {
                    value: 'custom',
                    label: day.departure?.name ?? '사용자 지정',
                },
            ]
        }
        return [
            { value: 'none', label: '출발지 없음' },
            ...places.map((place) => ({
                value: String(place.id),
                label: place.name,
            })),
        ]
    }

    // "전체 일정" 모드에서는 예외로 지정한 Day만 개별 값을, 나머지는 기본 출발지를 쓴다.
    function effectiveDeparture(day: ItineraryDay): string {
        if (scope === 'ALL_DAYS' && !exceptionDayIds.includes(day.id)) {
            return defaultDeparture
        }
        return departures[day.id] ?? 'none'
    }

    function addExceptionRow() {
        const usedIds = new Set(exceptionDayIds)
        const nextDay = days.find((day) => !usedIds.has(day.id))
        if (!nextDay) return
        setExceptionDayIds((prev) => [...prev, nextDay.id])
        setDepartures((prev) => ({
            ...prev,
            [nextDay.id]: prev[nextDay.id] ?? 'none',
        }))
    }

    function removeExceptionRow(dayId: string) {
        setExceptionDayIds((prev) => prev.filter((id) => id !== dayId))
    }

    function changeExceptionDay(oldDayId: string, newDayId: string) {
        setExceptionDayIds((prev) =>
            prev.map((id) => (id === oldDayId ? newDayId : id)),
        )
        setDepartures((prev) => ({
            ...prev,
            [newDayId]: prev[oldDayId] ?? 'none',
        }))
    }

    function handleConfirm() {
        const departureChanges: DepartureChange[] = departureDays
            .filter((day) => {
                const value = effectiveDeparture(day)
                return value !== initialDeps[day.id] && value !== 'custom'
            })
            .map((day) => {
                const value = effectiveDeparture(day)
                return {
                    dayId: day.id,
                    payload:
                        value === 'none'
                            ? { type: 'NONE' as const }
                            : {
                                  type: 'TRIP_PLACE' as const,
                                  tripPlaceId: Number(value),
                              },
                }
            })

        onConfirm(
            {
                dayStartTime: startTime,
                dayEndTime: endTime,
                travelPace,
                dayId:
                    scope === 'SINGLE_DAY' && selectedDay
                        ? Number(selectedDay.id)
                        : undefined,
            },
            departureChanges,
        )
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* 헤더 */}
                <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-rose-100 bg-rose-50">
                            <img
                                src="/plamingo-badge.svg"
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
                                원하는 조건을 설정하고 추천을 받아보세요
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
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <section className="border-b border-slate-100 p-3 md:px-4">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                            <p className="text-xs font-bold text-slate-700">
                                추천 범위
                            </p>
                            <p className="text-[10px] text-slate-400">
                                선택한 범위만 일정이 변경돼요
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setScope('ALL_DAYS')}
                                className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${scope === 'ALL_DAYS' ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                                전체 일정
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setScope('SINGLE_DAY')
                                    if (!selectedDayId && eligibleDays[0]) {
                                        setSelectedDayId(eligibleDays[0].id)
                                    }
                                }}
                                className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${scope === 'SINGLE_DAY' ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                                선택한 하루만
                            </button>
                        </div>
                    </section>

                    {/* 유효성 이슈 */}
                    {topLevelIssues.length > 0 && (
                        <div className="grid gap-2 p-3">
                            {topLevelIssues.map((issue) => (
                                <IssueItem key={issue.code} issue={issue} />
                            ))}
                        </div>
                    )}

                    {!hasError && (
                        <div className="grid min-h-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                            <div className="flex h-full flex-col justify-center space-y-3 bg-slate-50 p-3 md:p-4">
                                <section>
                                    <p className="mb-1.5 text-xs font-bold text-slate-700">
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
                                    <p className="mb-1.5 text-xs font-bold text-slate-700">
                                        여행 페이스
                                    </p>
                                    <div className="space-y-1">
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
                                                className={`flex w-full items-center justify-between rounded-xl border px-2.5 py-1.5 text-left text-xs font-bold transition-colors ${travelPace === p.value ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'}`}
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
                                <section className="p-3 md:p-4">
                                    {scope === 'SINGLE_DAY' ? (
                                        <div>
                                            <p className="mb-1.5 text-xs font-bold text-slate-600">
                                                추천받을 날짜
                                            </p>
                                            <div className="mp-scroll grid max-h-[420px] grid-cols-2 items-start gap-2 overflow-y-auto pr-1">
                                                {days.map((day) => {
                                                    const placeCount =
                                                        getRoutablePlaceCount(day)
                                                    const disabled =
                                                        placeCount +
                                                            unscheduledRoutablePlaceCount <
                                                        2
                                                    const isSelected =
                                                        selectedDayId === day.id
                                                    return (
                                                        <div
                                                            key={day.id}
                                                            className={`rounded-xl border transition-colors ${
                                                                disabled
                                                                    ? 'opacity-40'
                                                                    : ''
                                                            } ${isSelected ? 'border-brand bg-brand-50' : 'border-slate-200 bg-white'}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    disabled
                                                                }
                                                                onClick={() =>
                                                                    setSelectedDayId(
                                                                        day.id,
                                                                    )
                                                                }
                                                                className="w-full p-2 text-left disabled:cursor-not-allowed"
                                                            >
                                                                <span className="text-[11px] font-extrabold text-brand">
                                                                    Day{' '}
                                                                    {
                                                                        day.dayNumber
                                                                    }
                                                                </span>
                                                                <span className="ml-1.5 text-[10px] text-slate-400">
                                                                    {
                                                                        placeCount
                                                                    }
                                                                    곳
                                                                </span>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {
                                                                        day.itineraryDate
                                                                    }
                                                                </p>
                                                            </button>
                                                            <div className="border-t border-brand-100 px-2 pb-2 pt-1">
                                                                {isSelected &&
                                                                    fillingEmptyDayIssue && (
                                                                        <p className="mb-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-700">
                                                                            {
                                                                                fillingEmptyDayIssue.message
                                                                            }
                                                                        </p>
                                                                    )}
                                                                <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                                                    <MapPinIcon
                                                                        size={
                                                                            11
                                                                        }
                                                                    />
                                                                    출발지
                                                                </p>
                                                                <Select
                                                                    aria-label={`Day ${day.dayNumber} 출발지`}
                                                                    value={
                                                                        departures[
                                                                            day
                                                                                .id
                                                                        ] ??
                                                                        'none'
                                                                    }
                                                                    options={buildDepartureOptions(
                                                                        day,
                                                                    )}
                                                                    onChange={(
                                                                        val,
                                                                    ) =>
                                                                        setDepartures(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [day.id]:
                                                                                    val,
                                                                            }),
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        departures[
                                                                            day
                                                                                .id
                                                                        ] ===
                                                                        'custom'
                                                                    }
                                                                    variant="form"
                                                                    className="min-w-0"
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="mb-1.5 flex items-center gap-1.5">
                                                    <MapPinIcon
                                                        size={13}
                                                        className="text-slate-400"
                                                    />
                                                    <p className="text-xs font-bold text-slate-600">
                                                        전체 일정 기본 출발지
                                                    </p>
                                                </div>
                                                <Select
                                                    aria-label="전체 일정 기본 출발지"
                                                    value={defaultDeparture}
                                                    options={[
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
                                                    ]}
                                                    onChange={
                                                        setDefaultDeparture
                                                    }
                                                    variant="form"
                                                    className="min-w-0"
                                                />
                                                <p className="mt-1.5 text-[10px] text-slate-300">
                                                    선택한 출발지가 모든
                                                    일정에 기본으로 적용됩니다.
                                                </p>
                                            </div>

                                            <div className="border-t border-slate-100 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExceptionsOpen(
                                                            (open) => !open,
                                                        )
                                                    }
                                                    className="flex items-center gap-1 text-xs font-bold text-brand transition-colors hover:text-brand-700"
                                                >
                                                    <PlusIcon
                                                        size={13}
                                                        className={`transition-transform ${exceptionsOpen ? 'rotate-45' : ''}`}
                                                    />
                                                    특정 날짜만 출발지 다르게
                                                    설정하기
                                                </button>

                                                {exceptionsOpen && (
                                                    <div className="mt-3 space-y-2">
                                                        {exceptionDayIds.map(
                                                            (dayId) => {
                                                                const day =
                                                                    days.find(
                                                                        (
                                                                            d,
                                                                        ) =>
                                                                            d.id ===
                                                                            dayId,
                                                                    )
                                                                if (!day)
                                                                    return null
                                                                const usedIds =
                                                                    new Set(
                                                                        exceptionDayIds,
                                                                    )
                                                                const dayOptions: SelectOption[] =
                                                                    days
                                                                        .filter(
                                                                            (
                                                                                d,
                                                                            ) =>
                                                                                d.id ===
                                                                                    dayId ||
                                                                                !usedIds.has(
                                                                                    d.id,
                                                                                ),
                                                                        )
                                                                        .map(
                                                                            (
                                                                                d,
                                                                            ) => ({
                                                                                value: d.id,
                                                                                label: `Day ${d.dayNumber} · ${d.itineraryDate}`,
                                                                            }),
                                                                        )
                                                                return (
                                                                    <div
                                                                        key={
                                                                            dayId
                                                                        }
                                                                        className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-2.5"
                                                                    >
                                                                        <div className="w-32 shrink-0">
                                                                            <Select
                                                                                aria-label="예외 날짜 선택"
                                                                                value={
                                                                                    dayId
                                                                                }
                                                                                options={
                                                                                    dayOptions
                                                                                }
                                                                                onChange={(
                                                                                    newDayId,
                                                                                ) =>
                                                                                    changeExceptionDay(
                                                                                        dayId,
                                                                                        newDayId,
                                                                                    )
                                                                                }
                                                                                variant="form"
                                                                                className="min-w-0"
                                                                            />
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <Select
                                                                                aria-label={`Day ${day.dayNumber} 출발지`}
                                                                                value={
                                                                                    departures[
                                                                                        dayId
                                                                                    ] ??
                                                                                    'none'
                                                                                }
                                                                                options={buildDepartureOptions(
                                                                                    day,
                                                                                )}
                                                                                onChange={(
                                                                                    val,
                                                                                ) =>
                                                                                    setDepartures(
                                                                                        (
                                                                                            prev,
                                                                                        ) => ({
                                                                                            ...prev,
                                                                                            [dayId]:
                                                                                                val,
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    departures[
                                                                                        dayId
                                                                                    ] ===
                                                                                    'custom'
                                                                                }
                                                                                variant="form"
                                                                                className="min-w-0"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                removeExceptionRow(
                                                                                    dayId,
                                                                                )
                                                                            }
                                                                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                                                            aria-label="예외 날짜 삭제"
                                                                        >
                                                                            <XIcon
                                                                                size={
                                                                                    14
                                                                                }
                                                                            />
                                                                        </button>
                                                                    </div>
                                                                )
                                                            },
                                                        )}
                                                        {exceptionDayIds.length <
                                                            days.length && (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    addExceptionRow
                                                                }
                                                                className="flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-brand-200 px-3 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50"
                                                            >
                                                                <PlusIcon
                                                                    size={12}
                                                                />
                                                                예외 날짜 추가
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <footer className="shrink-0 border-t border-slate-200 px-4 py-3">
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
                            동선 추천받기
                        </button>
                    )}
                </footer>
            </div>
        </div>
    )
}
