'use client'

import { RotateCcwIcon } from 'lucide-react'
import { Select, type SelectOption } from '@/shared/ui'
import { formatTimeRange } from '../lib/itinerary-time'

const HOUR_OPTIONS: SelectOption[] = [
    { value: '', label: '시간' },
    ...Array.from({ length: 24 }, (_, hour) => ({
        value: String(hour).padStart(2, '0'),
        label: `${String(hour).padStart(2, '0')}시`,
    })),
]

const MINUTE_OPTIONS: SelectOption[] = [
    { value: '', label: '분' },
    ...Array.from({ length: 6 }, (_, index) => {
        const minute = String(index * 10).padStart(2, '0')
        return { value: minute, label: `${minute}분` }
    }),
]

type Props = {
    startTime: string
    endTime: string
    onStartTimeChange: (value: string) => void
    onEndTimeChange: (value: string) => void
}

function parseTime(value: string): { hour: string; minute: string } {
    const [hour = '', minute = ''] = value.split(':')
    return { hour, minute }
}

function formatTime(hour: string, minute: string): string {
    if (!hour) return ''
    return `${hour}:${minute || '00'}`
}

function getMinuteOptions(currentMinute: string): SelectOption[] {
    if (
        !currentMinute ||
        MINUTE_OPTIONS.some((option) => option.value === currentMinute)
    ) {
        return MINUTE_OPTIONS
    }
    return [
        ...MINUTE_OPTIONS,
        { value: currentMinute, label: `${currentMinute}분` },
    ].sort((a, b) => a.value.localeCompare(b.value))
}

function addOneHour(value: string): string {
    const { hour, minute } = parseTime(value)
    if (!hour) return ''
    if (Number(hour) >= 23) return '23:59'
    const nextHour = Number(hour) + 1
    return `${String(nextHour).padStart(2, '0')}:${minute || '00'}`
}

export function TimeRangeFields({
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
}: Props) {
    const start = parseTime(startTime)
    const end = parseTime(endTime)

    function changeStart(hour: string, minute: string) {
        const nextStartTime = formatTime(hour, minute)
        onStartTimeChange(nextStartTime)
        if (nextStartTime && !endTime) {
            onEndTimeChange(addOneHour(nextStartTime))
        }
    }

    return (
        <div className="space-y-1.5">
            <div className="grid grid-cols-[28px_1fr_1fr] items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-400">
                    시작
                </span>
                <Select
                    value={start.hour}
                    options={HOUR_OPTIONS}
                    onChange={(hour) => changeStart(hour, start.minute)}
                    aria-label="시작 시"
                    className="rounded-lg border border-slate-200 bg-white text-slate-700"
                    menuClassName="text-xs"
                />
                <Select
                    value={start.hour ? start.minute || '00' : ''}
                    options={getMinuteOptions(start.minute)}
                    onChange={(minute) => changeStart(start.hour, minute)}
                    aria-label="시작 분"
                    disabled={!start.hour}
                    className="rounded-lg border border-slate-200 bg-white text-slate-700"
                    menuClassName="text-xs"
                />
            </div>

            <div className="grid grid-cols-[28px_1fr_1fr] items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-400">
                    종료
                </span>
                <Select
                    value={end.hour}
                    options={HOUR_OPTIONS}
                    onChange={(hour) =>
                        onEndTimeChange(formatTime(hour, end.minute))
                    }
                    aria-label="종료 시"
                    className="rounded-lg border border-slate-200 bg-white text-slate-700"
                    menuClassName="text-xs"
                />
                <Select
                    value={end.hour ? end.minute || '00' : ''}
                    options={getMinuteOptions(end.minute)}
                    onChange={(minute) =>
                        onEndTimeChange(formatTime(end.hour, minute))
                    }
                    aria-label="종료 분"
                    disabled={!end.hour}
                    className="rounded-lg border border-slate-200 bg-white text-slate-700"
                    menuClassName="text-xs"
                />
            </div>

            <div className="flex items-center justify-between px-0.5">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    {formatTimeRange(startTime, endTime)}
                </span>
                {(startTime || endTime) && (
                    <button
                        type="button"
                        onClick={() => {
                            onStartTimeChange('')
                            onEndTimeChange('')
                        }}
                        className="flex items-center gap-0.5 text-[10px] text-slate-400 transition hover:text-slate-600"
                        aria-label="시간 초기화"
                    >
                        <RotateCcwIcon size={10} aria-hidden />
                        초기화
                    </button>
                )}
            </div>
        </div>
    )
}
