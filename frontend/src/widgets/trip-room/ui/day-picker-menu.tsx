'use client'

import type { ItineraryDay } from '@/entities/trip'

type Props = {
    days: ItineraryDay[]
    onSelect: (dayId: string) => void
    onClose: () => void
    placement?: 'top' | 'bottom'
    align?: 'left' | 'right'
    widthClassName?: string
}

export function DayPickerMenu({
    days,
    onSelect,
    onClose,
    placement = 'bottom',
    align = 'left',
    widthClassName = 'w-40',
}: Props) {
    const positionClassName =
        placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
    const alignClassName = align === 'right' ? 'right-0' : 'left-0'

    return (
        <>
            <button
                type="button"
                aria-label="Day 선택 닫기"
                className="fixed inset-0 z-40 cursor-default"
                onClick={onClose}
            />
            <div
                className={`absolute ${alignClassName} ${positionClassName} ${widthClassName} z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg`}
            >
                <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Day 선택
                </p>
                <div className="max-h-44 overflow-y-auto">
                    {days.map((day) => (
                        <button
                            key={day.id}
                            type="button"
                            onClick={() => onSelect(String(day.id))}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                        >
                            <span className="text-xs font-bold text-brand">
                                Day {day.dayNumber}
                            </span>
                            <span className="truncate text-[10px] text-slate-400">
                                {new Date(
                                    `${day.itineraryDate}T00:00:00`,
                                ).toLocaleDateString('ko-KR', {
                                    month: 'numeric',
                                    day: 'numeric',
                                })}
                            </span>
                            {day.items.length > 0 && (
                                <span className="ml-auto shrink-0 text-[10px] text-slate-300">
                                    {day.items.length}개
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}
