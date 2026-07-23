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
    setCurrentUser: (user: CurrentUser) => void
    clearCurrentUser: () => void
}

export const useCurrentUserStore = create<CurrentUserState>((set) => ({
    currentUser: null,
    setCurrentUser: (user) => set({ currentUser: user }),
    clearCurrentUser: () => set({ currentUser: null }),
}))
