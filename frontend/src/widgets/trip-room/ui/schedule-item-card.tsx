'use client'

import React, { useState } from 'react'
import { ArrowRightIcon, GripVertical, Trash2Icon } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    removeItineraryItem,
    moveItineraryItem,
    getItinerary,
    CategoryIcon,
} from '@/entities/trip'
import type { ItineraryDay, ItineraryItem } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { Button } from '@/shared/ui'
import { formatTimeRange, getNextSortOrder } from '../lib/itinerary-time'
import { useItineraryItemEditor } from '../model/use-itinerary-item-editor'
import { DayPickerMenu } from './day-picker-menu'
import { TimeRangeFields } from './time-range-fields'

type Props = {
    item: ItineraryItem
    tripId: number
    canWrite: boolean
    days: ItineraryDay[]
    currentDayId: string
    onDaysChange: (days: ItineraryDay[]) => void
}

export function ScheduleItemCard({
    item,
    tripId,
    canWrite,
    days,
    currentDayId,
    onDaysChange,
}: Props) {
    const [showMovePicker, setShowMovePicker] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const currentDay = days.find((day) => String(day.id) === currentDayId)
    const editor = useItineraryItemEditor({
        tripId,
        item,
        dayItems: currentDay?.items ?? [],
        onUpdated: onDaysChange,
    })

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })
    const style = { transform: CSS.Transform.toString(transform), transition }

    const otherDays = days.filter((d) => String(d.id) !== currentDayId)

    async function handleDelete() {
        if (!canWrite) return
        try {
            await removeItineraryItem(tripId, Number(item.id))
            const updated = await getItinerary(tripId)
            onDaysChange(updated)
        } catch (err) {
            setActionError(getApiErrorMessage(err, '삭제에 실패했습니다.'))
        }
    }

    async function handleMoveTo(targetDayId: string) {
        setShowMovePicker(false)
        const targetDay = days.find((d) => String(d.id) === targetDayId)
        if (!targetDay) return
        try {
            await moveItineraryItem(
                tripId,
                Number(item.id),
                Number(targetDayId),
                getNextSortOrder(targetDay.items),
            )
            const updated = await getItinerary(tripId)
            onDaysChange(updated)
        } catch (err) {
            setActionError(getApiErrorMessage(err, '이동에 실패했습니다.'))
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            <div className="flex items-stretch">
                {/* 카테고리 컬러 스트라이프 */}
                <div
                    className="w-1 shrink-0"
                    style={{ backgroundColor: item.categoryColor ?? '#e2e8f0' }}
                />

                <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2">
                    {/* 장소 정보와 핸들 영역 전체에서 드래그 */}
                    <div
                        {...(canWrite ? listeners : {})}
                        {...(canWrite ? attributes : {})}
                        className={`flex min-w-0 flex-1 items-center gap-1.5 ${
                            canWrite
                                ? 'cursor-grab touch-none active:cursor-grabbing'
                                : ''
                        }`}
                    >
                        {canWrite && (
                            <GripVertical
                                size={14}
                                className="shrink-0 text-slate-300"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                {item.categoryIcon && (
                                    <span
                                        className="shrink-0"
                                        style={{
                                            color:
                                                item.categoryColor ?? '#94a3b8',
                                        }}
                                    >
                                        <CategoryIcon
                                            icon={item.categoryIcon}
                                            size={11}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                )}
                                <span className="truncate text-xs font-semibold text-slate-700">
                                    {item.placeName ?? '(제목 없음)'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {formatTimeRange(item.startTime, item.endTime)}
                            </p>
                            {item.memo && (
                                <p className="truncate text-[10px] text-slate-400">
                                    {item.memo}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    {canWrite && (
                        <div className="flex shrink-0 items-center gap-0.5">
                            {/* 다른 Day로 이동 */}
                            {otherDays.length > 0 && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowMovePicker(!showMovePicker)
                                        }
                                        className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                                        title="다른 Day로 이동"
                                    >
                                        <ArrowRightIcon size={12} />
                                    </button>
                                    {showMovePicker && (
                                        <DayPickerMenu
                                            days={otherDays}
                                            align="right"
                                            widthClassName="w-36"
                                            onClose={() =>
                                                setShowMovePicker(false)
                                            }
                                            onSelect={(dayId) =>
                                                void handleMoveTo(dayId)
                                            }
                                        />
                                    )}
                                </div>
                            )}

                            {/* 편집 토글 */}
                            <button
                                type="button"
                                onClick={() =>
                                    editor.editing
                                        ? editor.cancelEditing()
                                        : editor.beginEditing()
                                }
                                className={`rounded px-1.5 py-1 text-[10px] font-medium transition ${
                                    editor.editing
                                        ? 'bg-brand-50 text-brand'
                                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                }`}
                            >
                                {editor.editing ? '닫기' : '편집'}
                            </button>

                            {/* 삭제 */}
                            <button
                                type="button"
                                onClick={() => void handleDelete()}
                                className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-400"
                            >
                                <Trash2Icon size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 편집 폼 */}
            {editor.editing && (
                <div className="border-t border-slate-100 px-3 pb-2.5 pt-2">
                    <TimeRangeFields
                        startTime={editor.startTime}
                        endTime={editor.endTime}
                        onStartTimeChange={editor.changeStartTime}
                        onEndTimeChange={editor.changeEndTime}
                    />
                    <textarea
                        value={editor.memo}
                        onChange={(e) => editor.setMemo(e.target.value)}
                        placeholder="메모 입력..."
                        rows={2}
                        className="mt-1.5 w-full resize-none rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                    {(actionError || editor.saveError) && (
                        <p className="mt-1 text-[10px] text-red-500">
                            {editor.saveError ?? actionError}
                        </p>
                    )}
                    {editor.overlapWarning && (
                        <div className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1.5">
                            <p className="text-[10px] leading-relaxed text-amber-700">
                                {editor.overlapWarning}
                            </p>
                            <button
                                type="button"
                                onClick={() => void editor.save(true)}
                                className="mt-1 text-[10px] font-bold text-amber-700 underline underline-offset-2"
                            >
                                그래도 저장
                            </button>
                        </div>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        className="mt-1.5 h-7 w-full text-xs"
                        onClick={() => void editor.save(false)}
                        disabled={editor.saving}
                    >
                        {editor.saving ? '저장 중...' : '저장'}
                    </Button>
                </div>
            )}
        </div>
    )
}
