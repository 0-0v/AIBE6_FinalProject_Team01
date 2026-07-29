'use client'

import { useEffect, useState } from 'react'
import { GripVerticalIcon, LoaderCircleIcon, XIcon } from 'lucide-react'
import type { ItineraryBoardFeedback as Feedback } from '../model/use-itinerary-board'

type Props = {
    saving: boolean
    feedback: Feedback | null
    onUndo: () => void
    onDismiss: () => void
}

export function ItineraryBoardFeedback({
    saving,
    feedback,
    onUndo,
    onDismiss,
}: Props) {
    useEffect(() => {
        if (saving || feedback == null) return
        const timer = window.setTimeout(onDismiss, 6000)
        return () => window.clearTimeout(timer)
    }, [feedback, onDismiss, saving])

    if (!saving && feedback == null) return null

    return (
        <div
            className="absolute bottom-4 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xl"
            role="status"
            aria-live="polite"
        >
            {saving ? (
                <>
                    <LoaderCircleIcon size={14} className="animate-spin" />
                    일정 저장 중…
                </>
            ) : (
                <>
                    <span className="truncate">{feedback?.message}</span>
                    {feedback?.undo && (
                        <button
                            type="button"
                            onClick={onUndo}
                            className="shrink-0 rounded-md bg-white/15 px-2 py-1 text-brand-100 transition hover:bg-white/25"
                        >
                            실행 취소
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="알림 닫기"
                        className="shrink-0 rounded p-0.5 text-white/60 hover:text-white"
                    >
                        <XIcon size={13} />
                    </button>
                </>
            )}
        </div>
    )
}

export function ItineraryBoardGuide() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setVisible(
                window.localStorage.getItem('itinerary-board-guide-seen') !==
                    'true',
            )
        }, 0)
        return () => window.clearTimeout(timer)
    }, [])

    if (!visible) return null

    return (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-slate-600">
            <GripVerticalIcon size={15} className="shrink-0 text-brand" />
            <p className="min-w-0 flex-1">
                장소 카드를 누른 채 원하는 Day로 옮겨보세요. 지도에서 위치와
                색상이 바로 바뀝니다.
            </p>
            <button
                type="button"
                className="shrink-0 font-bold text-brand"
                onClick={() => {
                    window.localStorage.setItem(
                        'itinerary-board-guide-seen',
                        'true',
                    )
                    setVisible(false)
                }}
            >
                확인
            </button>
        </div>
    )
}
