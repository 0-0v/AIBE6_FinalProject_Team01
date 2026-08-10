'use client'

import React, { useEffect, useLayoutEffect, useRef } from 'react'
import {
    BrowserRouter,
    Navigate,
    NavLink,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom'
import { Sidebar } from '@/widgets/sidebar'
import { RealtimeSync } from '@/widgets/realtime-sync'
import { Home } from '@/views/home'
import { Explore, ExploreDetail, Updates } from '@/views/discovery'
import { MyPage } from '@/views/my-page'
import { Login } from '@/views/login'
import { SignupPage } from '@/views/signup'
import { PasswordResetPage } from '@/views/password-reset'
import { OAuthCallback } from '@/views/oauth-callback'
import { TripRoom, ScheduleKanbanPage } from '@/views/trip-room'
import { Landing } from '@/views/landing'
import { PrivacyPolicyPage, TermsPage } from '@/views/legal'
import { TripEmailInvitationPage } from '@/views/trip-email-invitation'
import { getAccessToken, restoreSession } from '@/shared/api/client'
import { fetchCurrentUser } from '@/shared/api/current-user'
import { getJwtExpirationTime } from '@/shared/lib'
import { useCurrentUserStore } from '@/shared/model'
import { BrandLogo } from '@/shared/ui'
import { useNotificationStore } from '@/features/manage-notification'

function AppShell() {
    const location = useLocation()
    const isRoom = location.pathname.startsWith('/app/room')
    const isGuestInvite = location.pathname.startsWith('/app/room/invite/')
    const isInitialized = useCurrentUserStore((state) => state.isInitialized)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const loadNotifications = useNotificationStore(
        (state) => state.loadNotifications,
    )
    const resetNotifications = useNotificationStore(
        (state) => state.resetNotifications,
    )
    const loadNotificationsRef = useRef(loadNotifications)
    const resetNotificationsRef = useRef(resetNotifications)
    useLayoutEffect(() => {
        loadNotificationsRef.current = loadNotifications
        resetNotificationsRef.current = resetNotifications
    })

    useEffect(() => {
        if (!currentUser) {
            resetNotificationsRef.current()
            return
        }

        const refreshNotifications = () => {
            if (document.visibilityState === 'visible') {
                void loadNotificationsRef.current()
            }
        }
        void loadNotificationsRef.current()
        const intervalId = window.setInterval(refreshNotifications, 30_000)
        window.addEventListener('focus', refreshNotifications)
        document.addEventListener('visibilitychange', refreshNotifications)

        return () => {
            window.clearInterval(intervalId)
            window.removeEventListener('focus', refreshNotifications)
            document.removeEventListener(
                'visibilitychange',
                refreshNotifications,
            )
        }
    }, [currentUser])

    // 세션 복원(리프레시 토큰 -> 내 정보 조회)이 끝나기 전에 그리면
    // 이전 currentUser 값(게스트 또는 직전 닉네임/사진)이 잠깐 보였다가
    // 최신 값으로 바뀌는 깜빡임이 생긴다. 초기화가 끝날 때까지 대기한다.
    if (!isInitialized) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-white" />
        )
    }

    if (!currentUser && !isGuestInvite) {
        return <Navigate to="/" replace />
    }

    return (
        <div className="mp-scroll h-full w-full overflow-x-auto overflow-y-hidden bg-white">
            <div className="relative flex h-full min-w-[1500px] bg-white">
                <RealtimeSync />
                {isGuestInvite ? (
                    <NavLink
                        to="/"
                        className="absolute left-7 top-7 z-50 flex h-11 w-11 items-center justify-center"
                        aria-label="랜딩 페이지로 이동"
                        title="여지도 홈"
                    >
                        <BrandLogo />
                    </NavLink>
                ) : (
                    <Sidebar />
                )}
                <main
                    className={`min-w-0 flex-1 bg-white ${isRoom ? 'overflow-hidden' : 'mp-scroll overflow-y-auto'}`}
                >
                    <Routes>
                        <Route index element={<Home />} />
                        <Route path="explore" element={<Explore />} />
                        <Route
                            path="explore/:cardId"
                            element={<ExploreDetail />}
                        />
                        <Route
                            path="room/:roomId/schedule"
                            element={<ScheduleKanbanPage />}
                        />
                        <Route
                            path="room/:roomId/record"
                            element={<TripRoom mode="record" />}
                        />
                        <Route path="room/:roomId?" element={<TripRoom />} />
                        <Route
                            path="room/invite/:inviteCode"
                            element={<TripRoom />}
                        />
                        <Route path="updates" element={<Updates />} />
                        <Route path="mypage" element={<MyPage />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

export function App() {
    const sessionRestoreStarted = useRef(false)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const setCurrentUser = useCurrentUserStore((state) => state.setCurrentUser)
    const clearCurrentUser = useCurrentUserStore(
        (state) => state.clearCurrentUser,
    )

    useEffect(() => {
        if (
            sessionRestoreStarted.current ||
            window.location.pathname === '/oauth/callback'
        ) {
            return
        }
        if (currentUser && getAccessToken()) {
            return
        }
        sessionRestoreStarted.current = true
        restoreSession().then((accessToken) => {
            if (!accessToken) {
                clearCurrentUser()
                return
            }
            fetchCurrentUser(accessToken).then((user) => {
                if (user) {
                    setCurrentUser(user)
                    return
                }
                clearCurrentUser()
            })
        })
    }, [clearCurrentUser, currentUser, setCurrentUser])

    useEffect(() => {
        if (!currentUser) return

        const refreshLeewayMs = 60_000
        const retryDelayMs = 30_000
        let cancelled = false
        let timerId: number | null = null

        const scheduleRefresh = (delayOverride?: number) => {
            const token = getAccessToken()
            const expiresAt = token ? getJwtExpirationTime(token) : null
            if (!token || !expiresAt) {
                clearCurrentUser()
                return
            }

            const delay =
                delayOverride ??
                Math.max(expiresAt - Date.now() - refreshLeewayMs, 1_000)
            timerId = window.setTimeout(async () => {
                const refreshedToken = await restoreSession()
                if (cancelled) return

                if (refreshedToken) {
                    scheduleRefresh()
                    return
                }
                if (Date.now() < expiresAt) {
                    scheduleRefresh(retryDelayMs)
                    return
                }

                clearCurrentUser()
                window.location.assign('/login')
            }, delay)
        }

        scheduleRefresh()
        return () => {
            cancelled = true
            if (timerId !== null) window.clearTimeout(timerId)
        }
    }, [clearCurrentUser, currentUser])

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/password-reset" element={<PasswordResetPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route
                    path="/trip-invite/:token"
                    element={<TripEmailInvitationPage />}
                />
                <Route path="/app/*" element={<AppShell />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
