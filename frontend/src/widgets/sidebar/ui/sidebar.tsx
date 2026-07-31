import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    BellIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CompassIcon,
    HomeIcon,
    LogOutIcon,
    MapIcon,
} from 'lucide-react'
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
    const [isExpanded, setIsExpanded] = useState(true)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
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

    useEffect(() => {
        if (currentUser) {
            void loadUnreadCount()
            return
        }
        resetNotifications()
    }, [currentUser, loadUnreadCount, resetNotifications])

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    return (
        <aside
            className={`relative z-40 flex shrink-0 flex-col overflow-visible border-r border-slate-100 bg-white py-7 transition-[width] duration-300 ease-out ${
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
                {nav.map((item) => {
                    const badge = item.to === '/app/updates' ? unreadCount : 0
                    return (
                        <NavLink
                            key={item.to}
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
                                        ? 'flamingo-gradient text-white shadow-[0_10px_22px_rgba(231,101,122,0.24)]'
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
                                    className={`flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-400 px-1 text-[10px] font-extrabold text-white ring-2 ring-white ${
                                        isExpanded
                                            ? 'ml-auto'
                                            : 'absolute -right-1 -top-1 z-10'
                                    }`}
                                >
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            ) : null}
                        </NavLink>
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
