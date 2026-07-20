import React, { useState } from 'react'
import {
    BellIcon,
    BookmarkCheckIcon,
    CopyIcon,
    HeartIcon,
    MapPinIcon,
    SparklesIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const cards = [
    {
        title: '제주 힐링 여행',
        tag: '#제주도 #가족여행',
        image: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
        author: '예린',
        rating: '4.9',
    },
    {
        title: '강릉 카페 순례',
        tag: '#강릉 #카페투어',
        image: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
        author: '민수',
        rating: '4.8',
    },
    {
        title: '부산 야경 한 바퀴',
        tag: '#부산 #야경',
        image: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
        author: '서연',
        rating: '4.7',
    },
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
            <p className="text-xs font-extrabold tracking-[0.12em] text-[#5b32ea]">
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
    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[1240px]">
                <PageHeader
                    eyebrow="DISCOVER"
                    title="둘러보기"
                    description="다른 여행자들의 공개 여행 계획을 발견해 보세요."
                />
                <div className="mt-7 columns-1 gap-5 sm:columns-2 xl:columns-3">
                    {cards.map((card, index) => (
                        <article
                            key={card.title}
                            className="mb-5 break-inside-avoid overflow-hidden rounded-[22px] bg-white shadow-sm"
                        >
                            <div className={index === 1 ? 'h-64' : 'h-48'}>
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
                                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#f4f1ff] py-2.5 text-xs font-extrabold text-[#5b32ea] hover:bg-[#e8e0ff]"
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
            </div>
        </div>
    )
}

export function Saved() {
    const [saved, setSaved] = useState(cards)
    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[1240px]">
                <PageHeader
                    eyebrow="COLLECTION"
                    title="저장됨"
                    description="나중에 참고할 장소와 공개 여행을 모아두었어요."
                />
                <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {saved.length ? (
                        saved.map((card) => (
                            <article
                                key={card.title}
                                className="overflow-hidden rounded-[22px] bg-white shadow-sm"
                            >
                                <img
                                    src={card.image}
                                    alt=""
                                    className="h-40 w-full object-cover"
                                />
                                <div className="p-4">
                                    <div className="flex justify-between gap-3">
                                        <div>
                                            <h2 className="font-extrabold">
                                                {card.title}
                                            </h2>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {card.tag}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setSaved((current) =>
                                                    current.filter(
                                                        (item) =>
                                                            item.title !==
                                                            card.title,
                                                    ),
                                                )
                                            }
                                            className="h-9 w-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100"
                                            aria-label="저장 해제"
                                        >
                                            <HeartIcon
                                                className="mx-auto fill-current"
                                                size={16}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="col-span-full rounded-[22px] bg-white py-24 text-center">
                            <BookmarkCheckIcon
                                className="mx-auto text-[#5b32ea]"
                                size={32}
                            />
                            <p className="mt-3 font-bold text-slate-700">
                                저장한 여행이 없어요
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function Updates() {
    const [read, setRead] = useState<string[]>([])
    const updates: Array<[string, LucideIcon, string, string, string]> = [
        [
            'a',
            SparklesIcon,
            'AI 일정 추천이 완성되었어요',
            '제주도 가족여행 · 2개의 동선 제안을 비교해 보세요.',
            '방금',
        ],
        [
            'b',
            BellIcon,
            '새 장소 투표가 시작됐어요',
            '민수님이 자매국수 후보 장소에 투표를 요청했어요.',
            '12분 전',
        ],
        [
            'c',
            MapPinIcon,
            '새 장소가 등록됐어요',
            '서연님이 카페 델문도를 후보 목록에 추가했어요.',
            '40분 전',
        ],
    ]
    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[860px]">
                <PageHeader
                    eyebrow="ACTIVITY"
                    title="알림"
                    description="여행방의 새 활동과 AI 결과를 확인하세요."
                />
                <div className="mt-7 overflow-hidden rounded-[22px] bg-white shadow-sm">
                    {updates.map(([id, Icon, title, detail, time]) => (
                        <button
                            key={id}
                            onClick={() =>
                                setRead((current) => [...current, id])
                            }
                            className={`flex w-full items-start gap-4 border-b border-slate-100 p-5 text-left last:border-0 hover:bg-slate-50 ${read.includes(id) ? 'opacity-50' : ''}`}
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f1ff] text-[#5b32ea]">
                                <Icon size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex justify-between gap-3">
                                    <b className="text-sm text-slate-800">
                                        {title}
                                    </b>
                                    <small className="shrink-0 text-[11px] text-slate-400">
                                        {time}
                                    </small>
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    {detail}
                                </span>
                            </span>
                            {!read.includes(id) && (
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-[#5b32ea]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
