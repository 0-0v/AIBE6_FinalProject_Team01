import { useEffect, useRef, useState } from 'react'
import {
    CircleMinusIcon,
    MessageCircleIcon,
    ScaleIcon,
    Trash2Icon,
    TrophyIcon,
} from 'lucide-react'
import {
    CategoryIcon,
    closedVoteOutcomeForPlace,
    type Place,
    type PlaceCategoryInfo,
} from '@/entities/trip'
import { hexWithAlpha } from '@/shared/lib'
import { Avatar, Select } from '@/shared/ui'
import { useAdderDisplay } from '../model/use-adder-display'

type Props = {
    place: Place
    addedByNickname?: string
    selected: boolean
    canWrite: boolean
    onSelect: () => void
    onDelete: () => void | Promise<void>
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
    onDelete,
    onOpenComments,
    categories,
    categoriesLoading,
    onCategoryChange,
}: Props) {
    const cardRef = useRef<HTMLElement>(null)
    const [changingCategory, setChangingCategory] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const { adderName, adderColor } = useAdderDisplay(place, addedByNickname)
    useEffect(() => {
        if (selected)
            cardRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            })
    }, [selected])
    const voteOutcome = closedVoteOutcomeForPlace(
        place.voteSummary,
        Number(place.id),
    )
    return (
        <article
            ref={cardRef}
            onClick={onSelect}
            className={`cursor-pointer rounded-2xl border bg-white p-3 transition ${selected ? 'border-brand ring-2 ring-brand-100' : 'border-slate-100 hover:border-slate-300'}`}
        >
            <div className="flex gap-3">
                <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl"
                    style={{
                        backgroundColor: hexWithAlpha(
                            place.categoryColor,
                            '18',
                        ),
                        color: place.categoryColor,
                    }}
                >
                    {!canWrite || categories.length === 0 ? (
                        <CategoryIcon icon={place.categoryIcon} size={28} />
                    ) : (
                        <div
                            className="h-full w-full"
                            onClick={(e) => e.stopPropagation()}
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
                                options={categories.map((c) => ({
                                    value: String(c.categoryId),
                                    label: c.name,
                                    leading: (
                                        <CategoryIcon
                                            icon={c.markerIcon}
                                            size={20}
                                        />
                                    ),
                                }))}
                                variant="category-icon"
                            />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-extrabold text-slate-900">
                            {place.name}
                        </h4>
                        {voteOutcome === 'SELECTED' && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-700">
                                <TrophyIcon size={11} /> 투표 선정
                            </span>
                        )}
                        {voteOutcome === 'NOT_SELECTED' && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-600">
                                <CircleMinusIcon size={11} /> 투표 미선정
                            </span>
                        )}
                        {voteOutcome === 'TIE' && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-600">
                                <ScaleIcon size={11} /> 투표 동률
                            </span>
                        )}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-400">
                        {place.address}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2">
                <Avatar name={adderName} color={adderColor} size={20} />
                <span className="text-[11px] text-slate-400">
                    {adderName} 등록
                </span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpenComments()
                    }}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-slate-400"
                >
                    <MessageCircleIcon size={13} />
                    {place.commentCount}
                </button>
                {canWrite && (
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (deleting) return
                            setDeleting(true)
                            void Promise.resolve(onDelete()).finally(() =>
                                setDeleting(false),
                            )
                        }}
                        className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-wait disabled:opacity-40"
                        aria-label="장소 삭제"
                    >
                        <Trash2Icon size={15} />
                    </button>
                )}
            </div>
        </article>
    )
}
