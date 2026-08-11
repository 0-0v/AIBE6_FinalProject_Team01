'use client'

import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2Icon, MessageCircleQuestionIcon } from 'lucide-react'
import { submitInquiry, type InquiryCategory } from '@/features/service-inquiry'
import { getApiErrorMessage } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { BrandLogo } from '@/shared/ui'

export function ContactPage() {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const [category, setCategory] = useState<InquiryCategory>('USER')
    const [email, setEmail] = useState(currentUser?.email ?? '')
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [completed, setCompleted] = useState(false)

    async function submit(event: FormEvent) {
        event.preventDefault()
        setBusy(true)
        setMessage('')
        try {
            await submitInquiry({ category, email, subject, content })
            setCompleted(true)
        } catch (error) {
            setMessage(getApiErrorMessage(error, '문의를 접수하지 못했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <main className="min-h-full bg-slate-50 px-5 py-10 text-slate-900">
            <section className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
                <Link to="/" className="flex items-center gap-2 font-extrabold">
                    <BrandLogo className="h-8 w-8" /> Plamingo
                </Link>
                <h1 className="mt-8 text-3xl font-extrabold">서비스 문의</h1>
                <p className="mt-2 text-sm text-slate-500">
                    접수한 이메일로 담당자가 답변을 보내드립니다.
                </p>
                {completed ? (
                    <div className="mt-8 rounded-2xl bg-emerald-50 p-8 text-center">
                        <strong className="text-lg text-emerald-800">
                            문의가 접수되었습니다.
                        </strong>
                        <p className="mt-2 text-sm text-emerald-700">
                            답변은 {email} 이메일로 보내드리겠습니다.
                        </p>
                        <Link
                            to="/"
                            className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                        >
                            홈으로 돌아가기
                        </Link>
                    </div>
                ) : (
                    <form className="mt-7 space-y-5" onSubmit={submit}>
                        <fieldset>
                            <legend className="text-sm font-bold">
                                문의 항목
                            </legend>
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                <CategoryButton
                                    active={category === 'USER'}
                                    onClick={() => setCategory('USER')}
                                    icon={
                                        <MessageCircleQuestionIcon size={19} />
                                    }
                                    label="사용자 문의"
                                />
                                <CategoryButton
                                    active={category === 'BUSINESS'}
                                    onClick={() => setCategory('BUSINESS')}
                                    icon={<Building2Icon size={19} />}
                                    label="비즈니스"
                                />
                            </div>
                        </fieldset>
                        <Field label="답변받을 이메일">
                            <input
                                type="email"
                                required
                                maxLength={255}
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                            />
                        </Field>
                        <Field label="제목">
                            <input
                                required
                                maxLength={100}
                                value={subject}
                                onChange={(event) =>
                                    setSubject(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                            />
                        </Field>
                        <Field label="문의 내용">
                            <textarea
                                required
                                maxLength={3000}
                                value={content}
                                onChange={(event) =>
                                    setContent(event.target.value)
                                }
                                className="h-44 w-full resize-none rounded-xl border border-slate-200 p-4 text-sm"
                            />
                        </Field>
                        {message && (
                            <p className="text-sm text-red-600">{message}</p>
                        )}
                        <button
                            disabled={busy}
                            className="w-full rounded-xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
                        >
                            {busy ? '접수 중...' : '문의 접수'}
                        </button>
                    </form>
                )}
            </section>
        </main>
    )
}

function CategoryButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${active ? 'border-brand bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}
        >
            {icon}
            {label}
        </button>
    )
}

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <label className="block text-sm font-bold">
            {label}
            <span className="mt-2 block">{children}</span>
        </label>
    )
}
