import { create } from 'zustand'

export type CurrentUser = {
    id: number
    email: string
    nickname: string
    profileImageUrl: string | null
    provider: 'GOOGLE' | 'KAKAO' | 'NAVER' | 'APPLE'
}

type CurrentUserState = {
    currentUser: CurrentUser | null
    isInitialized: boolean
    setCurrentUser: (user: CurrentUser) => void
    clearCurrentUser: () => void
    finishInitialization: () => void
}

export const useCurrentUserStore = create<CurrentUserState>((set) => ({
    currentUser: null,
    isInitialized: false,
    setCurrentUser: (user) => set({ currentUser: user, isInitialized: true }),
    clearCurrentUser: () => set({ currentUser: null, isInitialized: true }),
    finishInitialization: () => set({ isInitialized: true }),
}))
