'use client'

import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import {
    BookmarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    LoaderCircleIcon,
    MessageCircleIcon,
    SearchIcon,
    SearchXIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react'
import {
    type CardSort,
    type PublicCard,
    useExploreCardStore,
} from '@/features/explore-card'
import { NotificationList } from '@/features/manage-notification'
import { resolveMediaUrl } from '@/shared/api/client'

const SORTS: { value: CardSort; label: string }[] = [
    { value: 'LATEST', label: '최신순' },
    { value: 'POPULAR', label: '인기순' },
    { value: 'COMMENTS', label: '댓글순' },
]

function PageHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string
    title: string
    description: string
}) {
    return (
        <header>
            <p className="text-xs font-extrabold tracking-[0.12em] text-brand-700">
                {eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.05em] text-slate-950 sm:text-3xl">
                {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </header>
    )
}

export function Explore() {
    const [query, setQuery] = useState('')
    const [submittedQuery, setSubmittedQuery] = useState('')
    const [sort, setSort] = useState<CardSort>('LATEST')
    const [page, setPage] = useState(0)
    const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
    const data = useExploreCardStore((state) => state.data)
    const isLoading = useExploreCardStore((state) => state.isLoading)
    const error = useExploreCardStore((state) => state.error)
    const loadCards = useExploreCardStore((state) => state.loadCards)
    const toggleBookmark = useExploreCardStore((state) => state.toggleBookmark)
    const selectedCard =
        data?.content.find((card) => card.id === selectedCardId) ?? null

    useEffect(() => {
        void loadCards(page, sort, submittedQuery)
    }, [loadCards, page, sort, submittedQuery])

    function search(event: FormEvent) {
        event.preventDefault()
        setPage(0)
        setSubmittedQuery(query.trim())
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
            <div className="mx-auto max-w-[1240px]">
                <PageHeader
                    eyebrow="DISCOVER"
                    title="둘러보기"
                    description="다른 여행자들이 공개한 완료 여행 카드를 둘러보세요."
                />

                <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <form
                        onSubmit={search}
                        className="flex min-h-11 w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm sm:max-w-lg sm:rounded-full sm:px-4"
                    >
                        <SearchIcon
                            size={17}
                            className="shrink-0 text-slate-400"
                        />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="제목, 태그, 작성자로 검색"
                            aria-label="공개 여행 카드 검색어"
                            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            className="shrink-0 whitespace-nowrap rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
                        >
                            검색
                        </button>
                    </form>

                    <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:w-auto lg:overflow-visible lg:pb-0">
                        {SORTS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                    setSort(item.value)
                                    setPage(0)
                                }}
                                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                                    sort === item.value
                                        ? 'bg-brand text-white'
                                        : 'border border-slate-200 bg-white text-slate-500 hover:border-brand-200'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                        {error}
                    </p>
                )}

                {isLoading && !data && (
                    <div className="flex justify-center py-24 text-brand-700">
                        <LoaderCircleIcon className="animate-spin" />
                    </div>
                )}

                {!isLoading && !error && data?.content.length === 0 && (
                    <div className="mt-10 rounded-[22px] bg-white py-20 text-center sm:py-24">
                        <SearchXIcon className="mx-auto text-slate-300" />
                        <p className="mt-3 font-bold">
                            공개된 여행 카드가 없습니다.
                        </p>
                    </div>
                )}

                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                    {data?.content.map((card) => (
                        <TravelCard
                            key={card.id}
                            card={card}
                            onBookmark={() => void toggleBookmark(card.id)}
                            onComments={() => setSelectedCardId(card.id)}
                        />
                    ))}
                </div>

                {(data?.totalPages ?? 0) > 1 && (
                    <nav
                        aria-label="둘러보기 페이지"
                        className="mt-8 flex flex-wrap justify-center gap-2"
                    >
                        <PageButton
                            label="이전 페이지"
                            disabled={page === 0}
                            onClick={() => setPage((current) => current - 1)}
                        >
                            <ChevronLeftIcon size={16} />
                        </PageButton>
                        {Array.from(
                            { length: data?.totalPages ?? 0 },
                            (_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setPage(index)}
                                    aria-current={
                                        page === index ? 'page' : undefined
                                    }
                                    className={`h-9 w-9 rounded-full text-xs font-bold ${
                                        page === index
                                            ? 'bg-brand text-white'
                                            : 'bg-white text-slate-600'
                                    }`}
                                >
                                    {index + 1}
                                </button>
                            ),
                        )}
                        <PageButton
                            label="다음 페이지"
                            disabled={page + 1 >= (data?.totalPages ?? 0)}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            <ChevronRightIcon size={16} />
                        </PageButton>
                    </nav>
                )}
            </div>

            {selectedCard && (
                <CommentModal
                    card={selectedCard}
                    onClose={() => setSelectedCardId(null)}
                />
            )}
        </div>
    )
}

