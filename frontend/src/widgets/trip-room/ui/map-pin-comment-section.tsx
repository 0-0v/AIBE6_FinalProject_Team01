import { useState } from 'react'
import { SendIcon } from 'lucide-react'
import type { MapPinCommentResponse } from '@/entities/trip'

type Props = {
    comments: MapPinCommentResponse[]
    loading: boolean
    canWrite: boolean
    submitting: boolean
    error: string | null
    onSubmit: (content: string) => Promise<void>
}

export function MapPinCommentSection({
    comments,
    loading,
    canWrite,
    submitting,
    error,
    onSubmit,
}: Props) {
    const [text, setText] = useState('')

    async function submit() {
        if (!text.trim() || submitting) return
        await onSubmit(text.trim())
        setText('')
    }

    return (
        <div className="mt-2.5 border-t border-slate-100 pt-2.5">
            <p className="mb-1.5 text-[11px] font-bold text-slate-500">
                댓글{comments.length > 0 ? ` ${comments.length}` : ''}
            </p>

            {loading ? (
                <p className="py-2 text-center text-[11px] text-slate-400">
                    불러오는 중…
                </p>
            ) : comments.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-slate-400">
                    아직 댓글이 없어요
                </p>
            ) : (
                <ul className="mp-scroll max-h-24 space-y-1.5 overflow-y-auto">
                    {comments.map((comment) => (
                        <li
                            key={comment.id}
                            className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600"
                        >
                            {comment.content}
                        </li>
                    ))}
                </ul>
            )}

            {error && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                    {error}
                </p>
            )}

            {canWrite && (
                <div className="mt-1.5 flex items-center gap-1.5">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void submit()}
                        placeholder="댓글 입력…"
                        disabled={submitting}
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-brand focus:bg-white disabled:opacity-60"
                    />
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={submitting || !text.trim()}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-slate-900 transition hover:bg-brand-700 hover:text-white disabled:opacity-40"
                        aria-label="댓글 등록"
                    >
                        <SendIcon size={12} />
                    </button>
                </div>
            )}
        </div>
    )
}
