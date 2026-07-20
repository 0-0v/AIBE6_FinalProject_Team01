import React, { useState } from 'react'
import {
    XIcon,
    CopyIcon,
    CheckIcon,
    LinkIcon,
    UserPlusIcon,
} from 'lucide-react'

type Props = {
    onClose: () => void
}

function randomCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function InviteModal({ onClose }: Props) {
    const [code] = useState(randomCode())
    const [copied, setCopied] = useState<'code' | 'link' | null>(null)
    const link = `https://yeojido.app/join/${code}`

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
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-center text-xl font-bold tracking-[0.3em] text-slate-700">
                        {code}
                    </div>
                    <button
                        onClick={() => copy('code', code)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-700"
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

                <div className="border-t border-slate-100 pt-4">
                    <label className="mb-1.5 block text-sm font-semibold">
                        이메일로 직접 추가
                    </label>
                    <div className="flex gap-2">
                        <input
                            placeholder="friend@email.com"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
                        />

                        <button className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                            <UserPlusIcon size={15} /> 추가
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
