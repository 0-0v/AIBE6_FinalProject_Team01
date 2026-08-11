import { MessageCircleIcon } from 'lucide-react'

type Props = {
    commentCount: number
    compact?: boolean
}

export function MapPinCommentBadge({ commentCount, compact = false }: Props) {
    return (
        <div
            className={`group relative flex items-center justify-center rounded-full border-2 border-white bg-brand-700 font-black text-white shadow-md ${
                compact
                    ? 'h-5 min-w-5 gap-0.5 px-1 text-[9px]'
                    : 'h-6 min-w-6 gap-0.5 px-1.5 text-[10px]'
            }`}
            aria-label={`댓글 ${commentCount}개`}
        >
            <MessageCircleIcon size={compact ? 8 : 10} aria-hidden />
            {commentCount > 9 ? '9+' : commentCount}
            <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[9px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
                댓글 {commentCount}개 보기
            </span>
        </div>
    )
}
