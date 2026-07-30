import React, { useState } from 'react'
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
    const [showHiddenMembers, setShowHiddenMembers] = useState(false)
    const visibleMembers = members.slice(0, 4)
    const hiddenMembers = members.slice(4)

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

                <div className="relative flex min-w-0 items-center">
                    <div
                        className="relative z-30 flex -space-x-2"
                        aria-label={`여행방 멤버 ${members.length}명`}
                    >
                        {visibleMembers.map((member) => (
                            <MemberProfileAvatar
                                key={member.memberId}
                                member={member}
                            />
                        ))}
                    </div>
                    {hiddenMembers.length > 0 && (
                        <button
                            type="button"
                            onClick={() =>
                                setShowHiddenMembers((visible) => !visible)
                            }
                            aria-expanded={showHiddenMembers}
                            aria-label={`숨겨진 여행방 멤버 ${hiddenMembers.length}명 ${showHiddenMembers ? '닫기' : '보기'}`}
                            className="ml-2 whitespace-nowrap rounded-full px-1 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-brand-700"
                        >
                            +{hiddenMembers.length}명
                        </button>
                    )}
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
                    {showHiddenMembers && hiddenMembers.length > 0 && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                            <p className="mb-2 text-[11px] font-extrabold text-slate-500">
                                추가 멤버 {hiddenMembers.length}명
                            </p>
                            <div className="space-y-2">
                                {hiddenMembers.map((member) => (
                                    <div
                                        key={member.memberId}
                                        className="flex items-center gap-2"
                                    >
                                        <MemberProfileAvatar
                                            member={member}
                                            overlap={false}
                                        />
                                        <span
                                            className={`min-w-0 flex-1 truncate text-xs font-bold ${
                                                member.online
                                                    ? 'text-slate-700'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            {member.nickname}
                                        </span>
                                        <span
                                            className={`h-2 w-2 shrink-0 rounded-full ${
                                                member.online
                                                    ? 'bg-emerald-400'
                                                    : 'bg-slate-200'
                                            }`}
                                            aria-label={
                                                member.online
                                                    ? '접속 중'
                                                    : '오프라인'
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

function MemberProfileAvatar({
    member,
    overlap = true,
}: {
    member: TripMember
    overlap?: boolean
}) {
    return (
        <span
            title={`${member.nickname} · ${member.online ? '접속 중' : '오프라인'}`}
            className={`relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border bg-slate-200 text-[9px] font-extrabold text-slate-600 shadow-sm transition ${
                member.online
                    ? 'z-10 border-slate-300 bg-white'
                    : 'border-white bg-slate-100 text-slate-300'
            } ${overlap ? '' : 'shrink-0'}`}
        >
            {member.profileImageUrl ? (
                <img
                    src={resolveMediaUrl(member.profileImageUrl) ?? undefined}
                    alt={`${member.nickname} 프로필`}
                    className={`h-full w-full object-cover ${
                        member.online ? '' : 'opacity-40 grayscale'
                    }`}
                />
            ) : (
                member.nickname.slice(0, 1)
            )}
        </span>
    )
}
