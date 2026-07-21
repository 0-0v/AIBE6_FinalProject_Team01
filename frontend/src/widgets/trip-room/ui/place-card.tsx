import React, { useState } from 'react'
import {
    CheckIcon,
    ClockIcon,
    MessageCircleIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
    Trash2Icon,
} from 'lucide-react'
import { CATEGORY_META, Place } from '@/entities/trip'
import { useCurrentUserStore } from '@/shared/model'

type Props = {
    place: Place
    selected: boolean
    canWrite: boolean
    onSelect: () => void
    onVote: (value: 'up' | 'down') => void
    onSave: () => void
    onHold: () => void
    onDelete: () => void
    onUpdateNote: (note: string) => Promise<void>
    onUpdatePriority: (priority: number) => Promise<void>
    onOpenComments: () => void
}

export function PlaceCard({
    place,
    selected,
    canWrite,
    onSelect,
    onVote,
    onSave,
    onHold,
    onDelete,
    onUpdateNote,
    onUpdatePriority,
    onOpenComments,
}: Props) {
    const currentUserId = String(
        useCurrentUserStore((state) => state.currentUser?.id) ?? '',
    )
    const meta = CATEGORY_META[place.category]
    const supporters = place.votes.filter((vote) => vote.value === 'up')
    const upVotes = supporters.length
    const downVotes = place.votes.filter((vote) => vote.value === 'down').length
    const myVote = place.votes.find(
        (vote) => vote.memberId === currentUserId,
    )?.value
    const isCandidate = place.status === 'candidate'
    const [noteDraft, setNoteDraft] = useState(place.note ?? '')
    const [priorityDraft, setPriorityDraft] = useState(
        place.priority?.toString() ?? '',
    )
    const [savingNote, setSavingNote] = useState(false)
    const [savingPriority, setSavingPriority] = useState(false)

    async function saveNote() {
        setSavingNote(true)
        try {
            await onUpdateNote(noteDraft.trim())
        } catch {
            // 상위 패널의 공통 오류 영역에서 안내한다.
        } finally {
            setSavingNote(false)
        }
    }

    async function savePriority() {
        const priority = Number(priorityDraft)
        if (!Number.isInteger(priority) || priority < 1) return
        setSavingPriority(true)
        try {
            await onUpdatePriority(priority)
        } catch {
            // 상위 패널의 공통 오류 영역에서 안내한다.
        } finally {
            setSavingPriority(false)
        }
    }

    return (
        <article
            onClick={onSelect}
            className={`cursor-pointer rounded-2xl border bg-white p-3 transition ${selected ? 'border-brand ring-2 ring-brand-100' : 'border-slate-100 hover:border-slate-300'}`}
        >
            <div className="flex gap-3">
                <img
                    src={place.image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h4 className="truncate text-sm font-extrabold text-slate-900">
                                {place.name}
                            </h4>
                            <p className="mt-1 truncate text-[11px] text-slate-400">
                                {place.address}
                            </p>
                        </div>
                        <span
                            className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold text-white"
                            style={{ backgroundColor: meta.color }}
                        >
                            {meta.emoji} {meta.label}
                        </span>
                    </div>
                    {isCandidate ? (
                        <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2 py-1 text-[10px] font-extrabold text-orange-600">
                            투표 진행 중
                        </span>
                    ) : place.status === 'saved' ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-extrabold text-brand-700">
                            <CheckIcon size={10} /> 지도에 저장됨
                        </span>
                    ) : (
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                            보류 중
                        </span>
                    )}
                </div>
            </div>

            <div
                className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-2.5"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center gap-2">
                    <label className="w-14 shrink-0 text-[11px] font-bold text-slate-500">
                        우선순위
                    </label>
                    {canWrite ? (
                        <>
                            <input
                                type="number"
                                min={1}
                                value={priorityDraft}
                                onChange={(event) =>
                                    setPriorityDraft(event.target.value)
                                }
                                placeholder="1 이상"
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <button
                                type="button"
                                disabled={
                                    savingPriority ||
                                    !priorityDraft ||
                                    Number(priorityDraft) < 1
                                }
                                onClick={savePriority}
                                className="rounded-lg bg-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-300 disabled:opacity-40"
                            >
                                {savingPriority ? '저장 중' : '저장'}
                            </button>
                        </>
                    ) : (
                        <span className="text-xs text-slate-600">
                            {place.priority ?? '미지정'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <label className="w-14 shrink-0 text-[11px] font-bold text-slate-500">
                        메모
                    </label>
                    {canWrite ? (
                        <>
                            <input
                                value={noteDraft}
                                onChange={(event) =>
                                    setNoteDraft(event.target.value)
                                }
                                placeholder="장소 메모"
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <button
                                type="button"
                                disabled={savingNote}
                                onClick={saveNote}
                                className="rounded-lg bg-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-300 disabled:opacity-40"
                            >
                                {savingNote ? '저장 중' : '저장'}
                            </button>
                        </>
                    ) : (
                        <span className="truncate text-xs text-slate-600">
                            {place.note || '메모 없음'}
                        </span>
                    )}
                </div>
            </div>

            {isCandidate && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fffaf0] p-2.5">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                            {supporters.length > 0 ? (
                                supporters.slice(0, 3).map((vote) => (
                                    <span
                                        key={vote.memberId}
                                        className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700 ring-2 ring-[#fffaf0]"
                                    >
                                        {vote.memberId}
                                    </span>
                                ))
                            ) : (
                                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-slate-200 text-[10px]">
                                    ?
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">
                            {upVotes ? `${upVotes}명 찬성` : '의견을 모으는 중'}
                        </span>
                    </div>
                    <button
                        onClick={(event) => {
                            event.stopPropagation()
                            onOpenComments()
                        }}
                        className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-white"
                    >
                        <MessageCircleIcon size={13} /> {place.comments.length}
                    </button>
                </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                {isCandidate ? (
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={!canWrite}
                            onClick={(event) => {
                                event.stopPropagation()
                                onVote('up')
                            }}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition disabled:opacity-40 ${myVote === 'up' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500 hover:bg-brand-50 hover:text-brand-700'}`}
                        >
                            <ThumbsUpIcon size={13} /> 찬성 {upVotes}
                        </button>
                        <button
                            disabled={!canWrite}
                            onClick={(event) => {
                                event.stopPropagation()
                                onVote('down')
                            }}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition disabled:opacity-40 ${myVote === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'}`}
                        >
                            <ThumbsDownIcon size={13} /> 반대 {downVotes}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">
                            멤버 #{place.addedBy} 등록
                        </span>
                    </div>
                )}
                {canWrite && (
                    <div className="flex items-center gap-1">
                        {isCandidate && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onSave()
                                }}
                                className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-brand-700"
                            >
                                <CheckIcon size={13} /> 후보 확정
                            </button>
                        )}
                        {isCandidate && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onHold()
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                aria-label="후보 장소 보류"
                            >
                                <ClockIcon size={15} />
                            </button>
                        )}
                        <button
                            onClick={(event) => {
                                event.stopPropagation()
                                onDelete()
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                            aria-label="장소 삭제"
                        >
                            <Trash2Icon size={15} />
                        </button>
                    </div>
                )}
            </div>
        </article>
    )
}
