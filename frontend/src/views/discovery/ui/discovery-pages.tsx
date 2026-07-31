'use client'

import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import {
    BadgeCheckIcon,
    BookmarkIcon,
    CalendarPlusIcon,
    CalendarDaysIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    LoaderCircleIcon,
    ListIcon,
    MapPinIcon,
    MessageCircleIcon,
    SearchIcon,
    SearchXIcon,
    PanelLeftCloseIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react'
import {
    copyCardItinerary,
    fetchCopyTargets,
    fetchPublicCardDetail,
    type CardSort,
    type CopyTarget,
    type PublicCard,
    type PublicCardDetail,
    useExploreCardStore,
} from '@/features/explore-card'
import {
    REALTIME_EVENT_NAME,
    type RealtimeEvent,
} from '@/widgets/realtime-sync'
import { CreateTripModal } from '@/features/manage-trip'
import { NotificationList } from '@/features/manage-notification'
import { resolveMediaUrl } from '@/shared/api/client'
import { KanbanMapPanel } from '@/widgets/trip-room'
import { useNavigate, useParams } from 'react-router-dom'

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
    const navigate = useNavigate()
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
    const loadComments = useExploreCardStore((state) => state.loadComments)
    const toggleBookmark = useExploreCardStore((state) => state.toggleBookmark)
    const selectedCard =
        data?.content.find((card) => card.id === selectedCardId) ?? null

    useEffect(() => {
        void loadCards(page, sort, submittedQuery)
    }, [loadCards, page, sort, submittedQuery])

    useEffect(() => {
        const handleRealtimeChange = (event: Event) => {
            const detail = (event as CustomEvent<RealtimeEvent>).detail
            if (detail.type !== 'PUBLIC_CARD_CHANGED') return
            void loadCards(page, sort, submittedQuery)
            if (
                selectedCardId !== null &&
                selectedCardId === detail.targetId
            ) {
                void loadComments(selectedCardId)
            }
        }
        window.addEventListener(REALTIME_EVENT_NAME, handleRealtimeChange)
        return () =>
            window.removeEventListener(
                REALTIME_EVENT_NAME,
                handleRealtimeChange,
            )
    }, [
        loadCards,
        loadComments,
        page,
        selectedCardId,
        sort,
        submittedQuery,
    ])

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
                            onOpen={() =>
                                navigate(`/app/explore/${card.id}`)
                            }
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
    onOpen,
}: {
    card: PublicCard
    onBookmark: () => void
    onComments: () => void
    onCopy: () => void
    onOpen: () => void
}) {
    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onOpen()
            }}
            className="flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
        >
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
                    {card.ownCard ? (
                        <span
                            title="내가 참여한 여행 카드"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-2.5 py-1.5 text-[11px] font-black tracking-[0.08em] text-white shadow-[0_6px_14px_rgba(231,101,122,0.24)]"
                        >
                            <BadgeCheckIcon size={14} />
                            MY
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onBookmark()
                            }}
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
                        onClick={(event) => {
                            event.stopPropagation()
                            onComments()
                        }}
                        className="flex shrink-0 items-center gap-1 whitespace-nowrap font-bold text-slate-600 hover:text-brand-700"
                    >
                        <MessageCircleIcon size={14} />
                        댓글 {card.commentCount}
                    </button>
                </div>
                {!card.ownCard && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            onCopy()
                        }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-extrabold text-white hover:bg-brand-700"
                    >
                        <CalendarPlusIcon size={16} /> 일정 담기
                    </button>
                )}
            </div>
        </article>
    )
}

