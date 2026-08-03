import React from 'react'
import {
    CalendarDaysIcon,
    ChevronRightIcon,
    LockIcon,
    MapPinIcon,
    UnlockIcon,
    UsersIcon,
} from 'lucide-react'
import type { Room } from '../model/types'

type Props = {
    room: Room
    onOpen: () => void
    compact?: boolean
    onToggleVisibility?: () => void
    onVisibilityUnavailable?: () => void
    visibilityBusy?: boolean
}

export function RoomCard({
    room,
    onOpen,
    compact = false,
    onToggleVisibility,
    onVisibilityUnavailable,
    visibilityBusy = false,
}: Props) {
    if (compact) {
        return (
            <article
                onClick={onOpen}
                className="group relative h-[220px] min-w-0 cursor-pointer overflow-hidden rounded-[22px] border border-white/60 bg-[#20262e] shadow-[0_8px_24px_rgba(33,60,81,0.13),0_2px_6px_rgba(33,60,81,0.08)] transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(33,60,81,0.20),0_4px_10px_rgba(33,60,81,0.08)] @min-[440px]:h-[232px] @min-[440px]:rounded-[24px]"
            >
                <div className="relative h-full overflow-hidden">
                    <img
                        src={room.cover}
                        alt={`${room.title} 여행방`}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-x-0 top-0 h-[34%] bg-gradient-to-b from-[rgba(15,29,40,0.34)] via-[rgba(15,29,40,0.12)] via-55% to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-[64%] bg-gradient-to-t from-[rgba(15,29,40,0.88)] via-[rgba(15,29,40,0.72)] via-26% to-transparent" />

                    <span
                        className={`absolute left-3 top-3 inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 py-[5px] text-[11.5px] font-bold backdrop-blur-[10px] ${getDdayBadgeClass(room.dday)}`}
                    >
                        {room.dday}
                    </span>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            if (onToggleVisibility) {
                                onToggleVisibility()
                                return
                            }
                            onVisibilityUnavailable?.()
                        }}
                        disabled={visibilityBusy}
                        className={`absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-[9px] border backdrop-blur-[10px] ${
                            room.visibility !== 'PRIVATE'
                                ? 'border-transparent bg-[#f2647c] text-white'
                                : 'border-white/30 bg-[rgba(33,60,81,0.62)] text-white/90'
                        } transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
                        aria-label={
                            room.visibility !== 'PRIVATE'
                                ? '공개 여행방'
                                : '비공개 여행방'
                        }
                        title={
                            onToggleVisibility
                                ? room.visibility !== 'PRIVATE'
                                    ? '비공개로 전환'
                                    : '공개로 전환'
                                : '여행 완료 후 공개 설정을 변경할 수 있습니다.'
                        }
                    >
                        {room.visibility !== 'PRIVATE' ? (
                            <UnlockIcon size={14} />
                        ) : (
                            <LockIcon size={14} />
                        )}
                    </button>

                    <div className="absolute inset-x-0 bottom-0 px-4 pb-[15px] pt-[46px] text-white">
                        <h2 className="truncate text-[20px] font-bold leading-[1.25] tracking-[-0.03em] [text-shadow:0_1px_8px_rgba(15,29,40,0.4)] @min-[440px]:text-[22px]">
                            {room.title}
                        </h2>
                        <div className="mt-[7px] flex min-w-0 items-center gap-[7px] overflow-hidden whitespace-nowrap text-[11px] font-medium text-white/90 [text-shadow:0_1px_6px_rgba(15,29,40,0.45)] @min-[440px]:text-[12px]">
                            <p className="flex min-w-0 items-center gap-1.5 truncate">
                                <MapPinIcon size={14} className="shrink-0" />
                                <span className="truncate">
                                    {room.location}
                                </span>
                            </p>
                            <span className="shrink-0 opacity-45">·</span>
                            <p className="flex shrink-0 items-center gap-1.5">
                                <CalendarDaysIcon size={14} />
                                {formatCompactDate(
                                    room.startDate,
                                    room.endDate,
                                )}
                            </p>
                        </div>

                        {room.travelStyleLabels &&
                            room.travelStyleLabels.length > 0 && (
                                <div className="mt-2.5 flex max-h-[26px] gap-1.5 overflow-hidden">
                                    {room.travelStyleLabels
                                        .slice(0, 2)
                                        .map((label) => (
                                            <span
                                                key={label}
                                                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[9px] border border-white/30 bg-white/20 px-2.5 py-[5px] text-[12px] font-semibold text-white backdrop-blur-[6px]"
                                            >
                                                #{label}
                                            </span>
                                        ))}
                                    {room.travelStyleLabels.length > 2 && (
                                        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[9px] border border-white/30 bg-white/20 px-2.5 py-[5px] text-[12px] font-semibold text-white backdrop-blur-[6px]">
                                            +{room.travelStyleLabels.length - 2}
                                        </span>
                                    )}
                                </div>
                            )}

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/20 pt-[11px] text-[12px] font-semibold text-white/95 @min-[440px]:text-[13px]">
                            <span className="flex items-center gap-1.5">
                                <UsersIcon size={15} />
                                {room.members > 1
                                    ? `${room.members}명`
                                    : (room.companionLabel ?? '나 혼자')}
                            </span>
                            <span className="flex items-center gap-1 whitespace-nowrap font-bold transition-transform group-hover:translate-x-0.5">
                                {room.dday === '여행 종료'
                                    ? '기록 보기'
                                    : '여행방 열기'}
                                <ChevronRightIcon size={16} />
                            </span>
                        </div>
                    </div>
                </div>
            </article>
        )
    }

    return (
        <article className="group overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(31,41,55,0.1)]">
            <div className="relative h-44 overflow-hidden">
                <img
                    src={room.cover}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-extrabold text-white">
                    {room.status}
                </span>
                <span className="absolute right-4 top-4 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-slate-900">
                    {room.dday}
                </span>
            </div>
            <div className="p-5">
                <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                        {room.title}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
                        <MapPinIcon size={13} /> {room.location}
                    </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <CalendarDaysIcon size={14} /> {room.date}
                    </span>
                    <span className="flex items-center gap-1">
                        <UsersIcon size={14} /> {room.members}명
                    </span>
                </div>
                <button
                    onClick={onOpen}
                    className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
                >
                    여행방 열기 <ChevronRightIcon size={15} />
                </button>
            </div>
        </article>
    )
}

function formatCompactDate(startDate: string | null, endDate: string | null) {
    if (!startDate || !endDate) return '날짜 미정'
    const compact = (date: string) => {
        const [, month, day] = date.split('-')
        return `${Number(month)}.${Number(day)}`
    }
    return `${compact(startDate)} – ${compact(endDate)}`
}

function getDdayBadgeClass(dday: string) {
    if (dday === '여행 종료') {
        return 'border border-white/35 bg-white/10 text-white/95 [text-shadow:0_1px_6px_rgba(15,29,40,0.45)]'
    }
    if (dday === '일정 미정') {
        return 'border border-white/40 bg-white/20 text-white [text-shadow:0_1px_6px_rgba(15,29,40,0.45)]'
    }
    if (dday === '여행 중' || dday === 'D-DAY' || dday.startsWith('D-')) {
        return 'border border-transparent bg-[#f2647c] text-white shadow-[0_2px_10px_rgba(33,60,81,0.28)]'
    }
    return 'border border-white/40 bg-white/20 text-white [text-shadow:0_1px_6px_rgba(15,29,40,0.45)]'
}
