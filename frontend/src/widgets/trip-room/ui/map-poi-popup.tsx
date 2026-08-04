import { XIcon } from 'lucide-react'
import { CategoryIcon, resolvePlaceCategoryPresentation } from '@/entities/trip'
import type { PlaceSearchResult } from '@/features/search-place'

type Props = {
    loading: boolean
    result: PlaceSearchResult | null
    error: string | null
    isAlreadySaved: boolean
    canWrite: boolean
    saving: boolean
    onSave: () => void
    onClose: () => void
}

export function MapPoiPopup({
    loading,
    result,
    error,
    isAlreadySaved,
    canWrite,
    saving,
    onSave,
    onClose,
}: Props) {
    const presentation = result
        ? resolvePlaceCategoryPresentation(result.recommendedCategoryType)
        : null

    return (
        <div
            className="relative flex w-64 flex-col rounded-xl bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
        >
            {/* 닫기 버튼 */}
            <button
                type="button"
                onClick={onClose}
                className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="닫기"
            >
                <XIcon size={14} />
            </button>

            <div className="p-3 pb-2">
                {loading && (
                    <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
                        불러오는 중…
                    </div>
                )}

                {!loading && error && (
                    <p className="py-2 text-sm text-rose-500">{error}</p>
                )}

                {!loading && !error && result && presentation && (
                    <>
                        {/* 카테고리 배지 */}
                        <span
                            className="mb-1.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                                backgroundColor: `${presentation.color}18`,
                                color: presentation.color,
                            }}
                        >
                            <CategoryIcon
                                icon={presentation.icon}
                                size={9}
                                className="mr-0.5 inline"
                                aria-hidden
                            />
                            {presentation.label}
                        </span>

                        {/* 장소 이름 */}
                        <h3 className="truncate pr-4 text-sm font-extrabold text-slate-900">
                            {result.name}
                        </h3>

                        {/* 별점 */}
                        {result.rating != null && (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                                ★{' '}
                                <span className="font-semibold text-slate-700">
                                    {result.rating.toFixed(1)}
                                </span>
                                {result.userRatingCount != null && (
                                    <span className="ml-0.5">
                                        ({result.userRatingCount.toLocaleString()})
                                    </span>
                                )}
                            </p>
                        )}

                        {/* 주소 */}
                        {result.address && (
                            <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                                {result.address}
                            </p>
                        )}

                        {/* 저장 버튼 영역 */}
                        {canWrite && (
                            <div className="mt-2.5">
                                {isAlreadySaved ? (
                                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand">
                                        이미 저장됨 ✓
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onSave}
                                        disabled={saving}
                                        className="w-full rounded-lg bg-brand py-1.5 text-xs font-bold text-white transition hover:bg-brand/90 disabled:opacity-60"
                                    >
                                        {saving ? '저장 중…' : '저장하기'}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 말풍선 꼬리 */}
            <div className="flex justify-center">
                <div className="h-0 w-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
            </div>
        </div>
    )
}
