import React, { useState } from 'react'
import {
    CheckIcon,
    MessageCircleIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
    Trash2Icon,
} from 'lucide-react'
import {
    CategoryIcon,
    Place,
    type PlaceCategoryInfo,
} from '@/entities/trip'
import { useCurrentUserStore } from '@/shared/model'
import { Avatar, DEFAULT_AVATAR_COLOR } from '@/shared/ui'

type Props = {
    place: Place
    selected: boolean
    canWrite: boolean
    onSelect: () => void
    onStartVote: () => Promise<void>
    onVote: (value: 'up' | 'down') => Promise<void>
    onDelete: () => void
    onOpenComments: () => void
    categories: PlaceCategoryInfo[]
    onCategoryChange: (categoryId: number) => Promise<void>
}

export function PlaceCard({
    place,
    selected,
    canWrite,
    onSelect,
    onStartVote,
    onVote,
    onDelete,
    onOpenComments,
    categories,
    onCategoryChange,
}: Props) {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isMe = place.addedBy === String(currentUser?.id)
    const adderName = isMe ? (currentUser?.nickname ?? '나') : '멤버'
    const adderColor = isMe ? DEFAULT_AVATAR_COLOR : '#94a3b8'
    const vote = place.voteSummary
    const upVotes = vote?.agreeCount ?? 0
    const downVotes = vote?.disagreeCount ?? 0
    const myVote = vote?.myChoice
    const voteClosed = vote?.status === 'CLOSED'
    const voteOpen = vote?.status === 'OPEN'
    const agreeRate = vote?.responseCount
        ? Math.round((vote.agreeCount / vote.responseCount) * 100)
        : 0
    const [submittingVote, setSubmittingVote] = useState(false)
    const [changingCategory, setChangingCategory] = useState(false)

    async function submitVote(action: () => Promise<void>) {
        setSubmittingVote(true)
        try {
            await action()
        } catch {
            // 상위 패널의 공통 오류 영역에서 안내한다.
        } finally {
            setSubmittingVote(false)
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
                        {canWrite ? (
                            <div
                                className="flex shrink-0 items-center rounded-full pl-2 text-white"
                                style={{
                                    backgroundColor: place.categoryColor,
                                }}
                            >
                                <CategoryIcon
                                    icon={place.categoryIcon}
                                    size={12}
                                />
                                <select
                                    aria-label={`${place.name} 카테고리`}
                                    value={place.categoryId ?? ''}
                                    disabled={changingCategory}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) => {
                                        setChangingCategory(true)
                                        void onCategoryChange(
                                            Number(event.target.value),
                                        ).finally(() =>
                                            setChangingCategory(false),
                                        )
                                    }}
                                    className="max-w-32 rounded-full border-0 bg-transparent py-1 pl-1 pr-2 text-[10px] font-bold text-white outline-none disabled:opacity-50"
                                >
                                    {categories.map((category) => (
                                        <option
                                            key={category.categoryId}
                                            value={category.categoryId}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <span
                                className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold text-white"
                                style={{
                                    backgroundColor: place.categoryColor,
                                }}
                            >
                                <CategoryIcon
                                    icon={place.categoryIcon}
                                    size={12}
                                    className="inline-block"
                                />{' '}
                                {place.categoryName}
                            </span>
                        )}
                    </div>
                    {voteOpen ? (
                        <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2 py-1 text-[10px] font-extrabold text-orange-600">
                            투표 진행 중 {vote.responseCount}/
                            {vote.requiredResponseCount}명
                        </span>
                    ) : voteClosed ? (
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-600">
                            투표 종료 · 찬성 {agreeRate}%
                        </span>
                    ) : place.status === 'saved' ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-extrabold text-brand-700">
                            <CheckIcon size={10} /> 지도에 저장됨
                        </span>
                    ) : place.status === 'rejected' ? (
                        <span className="mt-2 inline-flex rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-600">
                            탈락
                        </span>
                    ) : (
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                            투표중
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fffaf0] p-2.5">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">
                        {vote
                            ? `찬성 ${upVotes} · 반대 ${downVotes}`
                            : '투표를 신청해 의견을 모아보세요'}
                    </span>
                </div>
                <button
                    onClick={(event) => {
                        event.stopPropagation()
                        onOpenComments()
                    }}
                    className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-white"
                >
                    <MessageCircleIcon size={13} /> {place.commentCount}
                </button>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-1.5">
                    {!voteOpen ? (
                        <button
                            disabled={!canWrite || submittingVote}
                            onClick={(event) => {
                                event.stopPropagation()
                                void submitVote(onStartVote)
                            }}
                            className="rounded-lg bg-orange-100 px-2.5 py-1.5 text-[11px] font-extrabold text-orange-700 hover:bg-orange-200 disabled:opacity-40"
                        >
                            {submittingVote
                                ? '신청 중'
                                : voteClosed
                                  ? '다시 투표'
                                  : '갈래말래 신청'}
                        </button>
                    ) : (
                        <>
                            <button
                                disabled={!canWrite || submittingVote}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    void submitVote(() => onVote('up'))
                                }}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition disabled:opacity-40 ${myVote === 'AGREE' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500 hover:bg-brand-50 hover:text-brand-700'}`}
                            >
                                <ThumbsUpIcon size={13} /> 찬성 {upVotes}
                            </button>
                            <button
                                disabled={!canWrite || submittingVote}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    void submitVote(() => onVote('down'))
                                }}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition disabled:opacity-40 ${myVote === 'DISAGREE' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'}`}
                            >
                                <ThumbsDownIcon size={13} /> 반대 {downVotes}
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Avatar name={adderName} color={adderColor} size={20} />
                    <span className="text-[11px] text-slate-400">
                        {adderName} 등록
                    </span>
                </div>
                {canWrite && (
                    <div className="flex items-center gap-1">
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
