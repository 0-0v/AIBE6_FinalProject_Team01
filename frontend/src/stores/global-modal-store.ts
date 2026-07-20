import { create } from 'zustand'

export type GlobalModalOptions = {
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    showCancel?: boolean
    onConfirm?: () => void | Promise<void>
}

type GlobalModalState = GlobalModalOptions & {
    isOpen: boolean
    openModal: (options: GlobalModalOptions) => void
    closeModal: () => void
}

const INITIAL_MODAL_STATE = {
    isOpen: false,
    title: '',
    description: undefined,
    confirmText: '확인',
    cancelText: '취소',
    showCancel: false,
    onConfirm: undefined,
}

export const useGlobalModalStore = create<GlobalModalState>((set) => ({
    ...INITIAL_MODAL_STATE,
    openModal: (options) =>
        set({ ...INITIAL_MODAL_STATE, ...options, isOpen: true }),
    closeModal: () => set(INITIAL_MODAL_STATE),
}))

export const globalModal = {
    open: (options: GlobalModalOptions) =>
        useGlobalModalStore.getState().openModal(options),
    close: () => useGlobalModalStore.getState().closeModal(),
}
