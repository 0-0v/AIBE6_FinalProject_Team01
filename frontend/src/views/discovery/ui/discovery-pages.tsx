'use client'

import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import {
    BookmarkIcon,
    CalendarPlusIcon,
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
    copyCardItinerary,
    fetchCopyTargets,
    type CardSort,
    type CopyTarget,
    type PublicCard,
    useExploreCardStore,
} from '@/features/explore-card'
import { CreateTripModal } from '@/features/manage-trip'
import { NotificationList } from '@/features/manage-notification'
import { resolveMediaUrl } from '@/shared/api/client'
import { useNavigate } from 'react-router-dom'

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
    const [copyCard, setCopyCard] = useState<PublicCard | null>(null)
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
                            onCopy={() => setCopyCard(card)}
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
            {copyCard && (
                <ItineraryCopyFlow
                    card={copyCard}
                    onClose={() => setCopyCard(null)}
                />
            )}
        </div>
    )
}

function TravelCard({
    card,
    onBookmark,
    onComments,
    onCopy,
}: {
    card: PublicCard
    onBookmark: () => void
    onComments: () => void
    onCopy: () => void
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
                {!card.ownCard && (
                    <button
                        type="button"
                        onClick={onCopy}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-extrabold text-white hover:bg-brand-700"
                    >
                        <CalendarPlusIcon size={16} /> 일정 담기
                    </button>
                )}
            </div>
        </article>
    )
}

function ItineraryCopyFlow({ card, onClose }: { card: PublicCard; onClose: () => void }) {
    const navigate = useNavigate()
    const [step, setStep] = useState<'confirm' | 'select' | 'conflict' | 'success'>('confirm')
    const [targets, setTargets] = useState<CopyTarget[]>([])
    const [selected, setSelected] = useState<CopyTarget | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [copyError, setCopyError] = useState<string | null>(null)
    const [copiedTripId, setCopiedTripId] = useState<number | null>(null)

    async function openTargets() {
        setLoading(true)
        setCopyError(null)
        try {
            setTargets(await fetchCopyTargets())
            setStep('select')
        } catch (caught) {
            setCopyError(copyErrorMessage(caught))
        } finally {
            setLoading(false)
        }
    }

    async function copy(targetTripId: number, mode: 'REPLACE' | 'APPEND') {
        setLoading(true)
        setCopyError(null)
        try {
            await copyCardItinerary(card.id, targetTripId, mode)
            setCopiedTripId(targetTripId)
            setStep('success')
        } catch (caught) {
            setCopyError(copyErrorMessage(caught))
        } finally {
            setLoading(false)
        }
    }

    function choose(target: CopyTarget) {
        setSelected(target)
        if (target.hasItinerary) setStep('conflict')
        else void copy(target.tripId, 'APPEND')
    }

    return (
        <>
            {!createOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4">
                <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                    {step === 'confirm' && (
                        <>
                            <h2 className="text-center text-xl font-black">
                                이 일정을 내 여행에 그대로 담을까요?
                            </h2>
                            <p className="mt-3 text-center text-sm leading-6 text-slate-500">
                                장소와 일정만 담으며 기록·사진·비용·개인 메모는 제외됩니다.
                            </p>
                            {copyError && <CopyError text={copyError} />}
                            <div className="mt-7 grid grid-cols-2 gap-2">
                                <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 py-3 font-bold text-slate-500">취소</button>
                                <button type="button" disabled={loading} onClick={() => void openTargets()} className="rounded-xl bg-brand py-3 font-extrabold text-white disabled:opacity-50">
                                    {loading ? '불러오는 중...' : '확인'}
                                </button>
                            </div>
                        </>
                    )}
                    {step === 'select' && (
                        <>
                            <h2 className="text-2xl font-black tracking-tight">
                                이 일정을 담을 여행을 선택해 주세요.
                            </h2>
                            <button type="button" onClick={() => setCreateOpen(true)} className="mt-6 rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white">
                                새 여행 만들어 담기
                            </button>
                            <h3 className="mt-8 text-sm font-extrabold">나의 다가오는 여행</h3>
                            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                                {targets.map((target) => (
                                    <button key={target.tripId} type="button" disabled={loading} onClick={() => choose(target)} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left hover:bg-brand-50">
                                        <img src={resolveMediaUrl(target.coverImageUrl) ?? '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg'} alt="" className="h-14 w-14 rounded-full object-cover" />
                                        <span className="min-w-0">
                                            <strong className="block truncate">{target.title}</strong>
                                            <span className="text-xs text-slate-500">{target.startDate} ~ {target.endDate}</span>
                                        </span>
                                    </button>
                                ))}
                                {targets.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">날짜가 정해진 예정 여행이 없습니다.</p>}
                            </div>
                            {copyError && <CopyError text={copyError} />}
                            <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl border py-3 text-sm font-bold">취소</button>
                        </>
                    )}
                    {step === 'conflict' && selected && (
                        <>
                            <h2 className="text-xl font-black">이미 담아 놓은 일정이 있어요</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                기존 일정과 장소를 삭제하고 담거나, 중복되지 않는 장소를 기존 일정 뒤에 추가할 수 있습니다.
                            </p>
                            {copyError && <CopyError text={copyError} />}
                            <div className="mt-6 grid gap-2">
                                <button type="button" disabled={loading} onClick={() => void copy(selected.tripId, 'REPLACE')} className="rounded-xl bg-red-600 py-3 text-sm font-extrabold text-white">삭제하고 담기</button>
                                <button type="button" disabled={loading} onClick={() => void copy(selected.tripId, 'APPEND')} className="rounded-xl bg-brand py-3 text-sm font-extrabold text-white">추가해서 담기</button>
                                <button type="button" onClick={() => setStep('select')} className="py-2 text-sm font-bold text-slate-500">다시 선택</button>
                            </div>
                        </>
                    )}
                    {step === 'success' && copiedTripId && (
                        <>
                            <h2 className="text-center text-2xl font-black">
                                일정을 담았습니다
                            </h2>
                            <p className="mt-3 text-center text-sm text-slate-500">
                                대상 여행방에서 담은 장소와 일정을 확인해 보세요.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate(`/app/room/${copiedTripId}`)}
                                className="mt-7 w-full rounded-xl bg-brand py-3 font-extrabold text-white"
                            >
                                완료
                            </button>
                        </>
                    )}
                </section>
            </div>
            )}
            {createOpen && (
                <CreateTripModal
                    onClose={() => setCreateOpen(false)}
                    requireDates
                    onCreated={(tripId) => {
                        setCreateOpen(false)
                        void copy(tripId, 'APPEND')
                    }}
                />
            )}
        </>
    )
}

function CopyError({ text }: { text: string }) {
    return <p className="mt-4 text-sm font-semibold text-red-500">{text}</p>
}

function copyErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : '일정을 담지 못했습니다.'
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
