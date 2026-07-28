import React from 'react'
import {
    ArrowLeftIcon,
    LockIcon,
    UnlockIcon,
    UserPlusIcon,
    Settings2Icon,
} from 'lucide-react'
import type { TripMember } from '@/features/manage-trip'
import { resolveMediaUrl } from '@/shared/api/client'

type Props = {
    title: string
    subtitle: string
    isPublic: boolean
    canWrite: boolean
    members: TripMember[]
    onInvite: () => void
    onJoin?: () => void
    onBack: () => void
    onManage: () => void
    showBackButton?: boolean
}

export function RoomHeader({
    title,
    subtitle,
    isPublic,
    canWrite,
    members,
    onInvite,
    onJoin,
    onBack,
    onManage,
    showBackButton = true,
}: Props) {
    return (
        <header className="border-b border-slate-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
                {showBackButton && (
                    <button
                        onClick={onBack}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100"
                        aria-label="여행방 목록으로 돌아가기"
                    >
                        <ArrowLeftIcon size={18} />
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="truncate text-base font-extrabold tracking-tight">
                            {title}
                        </h1>
                        <span
                            aria-label={`여행방 공개 상태: ${isPublic ? '공개' : '비공개'}`}
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
                        </span>
                    </div>
                    <p className="truncate text-xs text-slate-400">
                        {subtitle}
                    </p>
                </div>
                {canWrite && <button
                    onClick={onManage}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                    aria-label="여행방 관리"
                >
                    <Settings2Icon size={16} />
                </button>}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${canWrite ? 'border-brand-100 bg-brand-50 text-brand-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                    {canWrite ? '편집 모드' : '조회 전용'}
                </span>

                <div className="flex min-w-0 items-center">
                    <div className="relative z-30 flex -space-x-2" aria-label={`여행방 멤버 ${members.length}명`}>
                        {members.slice(0, 3).map((member) => (
                            <span
                                key={member.memberId}
                                title={`${member.nickname} · ${member.online ? '접속 중' : '오프라인'}`}
                                className={`relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border bg-slate-200 text-[9px] font-extrabold text-slate-600 shadow-sm transition ${
                                    member.online
                                        ? 'z-10 border-slate-300 bg-white'
                                        : 'border-white bg-slate-100 text-slate-300'
                                }`}
                            >
                                {member.profileImageUrl ? (
                                    <img
                                        src={resolveMediaUrl(member.profileImageUrl) ?? undefined}
                                        alt={`${member.nickname} 프로필`}
                                        className={`h-full w-full object-cover ${
                                            member.online
                                                ? ''
                                                : 'opacity-40 grayscale'
                                        }`}
                                    />
                                ) : (
                                    member.nickname.slice(0, 1)
                                )}
                            </span>
                        ))}
                    </div>
                    {canWrite && (
                        <button
                            onClick={onInvite}
                            className="ml-2 flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand px-3 text-xs font-extrabold text-white shadow-sm hover:bg-brand-700"
                        >
                            <UserPlusIcon size={13} /> 일행 초대
                        </button>
                    )}
                    {!canWrite && onJoin && (
                        <button
                            onClick={onJoin}
                            className="ml-2 flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand px-3 text-xs font-extrabold text-white shadow-sm hover:bg-brand-700"
                        >
                            <UserPlusIcon size={13} /> 여행 참여하기
                        </button>
                    )}
                    {members.length > 3 && (
                        <span className="ml-2 whitespace-nowrap text-xs font-bold text-slate-500">
                            +{members.length - 3}명
                        </span>
                    )}
                </div>
            </div>
        </header>
    )
}
