import React, { useEffect, useMemo, useState } from 'react'
import {
    BellIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CopyIcon,
    SearchIcon,
    SearchXIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
    exploreCards,
    getPlaceVoteNotifications,
    markPlaceVoteNotificationRead,
    rooms,
} from '@/entities/trip'
import type { PlaceVoteNotificationResponse } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'

const PAGE_SIZE = 6

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
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-slate-950">
                {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
        </header>
    )
}

export function Explore() {
    const [copied, setCopied] = useState<string[]>([])
    const [query, setQuery] = useState('')
    const [region, setRegion] = useState('all')
    const [page, setPage] = useState(1)

    const regions = useMemo(
        () => Array.from(new Set(exploreCards.map((card) => card.region))),
        [],
    )

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase()
        return exploreCards.filter((card) => {
            const matchesRegion = region === 'all' || card.region === region
            const matchesKeyword =
                keyword === '' ||
                card.title.toLowerCase().includes(keyword) ||
                card.tag.toLowerCase().includes(keyword) ||
                card.author.toLowerCase().includes(keyword)
            return matchesRegion && matchesKeyword
        })
    }, [query, region])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const pageItems = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    )

    function updateQuery(value: string) {
        setQuery(value)
        setPage(1)
    }

    function updateRegion(value: string) {
        setRegion(value)
        setPage(1)
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[1240px]">
                <PageHeader
                    eyebrow="DISCOVER"
                    title="둘러보기"
                    description="다른 여행자들의 공개 여행 계획을 발견해 보세요."
                />

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex h-11 w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-slate-400 transition-colors focus-within:border-brand-100 sm:max-w-[320px]">
                        <SearchIcon size={16} />
                        <input
                            value={query}
                            onChange={(event) =>
                                updateQuery(event.target.value)
                            }
                            placeholder="제목, 태그, 작성자로 검색"
                            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                        />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => updateRegion('all')}
                            className={`flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-transparent px-4 text-xs font-bold transition ${region === 'all' ? 'bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'}`}
                        >
                            전체
                        </button>
                        {regions.map((item) => (
                            <button
                                key={item}
                                onClick={() => updateRegion(item)}
                                className={`flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-transparent px-4 text-xs font-bold transition ${region === item ? 'bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {pageItems.length === 0 ? (
                    <div className="mt-10 rounded-[22px] bg-white py-24 text-center">
                        <SearchXIcon
                            className="mx-auto text-slate-300"
                            size={32}
                        />
                        <p className="mt-3 font-bold text-slate-700">
                            일치하는 여행이 없어요
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            다른 검색어나 지역으로 찾아보세요.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mt-7 columns-1 gap-5 sm:columns-2 xl:columns-3">
                            {pageItems.map((card, index) => (
                                <article
                                    key={card.title}
                                    className="mb-5 break-inside-avoid overflow-hidden rounded-[22px] bg-white shadow-sm"
                                >
                                    <div
                                        className={
                                            index === 1 ? 'h-64' : 'h-48'
                                        }
                                    >
                                        <img
                                            src={card.image}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h2 className="font-extrabold text-slate-900">
                                                    {card.title}
                                                </h2>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {card.tag}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600">
                                                ★ {card.rating}
                                            </span>
                                        </div>
                                        <p className="mt-4 text-xs text-slate-500">
                                            {card.author}님의 여행방 · 장소 16곳
                                        </p>
                                        <button
                                            onClick={() =>
                                                setCopied((current) => [
                                                    ...current,
                                                    card.title,
                                                ])
                                            }
                                            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2.5 text-xs font-extrabold text-brand-700 hover:bg-brand-100"
                                        >
                                            <CopyIcon size={14} />{' '}
                                            {copied.includes(card.title)
                                                ? '내 여행방으로 복사됨'
                                                : '여행방 복사하기'}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-1.5">
                            <button
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(1, current - 1),
                                    )
                                }
                                disabled={currentPage === 1}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="이전 페이지"
                            >
                                <ChevronLeftIcon size={16} />
                            </button>
                            {Array.from({ length: totalPages }).map(
                                (_, index) => {
                                    const pageNumber = index + 1
                                    return (
                                        <button
                                            key={pageNumber}
                                            onClick={() => setPage(pageNumber)}
                                            aria-current={
                                                currentPage === pageNumber
                                            }
                                            className={`h-9 w-9 rounded-full text-xs font-bold transition ${currentPage === pageNumber ? 'bg-brand text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            {pageNumber}
                                        </button>
                                    )
                                },
                            )}
                            <button
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(totalPages, current + 1),
                                    )
                                }
                                disabled={currentPage === totalPages}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="다음 페이지"
                            >
                                <ChevronRightIcon size={16} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export function Updates() {
    const navigate = useNavigate()
    const [updates, setUpdates] = useState<PlaceVoteNotificationResponse[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const controller = new AbortController()
        getPlaceVoteNotifications(controller.signal)
            .then((notifications) => {
                setUpdates(notifications)
                setError(null)
            })
            .catch((requestError: unknown) => {
                if (controller.signal.aborted) return
                setError(
                    getApiErrorMessage(
                        requestError,
                        '알림을 불러오지 못했습니다.',
                    ),
                )
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
        return () => controller.abort()
    }, [])

    async function openNotification(
        notification: PlaceVoteNotificationResponse,
    ) {
        const targetRoom = rooms.find(
            (room) => room.apiTripId === notification.tripId,
        )
        if (!targetRoom) {
            setError('알림에 연결된 여행방을 찾을 수 없습니다.')
            return
        }
        try {
            if (!notification.read) {
                await markPlaceVoteNotificationRead(notification.notificationId)
                setUpdates((current) =>
                    current.map((item) =>
                        item.notificationId === notification.notificationId
                            ? { ...item, read: true }
                            : item,
                    ),
                )
            }
            navigate(`/app/room/${targetRoom.id}`)
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    '알림 읽음 처리에 실패했습니다.',
                ),
            )
        }
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[860px]">
                <PageHeader
                    eyebrow="ACTIVITY"
                    title="알림"
                    description="여행방의 새 활동과 AI 결과를 확인하세요."
                />
                <div className="mt-7 overflow-hidden rounded-[22px] bg-white shadow-sm">
                    {error && (
                        <p className="p-5 text-sm text-rose-600" role="alert">
                            {error}
                        </p>
                    )}
                    {loading && (
                        <p className="p-8 text-center text-sm text-slate-400">
                            알림을 불러오는 중입니다.
                        </p>
                    )}
                    {!loading && !error && updates.length === 0 && (
                        <p className="p-8 text-center text-sm text-slate-400">
                            새로운 알림이 없습니다.
                        </p>
                    )}
                    {!loading &&
                        updates.map((notification) => (
                            <button
                                key={notification.notificationId}
                                onClick={() =>
                                    void openNotification(notification)
                                }
                                className={`flex w-full items-start gap-4 border-b border-slate-100 p-5 text-left last:border-0 hover:bg-slate-50 ${notification.read ? 'opacity-50' : ''}`}
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <BellIcon size={18} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex justify-between gap-3">
                                        <b className="text-sm text-slate-800">
                                            새 장소 투표가 시작됐어요
                                        </b>
                                        <small className="shrink-0 text-[11px] text-slate-400">
                                            {new Date(
                                                notification.createdAt,
                                            ).toLocaleString('ko-KR')}
                                        </small>
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                        {notification.content}
                                    </span>
                                </span>
                                {!notification.read && (
                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-brand" />
                                )}
                            </button>
                        ))}
                </div>
            </div>
        </div>
    )
}