export function ExploreDetail() {
    const navigate = useNavigate()
    const { cardId } = useParams()
    const [detail, setDetail] = useState<PublicCardDetail | null>(null)
    const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
    const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
    const [isListOpen, setIsListOpen] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const parsedCardId = Number(cardId)
        if (!Number.isInteger(parsedCardId) || parsedCardId <= 0) {
            Promise.resolve().then(() => {
                setError('잘못된 여행 카드 주소입니다.')
                setIsLoading(false)
            })
            return
        }

        let cancelled = false
        void fetchPublicCardDetail(parsedCardId)
            .then((response) => {
                if (cancelled) return
                setDetail(response)
                setSelectedDayId(
                    response.itinerary[0]
                        ? String(response.itinerary[0].id)
                        : null,
                )
                setError(null)
            })
            .catch((caught: unknown) => {
                if (cancelled) return
                setError(
                    caught instanceof Error
                        ? caught.message
                        : '여행 상세 정보를 불러오지 못했습니다.',
                )
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [cardId])

    const isAllDays = selectedDayId === 'all'
    const selectedDay = isAllDays
        ? null
        : (detail?.itinerary.find(
              (day) => String(day.id) === selectedDayId,
          ) ??
          detail?.itinerary[0] ??
          null)
    const displayedDays = isAllDays
        ? (detail?.itinerary ?? [])
        : selectedDay
          ? [selectedDay]
          : []

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f8fafb] text-brand">
                <LoaderCircleIcon className="animate-spin" size={28} />
            </div>
        )
    }

    if (error || !detail) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-[#f8fafb] px-6 text-center">
                <SearchXIcon size={32} className="text-slate-300" />
                <p className="mt-4 text-sm font-bold text-slate-600">
                    {error ?? '여행 카드를 찾을 수 없습니다.'}
                </p>
                <button
                    type="button"
                    onClick={() => navigate('/app/explore')}
                    className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-extrabold text-white"
                >
                    둘러보기로 돌아가기
                </button>
            </div>
        )
    }

    return (
        <div className="flex min-h-full flex-col bg-[#f8fafb] p-4 sm:p-6 xl:h-full xl:min-h-0 xl:overflow-hidden">
            <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/app/explore')}
                    className="flex items-center gap-1.5 text-sm font-extrabold text-slate-500 transition hover:text-brand-700"
                >
                    <ChevronLeftIcon size={18} />
                    둘러보기
                </button>
                <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
                    공개 여행 일정
                </span>
            </header>

            <main className="relative min-h-[680px] flex-1 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.08)] xl:min-h-0">
                <section
                    className={`mp-scroll absolute inset-y-4 left-4 z-20 w-[min(560px,calc(100%-2rem))] overflow-y-auto rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-[0_22px_55px_rgba(15,23,42,0.18)] backdrop-blur-md transition-transform duration-300 ease-out sm:p-7 ${
                        isListOpen
                            ? 'translate-x-0'
                            : '-translate-x-[120%]'
                    }`}
                    aria-hidden={!isListOpen}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-700">
                                Itinerary detail
                            </p>
                            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
                                {detail.title}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                                {detail.summary ??
                                    '공개된 여행의 날짜별 장소와 이동 경로를 확인해 보세요.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsListOpen(false)}
                            aria-label="일정 목록 접기"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
                        >
                            <PanelLeftCloseIcon size={18} />
                        </button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-2">
                            <MapPinIcon size={14} className="text-brand" />
                            {detail.destination ?? '여행지 미정'}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-2">
                            <CalendarDaysIcon
                                size={14}
                                className="text-brand"
                            />
                            {formatPublicTripDates(
                                detail.startDate,
                                detail.endDate,
                            )}
                        </span>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {detail.itinerary.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedDayId('all')
                                        setFocusedItemId(null)
                                    }}
                                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                                        isAllDays
                                            ? 'bg-brand text-white'
                                            : 'bg-slate-100 text-slate-500 hover:bg-brand-50 hover:text-brand-700'
                                    }`}
                                >
                                    전체 일정
                                </button>
                            )}
                            {detail.itinerary.map((day) => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDayId(String(day.id))
                                        setFocusedItemId(null)
                                    }}
                                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                                        selectedDay?.id === day.id
                                            ? 'bg-brand text-white'
                                            : 'bg-slate-100 text-slate-500 hover:bg-brand-50 hover:text-brand-700'
                                    }`}
                                >
                                    Day {day.dayNumber}
                                </button>
                            ))}
                        </div>

                        {displayedDays.length === 0 ? (
                            <div className="mt-8 rounded-[22px] border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
                                공개된 일정이 없습니다.
                            </div>
                        ) : (
                            <PublicItineraryDays
                                days={displayedDays}
                                focusedItemId={focusedItemId}
                                onFocusItem={setFocusedItemId}
                            />
                        )}
                    </div>
                </section>

                <section className="absolute inset-0 overflow-hidden bg-slate-100">
                    {displayedDays.length > 0 ? (
                        <div className="h-full [&>div]:h-full [&>div]:border-0 [&>div>button]:hidden [&>div>div]:h-full">
                            <KanbanMapPanel
                                days={displayedDays}
                                places={[]}
                                activeDragId={null}
                                previewDayId={null}
                                hoveredItemId={null}
                                onItemHoverChange={() => undefined}
                                focusedItemId={focusedItemId}
                                focusedPlaceId={null}
                                onItemFocus={setFocusedItemId}
                                onPlaceFocus={() => undefined}
                            />
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-slate-400">
                            지도에 표시할 일정 장소가 없습니다.
                        </div>
                    )}
                </section>

                {!isListOpen && (
                    <button
                        type="button"
                        onClick={() => setIsListOpen(true)}
                        aria-label="일정 목록 열기"
                        className="flamingo-gradient flamingo-glow absolute left-5 top-5 z-30 flex h-12 w-12 items-center justify-center rounded-2xl text-white transition hover:scale-105"
                    >
                        <ListIcon size={21} />
                    </button>
                )}
            </main>
        </div>
    )
}