function TravelCard({
    card,
    onBookmark,
    onComments,
}: {
    card: PublicCard
    onBookmark: () => void
    onComments: () => void
}) {
    return (
        <article className="flex min-w-0 flex-col overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <img
                src={
                    resolveMediaUrl(card.coverImageUrl) ??
                    '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg'
                }
                alt={`${card.title} 대표 이미지`}
                className="aspect-[16/9] w-full object-cover"
            />
            <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="truncate font-extrabold text-slate-900">
                            {card.title}
                        </h2>
                        <p className="mt-1 truncate text-xs text-slate-400">
                            {card.destination ?? '여행지 미정'} ·{' '}
                            {card.authorNickname}
                        </p>
                    </div>
                    {!card.ownCard && (
                        <button
                            type="button"
                            onClick={onBookmark}
                            title={card.bookmarked ? '북마크 해제' : '북마크'}
                            aria-label={
                                card.bookmarked ? '북마크 해제' : '북마크'
                            }
                            className="shrink-0 rounded-full p-1.5 text-brand-700 transition hover:bg-brand-50"
                        >
                            <BookmarkIcon
                                size={20}
                                fill={card.bookmarked ? 'currentColor' : 'none'}
                            />
                        </button>
                    )}
                </div>
                <div className="mt-3 flex min-h-6 flex-wrap gap-1">
                    {card.tags.map((tag) => (
                        <span
                            key={tag}
                            className="max-w-full truncate rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                    {card.summary ?? '완료된 여행의 기록을 확인해 보세요.'}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-slate-400">
                    <span className="truncate">
                        북마크 {card.bookmarkCount}
                    </span>
                    <button
                        type="button"
                        onClick={onComments}
                        className="flex shrink-0 items-center gap-1 whitespace-nowrap font-bold text-slate-600 hover:text-brand-700"
                    >
                        <MessageCircleIcon size={14} />
                        댓글 {card.commentCount}
                    </button>
                </div>
            </div>
        </article>
    )
}

function PageButton({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string
    disabled: boolean
    onClick: () => void
    children: ReactNode
}) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="rounded-full border border-slate-200 bg-white p-2 disabled:opacity-30"
        >
            {children}
        </button>
    )
}

function CommentModal({
    card,
    onClose,
}: {
    card: PublicCard
    onClose: () => void
}) {
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const comments = useExploreCardStore(
        (state) => state.commentsByCardId[card.id] ?? [],
    )
    const commentsLoading = useExploreCardStore(
        (state) => state.commentsLoading,
    )
    const loadComments = useExploreCardStore((state) => state.loadComments)
    const createComment = useExploreCardStore((state) => state.createComment)
    const removeComment = useExploreCardStore((state) => state.removeComment)

    useEffect(() => {
        void loadComments(card.id)
    }, [card.id, loadComments])

    async function submit(event: FormEvent) {
        event.preventDefault()
        const nextContent = content.trim()
        if (!nextContent || isSubmitting) return

        setIsSubmitting(true)
        try {
            const created = await createComment(card.id, nextContent)
            if (created) setContent('')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="card-comment-title"
                className="flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-3xl sm:p-6"
            >
                <div className="flex min-w-0 items-center justify-between gap-3">
                    <h2
                        id="card-comment-title"
                        className="truncate font-extrabold"
                    >
                        {card.title} 댓글
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="댓글 창 닫기"
                        className="shrink-0 rounded-full p-1 hover:bg-slate-100"
                    >
                        <XIcon />
                    </button>
                </div>

                <div className="mt-4 min-h-32 flex-1 space-y-3 overflow-y-auto overscroll-contain">
                    {commentsLoading && (
                        <LoaderCircleIcon className="mx-auto mt-12 animate-spin text-brand-700" />
                    )}
                    {!commentsLoading && comments.length === 0 && (
                        <p className="py-10 text-center text-sm text-slate-400">
                            첫 댓글을 남겨보세요.
                        </p>
                    )}
                    {!commentsLoading &&
                        comments.map((comment) => (
                            <div
                                key={comment.id}
                                className="rounded-xl bg-slate-50 p-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <b className="truncate text-xs">
                                        {comment.memberNickname}
                                    </b>
                                    {comment.mine && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void removeComment(
                                                    card.id,
                                                    comment.id,
                                                )
                                            }
                                            aria-label="댓글 삭제"
                                            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        >
                                            <Trash2Icon size={14} />
                                        </button>
                                    )}
                                </div>
                                <p className="mt-1 break-words text-sm leading-5">
                                    {comment.content}
                                </p>
                            </div>
                        ))}
                </div>

                <form
                    onSubmit={submit}
                    className="mt-4 flex items-stretch gap-2 border-t border-slate-100 pt-4"
                >
                    <input
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        maxLength={1000}
                        placeholder="댓글 입력"
                        aria-label="댓글 내용"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                    <button
                        type="submit"
                        disabled={!content.trim() || isSubmitting}
                        className="shrink-0 whitespace-nowrap rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                    >
                        등록
                    </button>
                </form>
            </section>
        </div>
    )
}

export function Updates() {
    return (
        <div className="min-h-full bg-[#f8fafb] px-4 py-6 sm:px-9 sm:py-7">
            <div className="mx-auto max-w-[860px]">
                <PageHeader
                    eyebrow="ACTIVITY"
                    title="알림"
                    description="여행방의 주요 활동과 AI 결과를 확인하세요."
                />
                <NotificationList />
            </div>
        </div>
    )
}
