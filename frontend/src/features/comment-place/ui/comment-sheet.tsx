import React, { useState } from 'react'
import { SendIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Place } from '@/entities/trip'
import { useCurrentUserStore } from '@/shared/model'

type Props = {
    place: Place
    canWrite: boolean
    onClose: () => void
    onAddComment: (text: string) => Promise<void>
    onDeleteComment: (commentId: string) => Promise<void>
    error?: string | null
}

export function CommentSheet({
    place,
    canWrite,
    onClose,
    onAddComment,
    onDeleteComment,
    error,
}: Props) {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const currentUserId = String(currentUser?.id ?? '')
    const [text, setText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    async function submit() {
        if (!text.trim() || submitting) return
        setSubmitting(true)
        try {
            await onAddComment(text.trim())
            setText('')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDelete(commentId: string) {
        if (deletingId) return
        setDeletingId(commentId)
        try {
            await onDeleteComment(commentId)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="absolute inset-0 z-40 flex flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                    <h3 className="font-bold">댓글</h3>
                    <p className="text-xs text-slate-400">{place.name}</p>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                    <XIcon size={18} />
                </button>
            </div>

            {error && (
                <p
                    role="alert"
                    className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                >
                    {error}
                </p>
            )}

            <div className="mp-scroll flex-1 space-y-4 overflow-y-auto p-4">
                {place.comments.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400">
                        아직 댓글이 없어요. 첫 의견을 남겨보세요!
                    </p>
                )}
                {place.comments.map((c) => {
                    const isOwn = c.memberId === currentUserId
                    const authorName = isOwn
                        ? (currentUser?.nickname ?? '나')
                        : '멤버'
                    return (
                        <div key={c.id} className="flex gap-2.5">
                            <div className="flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-semibold">
                                            {authorName}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            {c.createdAt}
                                        </span>
                                    </div>
                                    {isOwn && (
                                        <button
                                            onClick={() =>
                                                void handleDelete(c.id)
                                            }
                                            disabled={deletingId === c.id}
                                            className="shrink-0 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                                            aria-label="댓글 삭제"
                                        >
                                            <Trash2Icon size={13} />
                                        </button>
                                    )}
                                </div>
                                <p className="mt-0.5 text-sm text-slate-600">
                                    {c.text}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {canWrite ? (
                <div className="border-t border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && void submit()
                            }
                            placeholder="댓글 입력…"
                            disabled={submitting}
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
                        />
                        <button
                            onClick={() => void submit()}
                            disabled={submitting || !text.trim()}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-700 disabled:opacity-40"
                        >
                            <SendIcon size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-400">
                    조회 전용 모드에서는 댓글을 남길 수 없어요
                </div>
            )}
        </div>
    )
}
