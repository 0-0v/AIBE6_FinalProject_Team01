import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SendIcon, Trash2Icon } from 'lucide-react'
import type { MapPinCommentResponse } from '@/entities/trip'
import { resolveMediaUrl } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { Avatar, DEFAULT_AVATAR_COLOR } from '@/shared/ui'

const DEFAULT_VISIBLE_COMMENT_COUNT = 3

type Props = {
    comments: MapPinCommentResponse[]
    loading: boolean
    canWrite: boolean
    submitting: boolean
    error: string | null
    onSubmit: (content: string) => Promise<boolean>
    onDeleteComment: (commentId: number) => Promise<boolean>
}

const COMMENT_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
})

function formatCommentDate(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? ''
        : COMMENT_DATE_FORMATTER.format(date)
}

export function MapPinCommentSection({
    comments,
    loading,
    canWrite,
    submitting,
    error,
    onSubmit,
    onDeleteComment,
}: Props) {
    const [text, setText] = useState('')
    const [showAllComments, setShowAllComments] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const firstAnimationFrameRef = useRef<number | null>(null)
    const secondAnimationFrameRef = useRef<number | null>(null)
    const previousScrollHeightRef = useRef<number | null>(null)
    const currentMemberId = useCurrentUserStore(
        (state) => state.currentUser?.id ?? null,
    )
    const hiddenCommentCount = Math.max(
        0,
        comments.length - DEFAULT_VISIBLE_COMMENT_COUNT,
    )
    const visibleComments = showAllComments
        ? comments
        : comments.slice(-DEFAULT_VISIBLE_COMMENT_COUNT)

    useEffect(
        () => () => {
            if (firstAnimationFrameRef.current != null) {
                cancelAnimationFrame(firstAnimationFrameRef.current)
            }
            if (secondAnimationFrameRef.current != null) {
                cancelAnimationFrame(secondAnimationFrameRef.current)
            }
        },
        [],
    )

    useLayoutEffect(() => {
        const list = listRef.current
        const previousScrollHeight = previousScrollHeightRef.current
        if (list && previousScrollHeight != null) {
            list.scrollTop += list.scrollHeight - previousScrollHeight
            previousScrollHeightRef.current = null
        }
    }, [showAllComments])

    function revealOlderComments() {
        if (listRef.current) {
            previousScrollHeightRef.current = listRef.current.scrollHeight
        }
        setShowAllComments(true)
    }

    function revealNewestComment() {
        if (firstAnimationFrameRef.current != null) {
            cancelAnimationFrame(firstAnimationFrameRef.current)
        }
        if (secondAnimationFrameRef.current != null) {
            cancelAnimationFrame(secondAnimationFrameRef.current)
        }

        firstAnimationFrameRef.current = requestAnimationFrame(() => {
            secondAnimationFrameRef.current = requestAnimationFrame(() => {
                const list = listRef.current
                const newestComment = list?.lastElementChild
                list?.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
                newestComment?.animate(
                    [
                        { backgroundColor: 'rgb(var(--rgb-brand) / 0.18)' },
                        { backgroundColor: 'rgb(248 250 252)' },
                    ],
                    { duration: 1200, easing: 'ease-out' },
                )
                firstAnimationFrameRef.current = null
                secondAnimationFrameRef.current = null
            })
        })
    }

    async function submit() {
        if (!text.trim() || loading || submitting) return
        const succeeded = await onSubmit(text.trim())
        if (succeeded) {
            setText('')
            revealNewestComment()
        }
    }

    async function handleDelete(commentId: number) {
        if (deletingId != null) return
        setDeletingId(commentId)
        try {
            await onDeleteComment(commentId)
        } finally {
            setDeletingId(null)
        }
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
                <>
                    {!showAllComments && hiddenCommentCount > 0 && (
                        <button
                            type="button"
                            onClick={revealOlderComments}
                            className="mb-1.5 w-full text-left text-[10px] font-semibold text-brand-700 hover:underline"
                        >
                            이전 댓글 {hiddenCommentCount}개 더 보기
                        </button>
                    )}
                    <ul
                        ref={listRef}
                        aria-live="polite"
                        className={`mp-scroll space-y-1.5 overflow-y-auto ${
                            showAllComments ? 'max-h-56' : 'max-h-36'
                        }`}
                    >
                        {visibleComments.map((comment) => {
                            const isOwn = comment.memberId === currentMemberId
                            return (
                                <li
                                    key={comment.id}
                                    className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-1.5"
                                >
                                    <Avatar
                                        name={comment.nickname}
                                        color={DEFAULT_AVATAR_COLOR}
                                        size={24}
                                        imageUrl={resolveMediaUrl(
                                            comment.profileImageUrl,
                                        )}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-[11px] font-bold text-slate-700">
                                                {comment.nickname}
                                                {isOwn && (
                                                    <span className="ml-1 rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] text-brand-700">
                                                        나
                                                    </span>
                                                )}
                                            </span>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <time
                                                    dateTime={comment.createdAt}
                                                    className="text-[9px] text-slate-400"
                                                >
                                                    {formatCommentDate(
                                                        comment.createdAt,
                                                    )}
                                                </time>
                                                {isOwn && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleDelete(
                                                                comment.id,
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                            comment.id
                                                        }
                                                        className="rounded p-0.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                                                        aria-label="댓글 삭제"
                                                    >
                                                        <Trash2Icon size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-600">
                                            {comment.content}
                                        </p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    {showAllComments && hiddenCommentCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowAllComments(false)}
                            className="mt-1.5 w-full text-right text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                        >
                            최근 댓글만 보기
                        </button>
                    )}
                </>
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
                        onPointerDown={(e) => {
                            e.stopPropagation()
                            e.currentTarget.focus()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (
                                e.key === 'Enter' &&
                                !e.nativeEvent.isComposing
                            ) {
                                void submit()
                            }
                        }}
                        placeholder="댓글 입력…"
                        maxLength={500}
                        disabled={submitting}
                        className="pointer-events-auto flex-1 cursor-text rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-brand focus:bg-white disabled:opacity-60"
                    />
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={loading || submitting || !text.trim()}
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
