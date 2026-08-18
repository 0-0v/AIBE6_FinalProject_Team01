import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    BellIcon,
    CameraIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CompassIcon,
    HomeIcon,
    LogOutIcon,
    MapIcon,
    BookmarkIcon,
    NotebookTabsIcon,
    ShieldCheckIcon,
} from 'lucide-react'
import { useTripStore } from '@/features/manage-trip'
import { useNotificationStore } from '@/features/manage-notification'
import { logout, resolveMediaUrl } from '@/shared/api/client'
import { Avatar, BrandLogo, DEFAULT_AVATAR_COLOR } from '@/shared/ui'
import { useCurrentUserStore } from '@/shared/model'

const nav = [
    { to: '/app', label: '대시보드', icon: HomeIcon, end: true },
    { to: '/app/room', label: '여행방', icon: MapIcon },
    { to: '/app/explore', label: '둘러보기', icon: CompassIcon },
    { to: '/app/updates', label: '알림', icon: BellIcon },
]

export function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isExpanded, setIsExpanded] = useState(true)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const currentUserId = currentUser?.id ?? null
    const rooms = useTripStore((state) => state.rooms)
    const roomRoute = location.pathname.match(
        /^\/app\/room\/(\d+)(?:\/(record|schedule|bookmark))?$/,
    )
    const selectedRoom = roomRoute
        ? rooms.find((room) => room.id === roomRoute[1])
        : undefined
    const selectedRoomId = selectedRoom?.id
    const recordActive = roomRoute?.[2] === 'record'
    const bookmarkActive = roomRoute?.[2] === 'bookmark'
    const unreadCount = useNotificationStore((state) => state.unreadCount)
    const loadUnreadCount = useNotificationStore(
        (state) => state.loadUnreadCount,
    )
    const resetNotifications = useNotificationStore(
        (state) => state.resetNotifications,
    )
    const me = {
        name: currentUser?.nickname ?? '게스트',
        avatarColor: DEFAULT_AVATAR_COLOR,
        imageUrl: resolveMediaUrl(currentUser?.profileImageUrl),
    }
    const visibleNav =
        currentUser?.role === 'ADMIN' || currentUser?.role === 'SUB_ADMIN'
            ? [
                  ...nav,
                  { to: '/app/admin', label: '관리자', icon: ShieldCheckIcon },
              ]
            : nav

    useEffect(() => {
        if (currentUserId != null) {
            void loadUnreadCount()
            return
        }
        resetNotifications()
    }, [currentUserId, loadUnreadCount, resetNotifications])

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    return (
        <aside
            className={`relative z-50 flex shrink-0 flex-col overflow-visible border-r border-slate-100 bg-white py-7 shadow-[4px_0_12px_-4px_rgb(var(--rgb-app-ink)/0.08)] transition-[width] duration-300 ease-out ${
                isExpanded ? 'w-[248px] px-5' : 'w-[86px] px-3'
            }`}
        >
            <button
                type="button"
                onClick={() => setIsExpanded((expanded) => !expanded)}
                aria-label={isExpanded ? '사이드바 접기' : '사이드바 펼치기'}
                aria-expanded={isExpanded}
                className="absolute -right-3.5 top-[108px] z-50 flex h-8 w-8 items-center justify-center overflow-visible rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
            >
                {isExpanded ? (
                    <ChevronLeftIcon size={17} strokeWidth={2.4} />
                ) : (
                    <ChevronRightIcon size={17} strokeWidth={2.4} />
                )}
            </button>

            <NavLink
                to="/"
                className={`flex h-12 items-center overflow-hidden rounded-2xl transition-all ${
                    isExpanded
                        ? 'w-full gap-3 px-3'
                        : 'w-12 justify-center self-center'
                }`}
                aria-label="Plamingo 홈"
                title="Plamingo"
            >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                    <BrandLogo />
                </span>
                {isExpanded && (
                    <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-slate-900">
                        Plamingo
                    </span>
                )}
            </NavLink>

            <nav
                className="mt-16 flex flex-1 flex-col gap-3"
                aria-label="주요 메뉴"
            >
                {visibleNav.map((item) => {
                    const badge = item.to === '/app/updates' ? unreadCount : 0
                    return (
                        <React.Fragment key={item.to}>
                            <NavLink
                                to={item.to}
                                end={item.end}
                                title={item.label}
                                aria-label={
                                    badge > 0
                                        ? `${item.label}, 읽지 않은 알림 ${badge}개`
                                        : item.label
                                }
                                className={({ isActive }) =>
                                    `relative flex h-12 items-center rounded-2xl transition-all ${
                                        isExpanded
                                            ? 'w-full gap-3 overflow-hidden px-4'
                                            : 'w-12 justify-center self-center overflow-visible'
                                    } ${
                                        isActive
                                            ? 'sidebar-active-background text-[var(--color-sidebar-active-text)] shadow-[0_10px_22px_rgb(var(--rgb-sidebar-active-shadow)/0.24)]'
                                            : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700'
                                    }`
                                }
                            >
                                <item.icon
                                    className="shrink-0"
                                    size={21}
                                    strokeWidth={2.2}
                                />
                                {isExpanded && (
                                    <span className="whitespace-nowrap text-sm font-bold">
                                        {item.label}
                                    </span>
                                )}
                                {badge > 0 ? (
                                    <span
                                        className={`flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-notification-badge)] px-1 text-[10px] font-extrabold text-[var(--color-notification-badge-text)] ring-2 ring-white ${
                                            isExpanded
                                                ? 'ml-auto'
                                                : 'absolute -right-1 -top-1 z-10'
                                        }`}
                                    >
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                ) : null}
                            </NavLink>
                            {item.to === '/app/room' && selectedRoomId && (
                                <div
                                    className={`-mt-1 mb-1 flex flex-col gap-1 ${isExpanded ? 'ml-3 border-l border-slate-200 pl-3' : 'items-center'}`}
                                    aria-label={`${selectedRoom.title} 작업 메뉴`}
                                >
                                    {isExpanded && (
                                        <p className="mb-1 max-w-[150px] truncate px-2 text-[11px] font-extrabold text-slate-400">
                                            {selectedRoom.title}
                                        </p>
                                    )}
                                    <NavLink
                                        to={`/app/room/${selectedRoomId}`}
                                        end
                                        title="Plan"
                                        aria-label={`${selectedRoom.title} Plan`}
                                        className={`flex h-10 items-center rounded-xl text-xs font-extrabold transition ${isExpanded ? 'gap-2 px-3' : 'w-10 justify-center'} ${!recordActive && !bookmarkActive ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
                                    >
                                        <NotebookTabsIcon size={16} />
                                        {isExpanded && <span>Plan</span>}
                                    </NavLink>
                                    <NavLink
                                        to={`/app/room/${selectedRoomId}/record`}
                                        title="Record"
                                        aria-label={`${selectedRoom.title} Record`}
                                        className={`flex h-10 items-center rounded-xl text-xs font-extrabold transition ${isExpanded ? 'gap-2 px-3' : 'w-10 justify-center'} ${recordActive ? 'bg-brand text-white shadow-[0_8px_18px_rgb(var(--rgb-brand)/0.22)]' : 'text-slate-400 hover:bg-brand-50 hover:text-brand-700'}`}
                                    >
                                        <CameraIcon size={16} />
                                        {isExpanded && <span>Record</span>}
                                    </NavLink>
                                    <NavLink
                                        to={`/app/room/${selectedRoomId}/bookmark`}
                                        title="Bookmark"
                                        aria-label={`${selectedRoom.title} Bookmark`}
                                        className={`flex h-10 items-center rounded-xl text-xs font-extrabold transition ${isExpanded ? 'gap-2 px-3' : 'w-10 justify-center'} ${bookmarkActive ? 'bg-brand text-white' : 'text-slate-400 hover:bg-brand-50 hover:text-brand-700'}`}
                                    >
                                        <BookmarkIcon size={16} />
                                        {isExpanded && <span>Bookmark</span>}
                                    </NavLink>
                                </div>
                            )}
                        </React.Fragment>
                    )
                })}
            </nav>

            <div className="flex flex-col gap-3">
                <NavLink
                    to="/app/mypage"
                    title="내 프로필"
                    aria-label="내 프로필"
                    className={`flex h-14 items-center overflow-hidden rounded-2xl transition hover:bg-slate-50 ${
                        isExpanded
                            ? 'w-full gap-3 px-2'
                            : 'w-12 justify-center self-center'
                    }`}
                >
                    <span className="shrink-0 rounded-full ring-2 ring-slate-100">
                        <Avatar
                            name={me.name}
                            color={me.avatarColor}
                            imageUrl={me.imageUrl}
                            size={40}
                        />
                    </span>
                    {isExpanded && (
                        <span className="min-w-0">
                            <strong className="block truncate text-sm text-slate-800">
                                {me.name}
                            </strong>
                            <span className="block text-[11px] font-medium text-slate-400">
                                내 프로필
                            </span>
                        </span>
                    )}
                </NavLink>
                <button
                    type="button"
                    onClick={handleLogout}
                    title="로그아웃"
                    aria-label="로그아웃"
                    className={`flex h-12 items-center overflow-hidden rounded-2xl transition ${
                        isExpanded
                            ? 'w-full gap-3 bg-slate-900 px-4 text-white hover:bg-slate-800'
                            : 'w-12 justify-center self-center text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                >
                    <LogOutIcon className="shrink-0" size={20} />
                    {isExpanded && (
                        <span className="whitespace-nowrap text-sm font-bold">
                            로그아웃
                        </span>
                    )}
                </button>
            </div>
        </aside>
    )
}
