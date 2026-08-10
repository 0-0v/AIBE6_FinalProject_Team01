type Props = {
    commentCount: number
}

export function MapPinCommentBadge({ commentCount }: Props) {
    return (
        <div
            className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-brand-700 px-1 text-[10px] font-black text-white shadow-md"
            title={`댓글 ${commentCount}개`}
        >
            {commentCount > 9 ? '9+' : commentCount}
        </div>
    )
}
