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
    SearchIcon,
    SearchXIcon,
    PanelLeftCloseIcon,
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
]

const TRAVEL_STYLE_LABELS: Record<string, string> = {
    ACTIVITY: '액티비티',
    SNS_HOT_PLACE: 'SNS 핫플레이스',
    NATURE: '자연과 함께',
    FAMOUS_ATTRACTIONS: '유명관광지 필수',
    RELAXATION: '여유롭게 힐링',
    CULTURE_ART_HISTORY: '문화/예술/역사',
    SHOPPING: '쇼핑',
    FOOD: '맛집 먹거리',
}

const TRAVEL_STYLE_FILTERS = Object.entries(TRAVEL_STYLE_LABELS).map(
    ([value, label]) => ({ value, label }),
)

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
    const [selectedTravelStyle, setSelectedTravelStyle] = useState<
        string | null
    >(null)
    const [page, setPage] = useState(0)
    const [copyCard, setCopyCard] = useState<PublicCard | null>(null)
    const data = useExploreCardStore((state) => state.data)
    const isLoading = useExploreCardStore((state) => state.isLoading)
    const error = useExploreCardStore((state) => state.error)
    const loadCards = useExploreCardStore((state) => state.loadCards)
    const toggleBookmark = useExploreCardStore((state) => state.toggleBookmark)

    useEffect(() => {
        void loadCards(page, sort, submittedQuery, selectedTravelStyle)
    }, [loadCards, page, selectedTravelStyle, sort, submittedQuery])

    useEffect(() => {
        const handleRealtimeChange = (event: Event) => {
            const detail = (event as CustomEvent<RealtimeEvent>).detail
            if (detail.type !== 'PUBLIC_CARD_CHANGED') return
            void loadCards(page, sort, submittedQuery, selectedTravelStyle)
        }
        window.addEventListener(REALTIME_EVENT_NAME, handleRealtimeChange)
        return () =>
            window.removeEventListener(
                REALTIME_EVENT_NAME,
                handleRealtimeChange,
            )
    }, [loadCards, page, selectedTravelStyle, sort, submittedQuery])

    function search(event: FormEvent) {
        event.preventDefault()
        setPage(0)
        setSubmittedQuery(query.trim())
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
            <div className="mx-auto max-w-[1500px]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <PageHeader
                        eyebrow="DISCOVER"
                        title="둘러보기"
                        description="다른 여행자들이 공개한 완료 여행 카드를 둘러보세요."
                    />
                    <form
                        onSubmit={search}
                        className="flex min-h-11 w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm sm:rounded-full sm:px-4 lg:max-w-md"
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
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div
                        className="flex min-w-0 gap-2 overflow-x-auto pb-1"
                        aria-label="여행 스타일 필터"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedTravelStyle(null)
                                setPage(0)
                            }}
                            aria-pressed={selectedTravelStyle === null}
                            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                                selectedTravelStyle === null
                                    ? 'bg-[#213C51] text-white shadow-sm'
                                    : 'border border-slate-200 bg-white text-[#213C51] hover:border-[#213C51]/40'
                            }`}
                        >
                            전체
                        </button>
                        {TRAVEL_STYLE_FILTERS.map((style) => (
                            <button
                                key={style.value}
                                type="button"
                                onClick={() => {
                                    setSelectedTravelStyle(style.value)
                                    setPage(0)
                                }}
                                aria-pressed={
                                    selectedTravelStyle === style.value
                                }
                                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                                    selectedTravelStyle === style.value
                                        ? 'bg-[#213C51] text-white shadow-sm'
                                        : 'border border-slate-200 bg-white text-[#213C51] hover:border-[#213C51]/40'
                                }`}
                            >
                                #{style.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex w-fit shrink-0 rounded-[18px] bg-slate-100 p-1.5">
                        {SORTS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                    setSort(item.value)
                                    setPage(0)
                                }}
                                aria-pressed={sort === item.value}
                                className={`shrink-0 whitespace-nowrap rounded-[14px] px-5 py-2.5 text-sm font-extrabold transition-colors ${
                                    sort === item.value
                                        ? 'bg-brand text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
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
                            {selectedTravelStyle
                                ? '이 스타일로 공개된 여행이 아직 없어요.'
                                : '공개된 여행 카드가 없습니다.'}
                        </p>
                    </div>
                )}

                <div className="mt-5 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                    {data?.content.map((card) => (
                        <TravelCard
                            key={card.id}
                            card={card}
                            onBookmark={() => void toggleBookmark(card.id)}
                            onCopy={() => setCopyCard(card)}
                            onOpen={() => navigate(`/app/explore/${card.id}`)}
                        />
                    ))}
                </div>

                {(data?.totalPages ?? 0) > 1 && (
                    <nav
                        aria-label="둘러보기 페이지"
                        className="mt-4 flex shrink-0 flex-wrap justify-center gap-2 pb-1"
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
    onCopy,
    onOpen,
}: {
    card: PublicCard
    onBookmark: () => void
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
            className="flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_8px_24px_rgba(33,60,81,0.10)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(33,60,81,0.16)]"
        >
            <div className="relative shrink-0">
                <img
                    src={
                        resolveMediaUrl(card.coverImageUrl) ??
                        '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg'
                    }
                    alt={`${card.title} 대표 이미지`}
                    className="aspect-[4/3] w-full rounded-[22px] object-cover"
                />
                {card.ownCard && (
                    <span
                        title="내가 참여한 여행 카드"
                        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-[11px] font-black tracking-[0.08em] text-white shadow-[0_6px_16px_rgba(33,60,81,0.28)]"
                    >
                        <BadgeCheckIcon size={14} />
                        MY
                    </span>
                )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-4">
                <div className="min-w-0">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-extrabold tracking-[-0.03em] text-slate-900">
                            {card.title}
                        </h2>
                        <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-slate-500">
                            <MapPinIcon
                                size={13}
                                className="shrink-0 text-brand"
                            />
                            <span className="truncate">
                                {card.destination ?? '여행지 미정'}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="mt-3 flex max-h-6 min-h-6 flex-wrap gap-1 overflow-hidden">
                    {card.travelStyles.map((style) => (
                        <span
                            key={style}
                            className="max-w-full truncate rounded-full bg-[#213C51]/10 px-2 py-1 text-[11px] font-bold text-[#213C51]"
                        >
                            #{TRAVEL_STYLE_LABELS[style] ?? style}
                        </span>
                    ))}
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
                <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-xs">
                    <button
                        type="button"
                        disabled={card.ownCard}
                        onClick={(event) => {
                            event.stopPropagation()
                            onBookmark()
                        }}
                        className="flex items-center gap-1.5 font-extrabold text-brand-700 disabled:cursor-default"
                        aria-label={
                            card.ownCard
                                ? `여행자 PICK ${card.bookmarkCount}개`
                                : card.bookmarked
                                  ? '여행자 PICK 취소'
                                  : '여행자 PICK'
                        }
                    >
                        <BookmarkIcon
                            size={15}
                            fill={card.bookmarked ? 'currentColor' : 'none'}
                        />
                        여행자 PICK {card.bookmarkCount}
                    </button>
                    {!card.ownCard && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onCopy()
                            }}
                            className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-3.5 py-2 font-extrabold text-white transition hover:bg-brand-700"
                        >
                            <CalendarPlusIcon size={15} /> 일정 담기
                        </button>
                    )}
                </div>
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
        : (detail?.itinerary.find((day) => String(day.id) === selectedDayId) ??
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

    if (detail.visibility === 'PUBLIC_RECORD') {
        return (
            <PublicRecordDetail
                detail={detail}
                selectedDayId={selectedDayId}
                onSelectDay={setSelectedDayId}
                onBack={() => navigate('/app/explore')}
            />
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
                        isListOpen ? 'translate-x-0' : '-translate-x-[120%]'
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

function PublicRecordDetail({
    detail,
    selectedDayId,
    onSelectDay,
    onBack,
}: {
    detail: PublicCardDetail
    selectedDayId: string | null
    onSelectDay: (dayId: string) => void
    onBack: () => void
}) {
    const [isPanelOpen, setIsPanelOpen] = useState(true)
    const selectedDay =
        detail.itinerary.find((day) => String(day.id) === selectedDayId) ??
        detail.itinerary[0] ??
        null
    const selectedTripPlaceIds = new Set(
        selectedDay?.items
            .map((item) => item.tripPlaceId)
            .filter((id): id is string => Boolean(id)) ?? [],
    )
    const records = selectedDay
        ? detail.records.filter((record) => {
              if (record.tripPlaceId !== null) {
                  return selectedTripPlaceIds.has(String(record.tripPlaceId))
              }
              return record.visitedAt.slice(0, 10) === selectedDay.itineraryDate
          })
        : detail.records
    const displayedDays = selectedDay ? [selectedDay] : []
    const photoCount = detail.records.reduce(
        (total, record) => total + record.imageUrls.length,
        0,
    )
    const authorNickname = detail.records[0]?.recordedByNickname ?? '여행자'
    const coverImageUrl = resolveMediaUrl(detail.coverImageUrl)

    return (
        <div className="flex min-h-full flex-col bg-[#f8fafb] p-4 sm:p-6 xl:h-full xl:min-h-0 xl:overflow-hidden">
            <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm font-extrabold text-slate-500 transition hover:text-brand-700"
                >
                    <ChevronLeftIcon size={18} />
                    둘러보기
                </button>
                <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
                    공개 여행 기록
                </span>
            </header>

            <main className="relative min-h-[680px] flex-1 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.08)] xl:min-h-0">
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
                                focusedItemId={null}
                                focusedPlaceId={null}
                                onItemFocus={() => undefined}
                                onPlaceFocus={() => undefined}
                            />
                        </div>
                    ) : (
                        <div className="h-full bg-gradient-to-br from-sky-50 to-stone-100" />
                    )}
                </section>

                <section
                    className={`mp-scroll absolute inset-y-4 left-4 z-20 w-[min(560px,calc(100%-2rem))] overflow-y-auto rounded-[26px] border border-white/70 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] transition-transform duration-300 ease-out ${
                        isPanelOpen ? 'translate-x-0' : '-translate-x-[120%]'
                    }`}
                    aria-hidden={!isPanelOpen}
                >
                    <div
                        className="relative min-h-48 overflow-hidden bg-slate-200 bg-cover bg-center"
                        style={
                            coverImageUrl
                                ? { backgroundImage: `url(${coverImageUrl})` }
                                : undefined
                        }
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-900/25 to-slate-950/65" />
                        <div className="absolute left-5 top-5 flex items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-brand-700 shadow-sm">
                                TRAVEL LOG
                            </span>
                            <span className="rounded-full bg-slate-900/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                                사진 {photoCount} · 후기 {detail.records.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsPanelOpen(false)}
                            aria-label="여행 기록 접기"
                            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-slate-500 shadow-sm transition hover:text-brand-700"
                        >
                            <PanelLeftCloseIcon size={18} />
                        </button>
                        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-white">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-sm font-black text-slate-600">
                                    {authorNickname.slice(0, 1)}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black">
                                        {authorNickname}님의 여행기
                                    </p>
                                    <p className="mt-0.5 text-xs text-white/80">
                                        {formatPublicTripDates(
                                            detail.startDate,
                                            detail.endDate,
                                        )}{' '}
                                        공개
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white px-5 pb-8 pt-6 sm:px-7">
                        <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
                            {detail.title}
                        </h1>
                        {detail.summary && (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {detail.summary}
                            </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
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

                        <div className="mt-5 flex gap-2 overflow-x-auto border-b border-slate-100 pb-5">
                            {detail.itinerary.map((day) => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => onSelectDay(String(day.id))}
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

                        <div className="mt-5 flex items-end justify-between gap-3">
                            <h2 className="text-xl font-black text-slate-900">
                                Day {selectedDay?.dayNumber ?? 1}
                                <span className="mx-3 text-slate-200">|</span>
                                <span className="text-base text-slate-400">
                                    {selectedDay?.itineraryDate ?? '날짜 미정'}
                                </span>
                            </h2>
                            <span className="text-xs font-bold text-slate-400">
                                {records.length}개 기록
                            </span>
                        </div>

                        {records.length === 0 ? (
                            <div className="mt-6 rounded-[22px] border border-dashed border-slate-200 py-20 text-center text-sm font-semibold text-slate-400">
                                이 날짜에 공개된 기록이 없습니다.
                            </div>
                        ) : (
                            <ol className="mt-6 space-y-7">
                                {records.map((record, index) => (
                                    <li
                                        key={record.id}
                                        className="relative pl-10"
                                    >
                                        <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                                            {index + 1}
                                        </span>
                                        {index < records.length - 1 && (
                                            <span className="absolute bottom-[-1.75rem] left-[15px] top-9 border-l-2 border-dotted border-brand-100" />
                                        )}
                                        <article className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg font-black text-slate-900">
                                                            {record.placeName}
                                                        </h3>
                                                        {record.categoryName && (
                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                                                                {
                                                                    record.categoryName
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                                        {[
                                                            record.categoryName,
                                                            record.address,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">
                                                    {record.recordedByNickname}
                                                </span>
                                            </div>
                                            {record.memo && (
                                                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                                    {record.memo}
                                                </p>
                                            )}
                                            <RecordPhotoGrid
                                                imageUrls={record.imageUrls}
                                                placeName={record.placeName}
                                            />
                                        </article>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </section>

                {!isPanelOpen && (
                    <button
                        type="button"
                        onClick={() => setIsPanelOpen(true)}
                        aria-label="여행 기록 열기"
                        className="flamingo-gradient flamingo-glow absolute left-5 top-5 z-30 flex h-12 w-12 items-center justify-center rounded-2xl text-white transition hover:scale-105"
                    >
                        <ListIcon size={21} />
                    </button>
                )}
            </main>
        </div>
    )
}

function RecordPhotoGrid({
    imageUrls,
    placeName,
}: {
    imageUrls: string[]
    placeName: string
}) {
    if (imageUrls.length === 0) return null

    const visibleImages = imageUrls.slice(0, 3)
    const remainingCount = imageUrls.length - visibleImages.length

    if (visibleImages.length === 1) {
        return (
            <img
                src={resolveMediaUrl(visibleImages[0]) ?? undefined}
                alt={`${placeName} 여행 사진`}
                className="mt-5 max-h-[520px] w-full rounded-[20px] object-cover"
            />
        )
    }

    if (visibleImages.length === 2) {
        return (
            <div className="mt-5 grid h-[320px] grid-cols-2 gap-2 overflow-hidden rounded-[20px]">
                {visibleImages.map((imageUrl, index) => (
                    <img
                        key={`${imageUrl}-${index}`}
                        src={resolveMediaUrl(imageUrl) ?? undefined}
                        alt={`${placeName} 여행 사진 ${index + 1}`}
                        className="h-full w-full object-cover"
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="mt-5 grid h-[360px] grid-cols-[2fr_1fr] grid-rows-2 gap-2 overflow-hidden rounded-[20px]">
            <img
                src={resolveMediaUrl(visibleImages[0]) ?? undefined}
                alt={`${placeName} 여행 사진 1`}
                className="row-span-2 h-full w-full object-cover"
            />
            {visibleImages.slice(1).map((imageUrl, index) => {
                const showMore = index === 1 && remainingCount > 0
                return (
                    <div
                        key={`${imageUrl}-${index}`}
                        className="relative min-h-0 overflow-hidden"
                    >
                        <img
                            src={resolveMediaUrl(imageUrl) ?? undefined}
                            alt={`${placeName} 여행 사진 ${index + 2}`}
                            className="h-full w-full object-cover"
                        />
                        {showMore && (
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-xl font-black text-white">
                                +{remainingCount}
                            </span>
                        )}
                    </div>
                )
            })}
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
    onFocusItem: (itemId: string | null) => void
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
                                            onFocusItem(
                                                focusedItemId ===
                                                    String(item.id)
                                                    ? null
                                                    : String(item.id),
                                            )
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

function ItineraryCopyFlow({
    card,
    onClose,
}: {
    card: PublicCard
    onClose: () => void
}) {
    const navigate = useNavigate()
    const [step, setStep] = useState<
        'confirm' | 'select' | 'conflict' | 'success'
    >('confirm')
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
                                    장소와 일정만 담으며 기록·사진·비용·개인
                                    메모는 제외됩니다.
                                </p>
                                {copyError && <CopyError text={copyError} />}
                                <div className="mt-7 grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-xl bg-slate-100 py-3 font-bold text-slate-500"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => void openTargets()}
                                        className="rounded-xl bg-brand py-3 font-extrabold text-white disabled:opacity-50"
                                    >
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
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(true)}
                                    className="mt-6 rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white"
                                >
                                    새 여행 만들어 담기
                                </button>
                                <h3 className="mt-8 text-sm font-extrabold">
                                    나의 다가오는 여행
                                </h3>
                                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                                    {targets.map((target) => (
                                        <button
                                            key={target.tripId}
                                            type="button"
                                            disabled={loading}
                                            onClick={() => choose(target)}
                                            className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left hover:bg-brand-50"
                                        >
                                            <img
                                                src={
                                                    resolveMediaUrl(
                                                        target.coverImageUrl,
                                                    ) ??
                                                    '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg'
                                                }
                                                alt=""
                                                className="h-14 w-14 rounded-full object-cover"
                                            />
                                            <span className="min-w-0">
                                                <strong className="block truncate">
                                                    {target.title}
                                                </strong>
                                                <span className="text-xs text-slate-500">
                                                    {target.startDate} ~{' '}
                                                    {target.endDate}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                    {targets.length === 0 && (
                                        <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                                            날짜가 정해진 예정 여행이 없습니다.
                                        </p>
                                    )}
                                </div>
                                {copyError && <CopyError text={copyError} />}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-5 w-full rounded-xl border py-3 text-sm font-bold"
                                >
                                    취소
                                </button>
                            </>
                        )}
                        {step === 'conflict' && selected && (
                            <>
                                <h2 className="text-xl font-black">
                                    이미 담아 놓은 일정이 있어요
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    기존 일정과 장소를 삭제하고 담거나, 중복되지
                                    않는 장소를 기존 일정 뒤에 추가할 수
                                    있습니다.
                                </p>
                                {copyError && <CopyError text={copyError} />}
                                <div className="mt-6 grid gap-2">
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() =>
                                            void copy(
                                                selected.tripId,
                                                'REPLACE',
                                            )
                                        }
                                        className="rounded-xl bg-red-600 py-3 text-sm font-extrabold text-white"
                                    >
                                        삭제하고 담기
                                    </button>
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() =>
                                            void copy(selected.tripId, 'APPEND')
                                        }
                                        className="rounded-xl bg-brand py-3 text-sm font-extrabold text-white"
                                    >
                                        추가해서 담기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep('select')}
                                        className="py-2 text-sm font-bold text-slate-500"
                                    >
                                        다시 선택
                                    </button>
                                </div>
                            </>
                        )}
                        {step === 'success' && copiedTripId && (
                            <>
                                <h2 className="text-center text-2xl font-black">
                                    일정을 담았습니다
                                </h2>
                                <p className="mt-3 text-center text-sm text-slate-500">
                                    대상 여행방에서 담은 장소와 일정을 확인해
                                    보세요.
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(`/app/room/${copiedTripId}`)
                                    }
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
