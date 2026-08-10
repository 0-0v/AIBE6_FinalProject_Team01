import React, { useEffect, useRef, useState } from 'react'
import {
    CheckIcon,
    MessageCircleIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
    Trash2Icon,
} from 'lucide-react'
import { CategoryIcon, Place, type PlaceCategoryInfo } from '@/entities/trip'
import { Avatar, Select } from '@/shared/ui'
import { useAdderDisplay } from '../model/use-adder-display'

type Props = {
    place: Place
    addedByNickname?: string
    selected: boolean
    canWrite: boolean
    onSelect: () => void
    onStartVote: () => Promise<void>
    onVote: (value: 'up' | 'down') => Promise<void>
    onDelete: () => void
    onOpenComments: () => void
    categories: PlaceCategoryInfo[]
    categoriesLoading: boolean
    onCategoryChange: (categoryId: number) => Promise<void>
}

export function PlaceCard({
    place,
    addedByNickname,
    selected,
    canWrite,
    onSelect,
    onStartVote,
    onVote,
    onDelete,
    onOpenComments,
    categories,
    categoriesLoading,
    onCategoryChange,
}: Props) {
    const cardRef = useRef<HTMLElement>(null)
    useEffect(() => {
        if (selected) {
            cardRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            })
        }
    }, [selected])

    const { adderName, adderColor } = useAdderDisplay(place, addedByNickname)
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
    const categoryOptions = categories.map((category) => ({
        value: String(category.categoryId),
        label: category.name,
        leading: <CategoryIcon icon={category.markerIcon} size={20} />,
    }))

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
            ref={cardRef}
            onClick={onSelect}
            className={`cursor-pointer rounded-2xl border bg-white p-3 transition ${selected ? 'border-brand ring-2 ring-brand-100' : 'border-slate-100 hover:border-slate-300'}`}
        >
            <div className="flex gap-3">
                <div
                    className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                    style={{
                        backgroundColor: `${place.categoryColor}18`,
                        color: place.categoryColor,
                    }}
                    title={
                        canWrite
                            ? `${place.categoryName} · 눌러서 카테고리 변경`
                            : place.categoryName
                    }
                >
                    {!canWrite || categories.length === 0 ? (
                        <CategoryIcon
                            icon={place.categoryIcon}
                            size={28}
                            strokeWidth={1.8}
                        />
                    ) : (
                        <div
                            className="h-full w-full"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <Select
                                aria-label={`${place.name} 카테고리 변경`}
                                value={String(place.categoryId ?? '')}
                                disabled={changingCategory}
                                loading={changingCategory || categoriesLoading}
                                fallbackLeading={
                                    <CategoryIcon
                                        icon={place.categoryIcon}
                                        size={20}
                                    />
                                }
                                onChange={(value) => {
                                    setChangingCategory(true)
                                    void onCategoryChange(
                                        Number(value),
                                    ).finally(() => setChangingCategory(false))
                                }}
                                className="h-full w-full"
                                menuColumns={2}
                                options={categoryOptions}
                                variant="category-icon"
                            />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0">
                            <h4 className="truncate text-sm font-extrabold text-slate-900">
                                {place.name}
                            </h4>
                            <p className="mt-1 truncate text-[11px] text-slate-400">
                                {place.address}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
                        {voteOpen ? (
                            <span className="inline-flex rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-[11px] font-extrabold text-orange-700">
                                투표 진행 중 {vote.responseCount}/
                                {vote.requiredResponseCount}명
                            </span>
                        ) : voteClosed && place.status === 'rejected' ? (
                            <span className="inline-flex rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-[11px] font-extrabold text-rose-700">
                                투표 종료 · 탈락
                            </span>
                        ) : voteClosed ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                                투표 종료 · 확정 · 찬성 {agreeRate}%
                            </span>
                        ) : place.status === 'saved' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-extrabold text-brand-700">
                                <CheckIcon size={10} /> 투표 전
                            </span>
                        ) : place.status === 'rejected' ? (
                            <span className="inline-flex rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-600">
                                탈락
                            </span>
                        ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                투표중
                            </span>
                        )}
                        {!voteOpen && (
                            <button
                                disabled={!canWrite || submittingVote}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    void submitVote(onStartVote)
                                }}
                                className="shrink-0 rounded-md border border-orange-300 bg-orange-50 px-2 py-1 text-[10px] font-extrabold text-orange-700 transition hover:bg-orange-100 disabled:opacity-40"
                            >
                                {submittingVote
                                    ? '신청 중'
                                    : voteClosed
                                      ? '다시 투표'
                                      : '투표 시작'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {vote && (
                <div className="mt-3 rounded-xl bg-[var(--color-app-warm-surface)] p-2.5">
                    <span className="text-[11px] font-bold text-slate-600">
                        찬성 {upVotes} · 반대 {downVotes}
                    </span>
                </div>
            )}

            <div className="mt-3 border-t border-slate-100 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                    {voteOpen && (
                        <div className="flex w-full items-center gap-2">
                            <>
                                <button
                                    disabled={!canWrite || submittingVote}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        void submitVote(() => onVote('up'))
                                    }}
                                    aria-pressed={myVote === 'AGREE'}
                                    className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold shadow-sm transition disabled:opacity-40 ${myVote === 'AGREE' ? 'border-brand bg-brand text-white' : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                                >
                                    <ThumbsUpIcon size={15} /> 찬성 {upVotes}
                                </button>
                                <button
                                    disabled={!canWrite || submittingVote}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        void submitVote(() => onVote('down'))
                                    }}
                                    aria-pressed={myVote === 'DISAGREE'}
                                    className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold shadow-sm transition disabled:opacity-40 ${myVote === 'DISAGREE' ? 'border-rose-600 bg-rose-600 text-white' : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                                >
                                    <ThumbsDownIcon size={15} /> 반대{' '}
                                    {downVotes}
                                </button>
                            </>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <Avatar name={adderName} color={adderColor} size={20} />
                        <span className="text-[11px] text-slate-400">
                            {adderName} 등록
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            onOpenComments()
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                        aria-label={`${place.name} 댓글 ${place.commentCount}개 보기`}
                    >
                        <MessageCircleIcon size={13} /> {place.commentCount}
                    </button>
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
            </div>
        </article>
    )
}
