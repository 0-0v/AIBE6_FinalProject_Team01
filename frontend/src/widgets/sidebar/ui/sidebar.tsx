import React, { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    BellIcon,
    CompassIcon,
    HomeIcon,
    LogOutIcon,
    MapIcon,
    PlusIcon,
    SparklesIcon,
    UserRoundIcon,
} from 'lucide-react'
import { useNotificationStore } from '@/features/manage-notification'
import { logout, resolveMediaUrl } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'

const nav = [
    { to: '/app', label: '대시보드', icon: HomeIcon, end: true },
    { to: '/app/room', label: '여행방', icon: MapIcon },
    { to: '/app/explore', label: '둘러보기', icon: CompassIcon },
    { to: '/app/updates', label: '알림', icon: BellIcon },
]

export function Sidebar() {
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const unreadCount = useNotificationStore((state) => state.unreadCount)
    const loadUnreadCount = useNotificationStore(
        (state) => state.loadUnreadCount,
    )
    const resetNotifications = useNotificationStore(
        (state) => state.resetNotifications,
    )
    const displayName = currentUser?.nickname ?? '게스트'
    const profileImageUrl = resolveMediaUrl(currentUser?.profileImageUrl)

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
        <aside className="z-30 flex w-[86px] shrink-0 flex-col items-center border-r border-slate-100 bg-white py-7">
            <NavLink
                to="/"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_10px_22px_rgba(231,101,122,0.26)]"
                aria-label="여지도 대시보드"
                title="여지도"
            >
                <SparklesIcon size={21} />
            </NavLink>

            <nav
                className="mt-16 flex flex-1 flex-col items-center gap-4"
                aria-label="주요 메뉴"
            >
                {nav.map((item) => {
                    const badge =
                        item.to === '/app/updates' ? unreadCount : 0
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
                                `relative flex h-12 w-12 items-center justify-center rounded-xl transition ${isActive ? 'bg-brand text-white shadow-[0_10px_22px_rgba(231,101,122,0.26)]' : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700'}`
                            }
                        >
                            <item.icon size={21} strokeWidth={2.2} />
                            {badge > 0 ? (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-400 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            ) : null}
                        </NavLink>
                    )
                })}

                <NavLink
                    to="/app/room"
                    title="새 여행방"
                    aria-label="새 여행방"
                    className="mt-2 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 transition hover:border-brand hover:bg-brand-50 hover:text-brand-700"
                >
                    <PlusIcon size={20} />
                </NavLink>
            </nav>

            <div className="flex flex-col items-center gap-4">
                <button
                    type="button"
                    onClick={handleLogout}
                    title="로그아웃"
                    aria-label="로그아웃"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                    <LogOutIcon size={20} />
                </button>
                <NavLink
                    to="/app/mypage"
                    title="내 프로필"
                    aria-label="내 프로필"
                    className="rounded-full ring-2 ring-slate-100 transition hover:ring-brand"
                >
                    {profileImageUrl ? (
                        <img
                            src={profileImageUrl}
                            alt={displayName}
                            className="h-10 w-10 rounded-full object-cover"
                        />
                    ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <UserRoundIcon size={20} />
                        </span>
                    )}
                </NavLink>
            </div>
        </aside>
    )
}
