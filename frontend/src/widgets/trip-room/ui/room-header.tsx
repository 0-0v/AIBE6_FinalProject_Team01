import React from 'react'
import {
    ArrowLeftIcon,
    EyeIcon,
    LockIcon,
    UnlockIcon,
    UserPlusIcon,
} from 'lucide-react'

type Props = {
    title: string
    subtitle: string
    isPublic: boolean
    isOwner: boolean
    viewerMode: boolean
    onTogglePublic: () => void
    onToggleViewer: () => void
    onInvite: () => void
    onBack: () => void
}

export function RoomHeader({
    title,
    subtitle,
    isPublic,
    isOwner,
    viewerMode,
    onTogglePublic,
    onToggleViewer,
    onInvite,
    onBack,
}: Props) {
    return (
        <header className="border-b border-slate-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100"
                    aria-label="여행방 목록으로 돌아가기"
                >
                    <ArrowLeftIcon size={18} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="truncate text-base font-extrabold tracking-tight">
                            {title}
                        </h1>
                        {isOwner && (
                            <button
                                onClick={onTogglePublic}
                                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                                    isPublic
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                                {isPublic ? (
                                    <UnlockIcon size={11} />
                                ) : (
                                    <LockIcon size={11} />
                                )}
                                {isPublic ? '공개' : '비공개'}
                            </button>
                        )}
                    </div>
                    <p className="truncate text-xs text-slate-400">
                        {subtitle}
                    </p>
                </div>
                <button
                    onClick={onInvite}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                    <UserPlusIcon size={15} /> 초대
                </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
                {/* viewer-mode demo toggle */}
                <button
                    onClick={onToggleViewer}
                    title="비로그인/조회 전용 미리보기"
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        viewerMode
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <EyeIcon size={14} />{' '}
                    {viewerMode ? '조회 전용' : '편집 모드'}
                </button>

                <span className="text-xs font-semibold text-slate-400">
                    멤버 정보 준비 중
                </span>
            </div>
        </header>
    )
}
