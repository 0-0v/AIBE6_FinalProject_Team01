import React, { useState } from 'react'
import {
    ArrowLeftIcon,
    CalendarDaysIcon,
    LockIcon,
    MapPinIcon,
    UnlockIcon,
    UserPlusIcon,
    Settings2Icon,
    LocateFixedIcon,
    PencilLineIcon,
} from 'lucide-react'
import type { TripMember } from '@/features/manage-trip'
import type { ActiveTripAwareness } from '@/features/trip-awareness'
import { resolveMediaUrl } from '@/shared/api/client'

type Props = {
    title: string
    location: string
    date: string
    isPublic: boolean
    isCompleted: boolean
    canWrite: boolean
    members: TripMember[]
    currentMemberId?: number | null
    awarenessByMemberId?: Record<number, ActiveTripAwareness>
    onFollowMember?: (awareness: ActiveTripAwareness) => void
    onInvite: () => void
    onJoin?: () => void
    onBack: () => void
    onManage: () => void
    onVisibilityManage: () => void
    showBackButton?: boolean
}

export function RoomHeader({
    title,
    location,
    date,
    isPublic,
    isCompleted,
    canWrite,
    members,
    currentMemberId = null,
    awarenessByMemberId = {},
    onFollowMember,
    onInvite,
    onJoin,
    onBack,
    onManage,
    onVisibilityManage,
    showBackButton = true,
}: Props) {
    const [showHiddenMembers, setShowHiddenMembers] = useState(false)
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(
        null,
    )
    const visibleMembers = members.slice(0, 4)
    const hiddenMembers = members.slice(4)
    const selectedMember = members.find(
        (member) => member.memberId === selectedMemberId,
    )
    const selectedAwareness =
        selectedMemberId == null
            ? undefined
            : awarenessByMemberId[selectedMemberId]

    const selectMember = (memberId: number) => {
        setShowHiddenMembers(false)
        setSelectedMemberId((current) =>
            current === memberId ? null : memberId,
        )
    }

    return (
        <header className="bg-slate-50 px-10 py-7">
            <div className="flex flex-wrap items-center gap-3">
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
                    <div className="border-l-4 border-[var(--color-app-navy)] py-1 pl-4">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate text-2xl font-extrabold tracking-tight">
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
                            {canWrite && isCompleted && (
                                <button
                                    type="button"
                                    onClick={onVisibilityManage}
                                    className="flex shrink-0 items-center gap-1 rounded-full border border-brand-100 bg-white px-2.5 py-1 text-[11px] font-extrabold text-brand-700 shadow-sm transition hover:bg-brand-50"
                                >
                                    <Settings2Icon size={11} />
                                    공개 설정
                                </button>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-[0_4px_12px_rgb(var(--rgb-app-ink)/0.08)]">
                                <MapPinIcon size={12} />
                                {location}
                            </span>
                            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-[0_4px_12px_rgb(var(--rgb-app-ink)/0.08)]">
                                <CalendarDaysIcon size={12} />
                                {date}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    {canWrite ? (
                        <span className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 shadow-[0_4px_12px_rgb(var(--rgb-brand-soft)/0.12)]">
                            편집 모드
                        </span>
                    ) : (
                        <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">
                            게스트 모드
                        </span>
                    )}
                    <div className="relative flex min-w-0 items-center">
                        <div
                            className="relative z-30 flex -space-x-2"
                            aria-label={`여행방 멤버 ${members.length}명`}
                        >
                            {visibleMembers.map((member) => (
                                <MemberProfileAvatar
                                    key={member.memberId}
                                    member={member}
                                    awareness={
                                        awarenessByMemberId[member.memberId]
                                    }
                                    selected={
                                        selectedMemberId === member.memberId
                                    }
                                    onClick={() =>
                                        selectMember(member.memberId)
                                    }
                                />
                            ))}
                        </div>
                        {hiddenMembers.length > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowHiddenMembers((visible) => {
                                        setSelectedMemberId(null)
                                        return !visible
                                    })
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
                                                awareness={
                                                    awarenessByMemberId[
                                                        member.memberId
                                                    ]
                                                }
                                                onClick={() =>
                                                    selectMember(
                                                        member.memberId,
                                                    )
                                                }
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
                        {selectedMember && (
                            <MemberAwarenessPopover
                                member={selectedMember}
                                awareness={selectedAwareness}
                                isCurrentMember={
                                    selectedMember.memberId === currentMemberId
                                }
                                onClose={() => setSelectedMemberId(null)}
                                onFollow={
                                    selectedAwareness && onFollowMember
                                        ? () => {
                                              onFollowMember(selectedAwareness)
                                              setSelectedMemberId(null)
                                          }
                                        : undefined
                                }
                            />
                        )}
                    </div>
                    {canWrite && (
                        <button
                            onClick={onManage}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            aria-label="여행방 관리"
                        >
                            <Settings2Icon size={16} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    )
}

function MemberProfileAvatar({
    member,
    overlap = true,
    awareness,
    selected = false,
    onClick,
}: {
    member: TripMember
    overlap?: boolean
    awareness?: ActiveTripAwareness
    selected?: boolean
    onClick: () => void
}) {
    const status = describeAwareness(awareness)
    return (
        <button
            type="button"
            onClick={onClick}
            title={`${member.nickname} · ${status ?? (member.online ? '접속 중' : '오프라인')}`}
            aria-label={`${member.nickname} ${status ?? (member.online ? '접속 중' : '오프라인')} 확인`}
            className={`relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border bg-slate-200 text-[9px] font-extrabold text-slate-600 shadow-sm transition ${
                member.online
                    ? 'z-10 border-slate-300 bg-white'
                    : 'border-white bg-slate-100 text-slate-300'
            } ${awareness ? 'ring-2 ring-emerald-300 ring-offset-1' : ''} ${
                selected ? 'z-20 ring-2 ring-brand ring-offset-1' : ''
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
            {awareness && (
                <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-white bg-emerald-400" />
            )}
        </button>
    )
}

function MemberAwarenessPopover({
    member,
    awareness,
    isCurrentMember,
    onClose,
    onFollow,
}: {
    member: TripMember
    awareness?: ActiveTripAwareness
    isCurrentMember: boolean
    onClose: () => void
    onFollow?: () => void
}) {
    const status = describeAwareness(awareness)
    const canFollow =
        awareness != null &&
        (awareness.selectedPlaceId != null ||
            awareness.selectedDay != null ||
            (awareness.mapLat != null && awareness.mapLng != null))

    return (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="flex items-start gap-2.5">
                <MemberProfileAvatar
                    member={member}
                    overlap={false}
                    awareness={awareness}
                    onClick={onClose}
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-800">
                        {member.nickname}
                        {isCurrentMember && (
                            <span className="ml-1 text-[10px] text-brand">
                                나
                            </span>
                        )}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        {awareness?.editingLabel ? (
                            <PencilLineIcon size={12} className="text-brand" />
                        ) : (
                            <LocateFixedIcon size={12} />
                        )}
                        <span className="truncate">
                            {status ?? (member.online ? '접속 중' : '오프라인')}
                        </span>
                    </p>
                </div>
            </div>
            {!isCurrentMember && canFollow && onFollow && (
                <button
                    type="button"
                    onClick={onFollow}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 text-xs font-extrabold text-brand-700 transition hover:bg-brand-100"
                >
                    <LocateFixedIcon size={14} /> 보고 있는 곳으로 이동
                </button>
            )}
        </div>
    )
}

function describeAwareness(awareness?: ActiveTripAwareness) {
    if (!awareness) return null
    if (awareness.editingLabel) return awareness.editingLabel
    if (awareness.selectedPlaceName) {
        return `${awareness.selectedPlaceName} 보는 중`
    }
    if (awareness.selectedDay != null) {
        return `Day ${awareness.selectedDay} 일정 보는 중`
    }
    return {
        places: '장소 살펴보는 중',
        itinerary: '날짜 확인 중',
        schedule: '일정 확인 중',
        record: '기록 확인 중',
    }[awareness.workspace === 'votes' ? 'places' : awareness.workspace]
}
