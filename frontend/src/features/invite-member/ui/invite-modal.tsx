import React, { useState } from 'react'
import {
    XIcon,
    CopyIcon,
    CheckIcon,
    LinkIcon,
} from 'lucide-react'
import { createTripInvitation } from '@/features/manage-trip'

type Props = {
    tripId: number
    onClose: () => void
}

export function InviteModal({ tripId, onClose }: Props) {
    const [code, setCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [copied, setCopied] = useState<'code' | 'link' | null>(null)
    const link = code ? `${window.location.origin}/app/room/invite/${code}` : ''

    async function issueInvitation() {
        setIsLoading(true)
        setError(null)
        try {
            const invitation = await createTripInvitation(tripId)
            setCode(invitation.inviteCode)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '초대 링크를 만들지 못했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    function copy(kind: 'code' | 'link', value: string) {
        navigator.clipboard?.writeText(value)
        setCopied(kind)
        setTimeout(() => setCopied(null), 1500)
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-extrabold">멤버 초대</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <label className="mb-1.5 block text-sm font-semibold">
                    초대 코드
                </label>
                {!code && (
                    <button onClick={() => void issueInvitation()} disabled={isLoading} className="mb-4 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60">
                        {isLoading ? '생성 중...' : '조회 전용 초대 링크 만들기'}
                    </button>
                )}
                {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
                {code && <>
                <div className="mb-4 flex items-center gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center">
                        <span className="break-all font-mono text-sm font-bold tracking-widest text-slate-700">
                            {code}
                        </span>
                    </div>
                    <button
                        onClick={() => copy('code', code)}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-700"
                    >
                        {copied === 'code' ? (
                            <CheckIcon size={18} />
                        ) : (
                            <CopyIcon size={18} />
                        )}
                    </button>
                </div>

                <label className="mb-1.5 block text-sm font-semibold">
                    초대 링크
                </label>
                <div className="mb-6 flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                        <LinkIcon size={15} className="shrink-0" />
                        <span className="truncate">{link}</span>
                    </div>
                    <button
                        onClick={() => copy('link', link)}
                        className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        {copied === 'link' ? '복사됨' : '복사'}
                    </button>
                </div>
                </>}

            </div>
        </div>
    )
}
