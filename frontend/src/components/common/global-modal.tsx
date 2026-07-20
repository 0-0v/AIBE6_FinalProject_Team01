'use client'

import { useEffect, useState } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGlobalModalStore } from '@/stores/global-modal-store'

export function GlobalModal() {
    const modal = useGlobalModalStore()
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!modal.isOpen) {
            return
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape' && !isSubmitting) {
                modal.closeModal()
            }
        }

        document.addEventListener('keydown', closeOnEscape)
        return () => document.removeEventListener('keydown', closeOnEscape)
    }, [isSubmitting, modal])

    if (!modal.isOpen) {
        return null
    }

    async function handleConfirm() {
        try {
            setIsSubmitting(true)
            await modal.onConfirm?.()
            modal.closeModal()
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) {
                    modal.closeModal()
                }
            }}
        >
            <section
                aria-describedby={
                    modal.description ? 'global-modal-description' : undefined
                }
                aria-labelledby="global-modal-title"
                aria-modal="true"
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                role="dialog"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2
                            className="text-lg font-bold text-slate-900"
                            id="global-modal-title"
                        >
                            {modal.title}
                        </h2>
                        {modal.description && (
                            <p
                                className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600"
                                id="global-modal-description"
                            >
                                {modal.description}
                            </p>
                        )}
                    </div>
                    <button
                        aria-label="모달 닫기"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        disabled={isSubmitting}
                        onClick={modal.closeModal}
                        type="button"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    {modal.showCancel && (
                        <Button
                            disabled={isSubmitting}
                            onClick={modal.closeModal}
                            type="button"
                            variant="outline"
                        >
                            {modal.cancelText}
                        </Button>
                    )}
                    <Button
                        disabled={isSubmitting}
                        onClick={handleConfirm}
                        type="button"
                    >
                        {isSubmitting ? '처리 중...' : modal.confirmText}
                    </Button>
                </div>
            </section>
        </div>
    )
}
