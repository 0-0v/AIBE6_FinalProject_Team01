'use client'

import React, { useEffect, useRef, useState } from 'react'
import { GripVertical, Trash2Icon } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    removeItineraryItem,
    getItinerary,
    CategoryIcon,
} from '@/entities/trip'
import type { ItineraryDay, ItineraryItem } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { Button } from '@/shared/ui'
import { useTripAwarenessStore } from '@/features/trip-awareness'
import { formatTimeRange } from '../lib/itinerary-time'
import { useItineraryItemEditor } from '../model/use-itinerary-item-editor'
import { TimeRangeFields } from './time-range-fields'

type Props = {
    item: ItineraryItem
    tripId: number
    canWrite: boolean
    days: ItineraryDay[]
    currentDayId: string
    visitOrder: number
    dayColor: string
    onDaysChange: (days: ItineraryDay[]) => void
    highlighted?: boolean
    selected?: boolean
    onHoverChange?: (itemId: string | null) => void
    onFocusItem?: (itemId: string) => void
}

export function ScheduleItemCard({
    item,
    tripId,
    canWrite,
    days,
    currentDayId,
    visitOrder,
    dayColor,
    onDaysChange,
    highlighted = false,
    selected = false,
    onHoverChange,
    onFocusItem,
}: Props) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [isSelfHovering, setIsSelfHovering] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // 내가 직접 마우스를 올린 경우엔 이미 보이는 상태라 스크롤할 필요 없음 —
        // 지도 마커 호버로 강조된 경우에만 목록에서도 위치를 찾아준다.
        if (selected || (highlighted && !isSelfHovering)) {
            cardRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            })
        }
    }, [selected, highlighted, isSelfHovering])
    const currentDay = days.find((day) => String(day.id) === currentDayId)
    const editor = useItineraryItemEditor({
        tripId,
        item,
        dayItems: currentDay?.items ?? [],
        onUpdated: onDaysChange,
    })
    const setLocalEditing = useTripAwarenessStore(
        (state) => state.setLocalEditing,
    )
    const clearLocalEditing = useTripAwarenessStore(
        (state) => state.clearLocalEditing,
    )
    const awarenessByMemberId = useTripAwarenessStore(
        (state) => state.awarenessByMemberId,
    )
    const currentMemberId = useCurrentUserStore(
        (state) => state.currentUser?.id ?? null,
    )
    const remoteEditor = Object.values(awarenessByMemberId).find(
        (awareness) =>
            awareness.memberId !== currentMemberId &&
            awareness.editingTargetId === String(item.id),
    )

    useEffect(() => {
        const targetId = String(item.id)
        if (editor.editing) {
            setLocalEditing({
                type: 'itinerary',
                targetId,
                label: `${item.placeName ?? '장소'} 일정 편집 중`,
            })
        } else {
            clearLocalEditing(targetId)
        }
        return () => clearLocalEditing(targetId)
    }, [
        clearLocalEditing,
        editor.editing,
        item.id,
        item.placeName,
        setLocalEditing,
    ])

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    })
    const style = { transform: CSS.Transform.toString(transform), transition }

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

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="h-11 rounded-lg border-2 border-dashed border-brand/40 bg-brand/5"
            />
        )
    }

    return (
        <div
            ref={(node) => {
                setNodeRef(node)
                cardRef.current = node
            }}
            style={style}
            onMouseEnter={() => {
                setIsSelfHovering(true)
                onHoverChange?.(String(item.id))
            }}
            onMouseLeave={() => {
                setIsSelfHovering(false)
                onHoverChange?.(null)
            }}
            onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const x = ((event.clientX - rect.left) / rect.width) * 100
                const y = ((event.clientY - rect.top) / rect.height) * 100
                event.currentTarget.style.setProperty('--glare-x', `${x}%`)
                event.currentTarget.style.setProperty('--glare-y', `${y}%`)
            }}
            className={`group relative overflow-hidden rounded-lg border bg-white shadow-sm transition-[border-color,box-shadow] duration-150 ease-out ${highlighted || selected ? 'border-brand ring-2 ring-brand/20 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}
        >
            {remoteEditor && (
                <div className="relative z-20 flex items-center gap-1 border-b border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
                    다른 일행이 편집 중이에요. 동시에 수정하면 마지막 저장
                    내용이 반영됩니다.
                </div>
            )}
            {/* 마우스를 따라다니는 은은한 하이라이트 */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background:
                        'radial-gradient(140px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgb(var(--rgb-white)/0.9), transparent 70%)',
                }}
            />
            <div className="relative z-10 flex items-stretch">
                {/* 카테고리 컬러 스트라이프 */}
                <div
                    className="w-1 shrink-0"
                    style={{
                        backgroundColor:
                            item.categoryColor ?? 'var(--color-app-border)',
                    }}
                />

                <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1">
                    {/* 왼쪽 그립 핸들 — 이 영역에서만 드래그 */}
                    {canWrite && (
                        <div
                            {...listeners}
                            {...attributes}
                            className="flex shrink-0 cursor-grab touch-none items-center self-stretch px-0.5 text-slate-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing"
                            title="잡고 이동하면 순서 변경"
                        >
                            <GripVertical size={14} />
                        </div>
                    )}

                    {/* 장소 정보 — 클릭하면 지도 포커스 */}
                    <div
                        onClick={() => onFocusItem?.(String(item.id))}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5"
                        title="클릭하면 지도에서 위치 확인"
                    >
                        <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-sm"
                            style={{ backgroundColor: dayColor }}
                            aria-label={`${visitOrder}번째 방문 장소`}
                        >
                            {visitOrder}
                        </span>
                        <div className="min-w-0 flex-1">
                            {/* 장소명 + 시간 가로 배치 */}
                            <div className="flex items-center gap-1.5">
                                {item.categoryIcon && (
                                    <span
                                        className="shrink-0"
                                        style={{
                                            color:
                                                item.categoryColor ??
                                                'var(--color-app-text-muted)',
                                        }}
                                    >
                                        <CategoryIcon
                                            icon={item.categoryIcon}
                                            size={12}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                                    {item.placeName ?? '(제목 없음)'}
                                </span>
                                <span className="shrink-0 text-xs text-slate-400">
                                    {formatTimeRange(
                                        item.startTime,
                                        item.endTime,
                                    )}
                                </span>
                            </div>
                            {item.memo && (
                                <p className="truncate text-[11px] leading-tight text-slate-400">
                                    {item.memo}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    {canWrite && (
                        <div className="flex shrink-0 items-center gap-0.5">
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
                <div className="relative z-10 border-t border-slate-100 px-3 pb-2.5 pt-2">
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