function PublicItineraryDays({
    days,
    focusedItemId,
    onFocusItem,
}: {
    days: PublicCardDetail['itinerary']
    focusedItemId: string | null
    onFocusItem: (itemId: string) => void
}) {
    return (
        <div className="space-y-8">
            {days.map((day) => (
                <section key={day.id}>
                    <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-extrabold text-brand-700">
                                Day {day.dayNumber}
                            </p>
                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                {day.title ?? `${day.itineraryDate} 일정`}
                            </h2>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                            {day.items.length}개 장소
                        </span>
                    </div>

                    {day.items.length === 0 ? (
                        <div className="mt-5 rounded-[22px] bg-slate-50 py-10 text-center text-sm text-slate-400">
                            이 날짜에 저장된 장소가 없습니다.
                        </div>
                    ) : (
                        <ol className="mt-6">
                            {day.items.map((item, index) => (
                                <li
                                    key={item.id}
                                    className="relative flex gap-4 pb-5 last:pb-0"
                                >
                                    <div className="relative flex w-9 shrink-0 justify-center">
                                        {index < day.items.length - 1 && (
                                            <span className="absolute left-1/2 top-8 h-[calc(100%+0.25rem)] -translate-x-1/2 border-l-2 border-dotted border-brand-200" />
                                        )}
                                        <span
                                            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-xs font-black ${
                                                focusedItemId ===
                                                String(item.id)
                                                    ? 'border-brand text-brand'
                                                    : 'border-slate-300 text-slate-500'
                                            }`}
                                        >
                                            {index + 1}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onFocusItem(String(item.id))
                                        }
                                        className={`min-w-0 flex-1 rounded-[18px] border p-4 text-left transition ${
                                            focusedItemId === String(item.id)
                                                ? 'border-brand-200 bg-brand-50'
                                                : 'border-slate-100 bg-white hover:border-brand-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <b className="block truncate text-sm text-slate-900">
                                                    {item.placeName ??
                                                        '장소 미정'}
                                                </b>
                                                <span className="mt-1 block truncate text-xs text-slate-400">
                                                    {item.placeAddress ??
                                                        item.categoryName ??
                                                        '상세 정보 없음'}
                                                </span>
                                            </div>
                                            {item.startTime && (
                                                <time className="shrink-0 text-xs font-extrabold text-brand-700">
                                                    {item.startTime}
                                                </time>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            ))}
        </div>
    )
}

function formatPublicTripDates(
    startDate: string | null,
    endDate: string | null,
) {
    if (!startDate || !endDate) return '날짜 미정'
    return `${startDate.replaceAll('-', '.')} - ${endDate.replaceAll('-', '.')}`
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
