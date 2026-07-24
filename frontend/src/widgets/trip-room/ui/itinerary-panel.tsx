import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    RotateCcwIcon,
    SaveIcon,
} from 'lucide-react'
import {
    DateAvailability,
    DateProposal,
    getDateAvailability,
    getDateProposal,
    proposeDates,
    saveDateAvailability,
    voteDates,
} from '@/entities/trip'
import {
    getApiErrorMessage,
    getApiErrorStatus,
    resolveMediaUrl,
} from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import {
    addMonths,
    createCalendarDays,
    dateRange,
    formatKoreanRange,
    formatLocalDate,
    isSupportedAvailabilityDate,
    MAX_AVAILABILITY_DATES,
    parseLocalDate,
    recommendDateRanges,
    startOfMonth,
    updateDateSet,
} from '../lib/date-availability'

type Props = {
    tripId: number
    canWrite: boolean
    onDirtyChange?: (dirty: boolean) => void
    onCollaborationChanged?: () => void
}
type SelectionGesture = {
    anchor: string
    current: string
    selecting: boolean
    input: 'mouse' | 'touch'
}
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function ItineraryPanel({
    tripId,
    canWrite,
    onDirtyChange,
    onCollaborationChanged,
}: Props) {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const memberId = currentUser?.id
    const [availability, setAvailability] = useState<DateAvailability[]>([])
    const [draftDates, setDraftDates] = useState<Set<string>>(new Set())
    const [calendarMonth, setCalendarMonth] = useState(() =>
        startOfMonth(new Date()),
    )
    const [hoveredDate, setHoveredDate] = useState<string | null>(null)
    const [dirty, setDirty] = useState(false)
    const [gesture, setGesture] = useState<SelectionGesture | null>(null)
    const [touchAnchor, setTouchAnchor] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [proposal, setProposal] = useState<DateProposal | null>(null)
    const [error, setError] = useState<string | null>(null)
    const gestureRef = useRef<SelectionGesture | null>(null)
    const lastPointerType = useRef('mouse')

    useEffect(() => {
        const finishDragging = () => {
            const currentGesture = gestureRef.current
            if (!currentGesture || currentGesture.input !== 'mouse') return
            setDraftDates((current) =>
                updateDateSet(
                    current,
                    currentGesture.anchor,
                    currentGesture.current,
                    currentGesture.selecting,
                ),
            )
            setDirty(true)
            gestureRef.current = null
            setGesture(null)
        }
        const cancelDragging = () => {
            if (gestureRef.current?.input !== 'mouse') return
            gestureRef.current = null
            setGesture(null)
        }
        window.addEventListener('pointerup', finishDragging)
        window.addEventListener('pointercancel', cancelDragging)
        return () => {
            window.removeEventListener('pointerup', finishDragging)
            window.removeEventListener('pointercancel', cancelDragging)
        }
    }, [])

    useEffect(() => {
        onDirtyChange?.(dirty)
        if (!dirty) return

        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
        }
        const warnBeforeLinkNavigation = (event: MouseEvent) => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return
            }
            const target = event.target
            if (!(target instanceof Element)) return
            const link = target.closest<HTMLAnchorElement>('a[href]')
            if (!link) return
            const destination = new URL(link.href, window.location.href)
            const current = new URL(window.location.href)
            if (
                destination.pathname === current.pathname &&
                destination.search === current.search &&
                destination.hash === current.hash
            ) {
                return
            }
            if (
                !window.confirm(
                    '저장하지 않은 가능 날짜가 있습니다. 이동하시겠습니까?',
                )
            ) {
                event.preventDefault()
                event.stopPropagation()
            }
        }
        window.addEventListener('beforeunload', warnBeforeUnload)
        document.addEventListener('click', warnBeforeLinkNavigation, true)
        return () => {
            window.removeEventListener('beforeunload', warnBeforeUnload)
            document.removeEventListener(
                'click',
                warnBeforeLinkNavigation,
                true,
            )
        }
    }, [dirty, onDirtyChange])

    useEffect(
        () => () => {
            onDirtyChange?.(false)
        },
        [onDirtyChange],
    )

    useEffect(() => {
        let active = true
        Promise.allSettled([
            getDateAvailability(tripId),
            getDateProposal(tripId),
        ]).then(([availabilityResult, proposalResult]) => {
            if (!active) return
            if (availabilityResult.status === 'fulfilled') {
                setAvailability(availabilityResult.value)
                const mine = availabilityResult.value.find(
                    (item) => item.memberId === memberId,
                )
                setDraftDates(new Set(mine?.availableDates ?? []))
                setDirty(false)
            } else {
                setError(
                    getApiErrorMessage(
                        availabilityResult.reason,
                        '가능 날짜를 불러오지 못했습니다.',
                    ),
                )
            }
            if (proposalResult.status === 'fulfilled') {
                const nextProposal = proposalResult.value
                setProposal(nextProposal)
                setStartDate(nextProposal.startDate)
                setEndDate(nextProposal.endDate)
                setCalendarMonth(
                    startOfMonth(parseLocalDate(nextProposal.startDate)),
                )
            } else if (getApiErrorStatus(proposalResult.reason) !== 404) {
                setError(
                    getApiErrorMessage(
                        proposalResult.reason,
                        '여행 기간 제안을 불러오지 못했습니다.',
                    ),
                )
            }
        })
        return () => {
            active = false
        }
    }, [memberId, tripId])

    const members = useMemo(() => {
        if (
            memberId == null ||
            availability.some((item) => item.memberId === memberId)
        ) {
            return availability
        }
        return [
            ...availability,
            {
                memberId,
                nickname: currentUser?.nickname ?? '나',
                profileImageUrl: currentUser?.profileImageUrl ?? null,
                availableDates: [],
            },
        ]
    }, [
        availability,
        currentUser?.nickname,
        currentUser?.profileImageUrl,
        memberId,
    ])

    const availabilityByDate = useMemo(() => {
        const result = new Map<string, DateAvailability[]>()
        members.forEach((member) => {
            const dates =
                member.memberId === memberId
                    ? Array.from(draftDates)
                    : member.availableDates
            dates.forEach((date) => {
                const current = result.get(date) ?? []
                current.push(member)
                result.set(date, current)
            })
        })
        return result
    }, [draftDates, memberId, members])

    const calendarDays = useMemo(
        () => createCalendarDays(calendarMonth),
        [calendarMonth],
    )
    const hoveredMembers = hoveredDate
        ? (availabilityByDate.get(hoveredDate) ?? [])
        : []
    const previewDates = useMemo(
        () =>
            gesture
                ? new Set(dateRange(gesture.anchor, gesture.current))
                : new Set<string>(),
        [gesture],
    )
    const recommendations = useMemo(
        () => recommendDateRanges(availabilityByDate, members.length),
        [availabilityByDate, members.length],
    )
    const selectionIsCurrentProposal =
        proposal?.startDate === startDate && proposal?.endDate === endDate

    function applyDraftRange(
        rangeStart: string,
        rangeEnd: string,
        selecting: boolean,
    ) {
        if (!canWrite) return
        setDraftDates((current) =>
            updateDateSet(current, rangeStart, rangeEnd, selecting),
        )
        setDirty(true)
    }

    function startDragging(event: React.PointerEvent, date: string) {
        if (!canWrite || event.button !== 0) return
        lastPointerType.current = event.pointerType
        if (event.pointerType === 'touch') return
        event.preventDefault()

        const selecting = !draftDates.has(date)
        const nextGesture: SelectionGesture = {
            anchor: date,
            current: date,
            selecting,
            input: 'mouse',
        }
        gestureRef.current = nextGesture
        setGesture(nextGesture)
    }

    function selectWithTouch(date: string) {
        if (!canWrite) return
        if (touchAnchor == null) {
            const nextGesture: SelectionGesture = {
                anchor: date,
                current: date,
                selecting: !draftDates.has(date),
                input: 'touch',
            }
            setTouchAnchor(date)
            setGesture(nextGesture)
            gestureRef.current = nextGesture
            return
        }
        applyDraftRange(touchAnchor, date, !draftDates.has(touchAnchor))
        cancelGesture()
    }

    function cancelGesture() {
        setTouchAnchor(null)
        setGesture(null)
        gestureRef.current = null
    }

    function continueDragging(date: string) {
        const currentGesture = gestureRef.current
        if (!currentGesture || currentGesture.input !== 'mouse') return
        const nextGesture = { ...currentGesture, current: date }
        gestureRef.current = nextGesture
        setGesture(nextGesture)
    }

    async function saveDraft() {
        if (draftDates.size > MAX_AVAILABILITY_DATES) {
            setError(
                `가능 날짜는 최대 ${MAX_AVAILABILITY_DATES}개까지 선택할 수 있습니다.`,
            )
            return
        }
        setSaving(true)
        setError(null)
        try {
            const result = await saveDateAvailability(
                tripId,
                Array.from(draftDates).sort(),
            )
            setAvailability(result)
            const mine = result.find((item) => item.memberId === memberId)
            setDraftDates(new Set(mine?.availableDates ?? []))
            setDirty(false)
            onCollaborationChanged?.()
        } catch (cause) {
            setError(
                getApiErrorMessage(cause, '가능 날짜 저장에 실패했습니다.'),
            )
        } finally {
            setSaving(false)
        }
    }

    function resetDraft() {
        const mine = availability.find((item) => item.memberId === memberId)
        setDraftDates(new Set(mine?.availableDates ?? []))
        setDirty(false)
        setTouchAnchor(null)
        setGesture(null)
        gestureRef.current = null
    }

    return (
        <div className="mp-scroll flex-1 space-y-4 overflow-y-auto p-4">
            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-2 text-xs text-red-600"
                >
                    {error}
                </p>
            )}

            <section className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-extrabold">
                            멤버 가능 날짜
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-400">
                            PC는 드래그, 모바일은 시작일과 종료일을 차례로
                            선택하세요.
                        </p>
                    </div>
                    <div className="flex -space-x-1.5">
                        {members.slice(0, 5).map((member) => (
                            <span
                                key={member.memberId}
                                title={member.nickname}
                                className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-brand-100 text-[10px] font-extrabold text-brand-700"
                            >
                                {member.profileImageUrl ? (
                                    <img
                                        src={
                                            resolveMediaUrl(
                                                member.profileImageUrl,
                                            ) ?? undefined
                                        }
                                        alt={member.nickname}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    member.nickname.slice(0, 1)
                                )}
                            </span>
                        ))}
                        {members.length > 5 && (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-500">
                                +{members.length - 5}
                            </span>
                        )}
                    </div>
                </div>

                {(gesture || touchAnchor) && (
                    <div
                        role="status"
                        className={`mt-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11px] font-bold ${
                            gesture?.selecting
                                ? 'bg-brand-50 text-brand-700'
                                : 'bg-amber-50 text-amber-700'
                        }`}
                    >
                        <span>
                            {gesture?.selecting ? '선택 중' : '해제 중'} ·{' '}
                            {gesture?.anchor}
                            {gesture?.current !== gesture?.anchor
                                ? ` ~ ${gesture?.current}`
                                : ''}
                            {gesture?.input === 'touch' &&
                                ' · 종료 날짜를 한 번 더 누르세요'}
                        </span>
                        {gesture?.input === 'touch' && (
                            <button
                                type="button"
                                onClick={cancelGesture}
                                className="shrink-0 rounded-md bg-white/70 px-2 py-1"
                            >
                                취소
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() =>
                            setCalendarMonth((current) =>
                                addMonths(current, -1),
                            )
                        }
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        aria-label="이전 달"
                    >
                        <ChevronLeftIcon size={17} />
                    </button>
                    <b className="text-sm">
                        {calendarMonth.getFullYear()}년{' '}
                        {calendarMonth.getMonth() + 1}월
                    </b>
                    <button
                        type="button"
                        onClick={() =>
                            setCalendarMonth((current) => addMonths(current, 1))
                        }
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        aria-label="다음 달"
                    >
                        <ChevronRightIcon size={17} />
                    </button>
                </div>

                <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                    {WEEKDAYS.map((weekday, index) => (
                        <span
                            key={weekday}
                            className={
                                index === 0
                                    ? 'text-red-400'
                                    : index === 6
                                      ? 'text-blue-400'
                                      : undefined
                            }
                        >
                            {weekday}
                        </span>
                    ))}
                </div>

                <div
                    className="mt-1 grid select-none grid-cols-7 gap-1"
                    style={{ touchAction: 'pan-y' }}
                    onPointerLeave={() => setHoveredDate(null)}
                >
                    {calendarDays.map((date) => {
                        const dateKey = formatLocalDate(date)
                        const availableMembers =
                            availabilityByDate.get(dateKey) ?? []
                        const ratio =
                            members.length === 0
                                ? 0
                                : availableMembers.length / members.length
                        const mine = draftDates.has(dateKey)
                        const previewing = previewDates.has(dateKey)
                        const supported = isSupportedAvailabilityDate(dateKey)
                        const currentMonth =
                            date.getMonth() === calendarMonth.getMonth()
                        const alpha = ratio === 0 ? 0 : 0.14 + ratio * 0.72
                        return (
                            <button
                                key={dateKey}
                                type="button"
                                disabled={!canWrite || !supported}
                                onPointerDown={(event) =>
                                    startDragging(event, dateKey)
                                }
                                onPointerEnter={() => {
                                    setHoveredDate(dateKey)
                                    continueDragging(dateKey)
                                }}
                                onFocus={() => setHoveredDate(dateKey)}
                                onClick={(event) => {
                                    if (lastPointerType.current === 'touch') {
                                        selectWithTouch(dateKey)
                                    } else if (event.detail === 0) {
                                        applyDraftRange(
                                            dateKey,
                                            dateKey,
                                            !draftDates.has(dateKey),
                                        )
                                    }
                                    event.preventDefault()
                                }}
                                title={`${dateKey} · ${availableMembers.length}/${members.length}명 가능`}
                                aria-label={`${dateKey}, ${availableMembers.length}명 가능${mine ? ', 내가 선택함' : ''}`}
                                className={`relative aspect-square rounded-lg text-xs font-bold transition ${
                                    currentMonth
                                        ? 'text-slate-700'
                                        : 'text-slate-300'
                                } ${mine ? 'ring-2 ring-brand ring-offset-1' : ''} ${
                                    previewing
                                        ? gesture?.selecting
                                            ? 'outline outline-2 outline-brand'
                                            : 'outline outline-2 outline-amber-500'
                                        : ''
                                } disabled:cursor-default`}
                                style={{
                                    backgroundColor:
                                        previewing && gesture?.selecting
                                            ? 'rgba(231, 101, 122, 0.42)'
                                            : previewing
                                              ? 'rgba(251, 191, 36, 0.28)'
                                              : ratio > 0
                                                ? `rgba(231, 101, 122, ${alpha})`
                                                : 'rgb(248 250 252)',
                                    color: ratio >= 0.65 ? 'white' : undefined,
                                }}
                            >
                                {date.getDate()}
                                {availableMembers.length > 0 && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] opacity-80">
                                        {availableMembers.length}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div className="mt-3 min-h-12 rounded-lg bg-slate-50 px-3 py-2">
                    {hoveredDate ? (
                        <>
                            <p className="text-[10px] font-bold text-slate-500">
                                {hoveredDate} · {hoveredMembers.length}/
                                {members.length}명 가능
                            </p>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                                {hoveredMembers.length > 0
                                    ? hoveredMembers
                                          .map((member) =>
                                              member.memberId === memberId
                                                  ? `${member.nickname}(나)`
                                                  : member.nickname,
                                          )
                                          .join(', ')
                                    : '가능한 멤버가 아직 없어요.'}
                            </p>
                        </>
                    ) : (
                        <p className="pt-2 text-center text-[11px] text-slate-400">
                            날짜에 마우스를 올리면 가능한 멤버가 표시됩니다.
                        </p>
                    )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">적음</span>
                    {[0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
                        <span
                            key={ratio}
                            className="h-3 flex-1 rounded-sm"
                            style={{
                                backgroundColor: `rgba(231, 101, 122, ${0.14 + ratio * 0.72})`,
                            }}
                        />
                    ))}
                    <span className="text-[10px] text-slate-400">전원</span>
                </div>

                <div className="mt-3 flex gap-2">
                    <button
                        type="button"
                        disabled={!dirty || saving}
                        onClick={resetDraft}
                        className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 disabled:opacity-40"
                    >
                        <RotateCcwIcon size={13} /> 되돌리기
                    </button>
                    <button
                        type="button"
                        disabled={!canWrite || !dirty || saving}
                        onClick={() => void saveDraft()}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                        <SaveIcon size={13} />
                        {saving
                            ? '저장 중...'
                            : `내 가능 날짜 ${draftDates.size}개 저장`}
                    </button>
                </div>
            </section>

            <section className="rounded-xl border border-slate-100 p-3">
                <h3 className="text-sm font-extrabold">여행 기간 제안</h3>
                <p className="mt-1 text-[11px] text-slate-400">
                    히트맵을 참고해 모두가 가능한 여행 기간을 제안하세요.
                </p>
                <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-extrabold text-slate-600">
                        겹치는 날짜 추천
                    </p>
                    {recommendations.length > 0 ? (
                        recommendations.map((recommendation) => (
                            <button
                                key={`${recommendation.startDate}-${recommendation.endDate}`}
                                type="button"
                                onClick={() => {
                                    setStartDate(recommendation.startDate)
                                    setEndDate(recommendation.endDate)
                                    setCalendarMonth(
                                        startOfMonth(
                                            parseLocalDate(
                                                recommendation.startDate,
                                            ),
                                        ),
                                    )
                                }}
                                aria-pressed={
                                    startDate === recommendation.startDate &&
                                    endDate === recommendation.endDate
                                }
                                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] ${
                                    startDate === recommendation.startDate &&
                                    endDate === recommendation.endDate
                                        ? 'border-brand bg-brand text-white'
                                        : 'border-brand-100 bg-brand-50 hover:border-brand-300'
                                }`}
                            >
                                <span
                                    className={`font-bold ${
                                        startDate ===
                                            recommendation.startDate &&
                                        endDate === recommendation.endDate
                                            ? 'text-white'
                                            : 'text-brand-700'
                                    }`}
                                >
                                    {recommendation.availableCount ===
                                    members.length
                                        ? '전원 가능'
                                        : `${recommendation.availableCount}/${members.length}명 가능`}
                                </span>
                                <span
                                    className={
                                        startDate ===
                                            recommendation.startDate &&
                                        endDate === recommendation.endDate
                                            ? 'text-white/90'
                                            : 'text-slate-600'
                                    }
                                >
                                    {formatKoreanRange(
                                        recommendation.startDate,
                                        recommendation.endDate,
                                    )}
                                </span>
                            </button>
                        ))
                    ) : (
                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
                            멤버들의 가능 날짜가 아직 충분하지 않아 추천 기간이
                            없습니다.
                        </p>
                    )}
                </div>
                {startDate && endDate && !selectionIsCurrentProposal && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-700">
                        선택한 기간 · {formatKoreanRange(startDate, endDate)}
                    </p>
                )}
                <button
                    disabled={
                        !canWrite ||
                        !startDate ||
                        !endDate ||
                        selectionIsCurrentProposal ||
                        proposal?.status === 'CONFIRMED'
                    }
                    onClick={async () => {
                        setError(null)
                        try {
                            const nextProposal = await proposeDates(
                                tripId,
                                startDate,
                                endDate,
                            )
                            setProposal(nextProposal)
                            onCollaborationChanged?.()
                        } catch (cause) {
                            setError(
                                getApiErrorMessage(
                                    cause,
                                    '날짜 제안에 실패했습니다.',
                                ),
                            )
                        }
                    }}
                    className="mt-2 w-full rounded-lg bg-slate-900 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                    {proposal?.status === 'CONFIRMED'
                        ? '여행 기간 확정됨'
                        : selectionIsCurrentProposal
                          ? '현재 제안된 기간'
                          : '이 기간 제안하기'}
                </button>
                {proposal && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs">
                        <b>
                            {proposal.startDate} ~ {proposal.endDate}
                        </b>
                        <p className="mt-1 text-slate-500">
                            찬성 {proposal.agreeCount} · 반대{' '}
                            {proposal.disagreeCount} · 확정 기준{' '}
                            {proposal.requiredCount}명
                        </p>
                        {proposal.status === 'OPEN' ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {(['AGREE', 'DISAGREE'] as const).map(
                                    (choice) => (
                                        <button
                                            key={choice}
                                            disabled={!canWrite}
                                            onClick={async () => {
                                                setError(null)
                                                try {
                                                    const nextProposal =
                                                        await voteDates(
                                                            tripId,
                                                            choice,
                                                        )
                                                    setProposal(nextProposal)
                                                    onCollaborationChanged?.()
                                                } catch (cause) {
                                                    setError(
                                                        getApiErrorMessage(
                                                            cause,
                                                            '날짜 투표에 실패했습니다.',
                                                        ),
                                                    )
                                                }
                                            }}
                                            className={`rounded-lg border bg-white py-1.5 font-bold ${
                                                proposal.myChoice === choice
                                                    ? 'border-brand text-brand-700'
                                                    : ''
                                            }`}
                                        >
                                            {choice === 'AGREE'
                                                ? '찬성'
                                                : '반대'}
                                        </button>
                                    ),
                                )}
                            </div>
                        ) : (
                            <p className="mt-2 font-bold text-brand-700">
                                여행 기간 확정
                            </p>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}
