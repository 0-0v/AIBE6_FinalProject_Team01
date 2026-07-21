'use client'

import React, { useEffect } from 'react'
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { Home } from './screens/Home'
import { Explore, Updates } from './screens/StubPages'
import { MyPage } from './screens/MyPage'
import { Login } from './screens/Login'
import { OAuthCallback } from './screens/OAuthCallback'
import { TripRoom } from './screens/TripRoom'
import { Landing } from './screens/Landing'
import { fetchCurrentUser } from './lib/api/current-user'
import { useCurrentUserStore } from './stores/current-user-store'

function AppShell() {
    const location = useLocation()
    const isRoom = location.pathname.startsWith('/app/room')

    return (
        <div className="flex h-full w-full overflow-hidden bg-white">
            <Sidebar />
            <main
                className={`min-w-0 flex-1 bg-white ${isRoom ? 'overflow-hidden' : 'mp-scroll overflow-y-auto'}`}
            >
                <Routes>
                    <Route index element={<Home />} />
                    <Route path="explore" element={<Explore />} />
                    <Route path="room/:roomId?" element={<TripRoom />} />
                    <Route path="updates" element={<Updates />} />
                    <Route path="mypage" element={<MyPage />} />
                </Routes>
            </main>
        </div>
    )
}

export function App() {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const setCurrentUser = useCurrentUserStore((state) => state.setCurrentUser)

    useEffect(() => {
        if (currentUser || window.location.pathname === '/oauth/callback') {
            return
        }
        const accessToken = localStorage.getItem('accessToken')
        if (!accessToken) {
            return
        }
        fetchCurrentUser(accessToken).then((user) => {
            if (user) {
                setCurrentUser(user)
            }
        })
    }, [currentUser, setCurrentUser])

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/app/*" element={<AppShell />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
