import { create } from 'zustand'
import { useCurrentUserStore } from '@/shared/model'
import { updateNickname, uploadProfileImage } from '../api/profile-api'

type ProfileState = {
    isUpdatingNickname: boolean
    isUploadingImage: boolean
    changeNickname: (nickname: string) => Promise<void>
    changeProfileImage: (file: File) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set) => ({
    isUpdatingNickname: false,
    isUploadingImage: false,
    changeNickname: async (nickname) => {
        set({ isUpdatingNickname: true })
        try {
            const updated = await updateNickname(nickname)
            useCurrentUserStore.getState().setCurrentUser(updated)
        } finally {
            set({ isUpdatingNickname: false })
        }
    },
    changeProfileImage: async (file) => {
        set({ isUploadingImage: true })
        try {
            const updated = await uploadProfileImage(file)
            useCurrentUserStore.getState().setCurrentUser(updated)
        } finally {
            set({ isUploadingImage: false })
        }
    },
}))
