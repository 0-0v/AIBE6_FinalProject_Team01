import { FormEvent, useState } from 'react'
import { CheckCircle2Icon, MailPlusIcon, PlusIcon, SendIcon, XIcon } from 'lucide-react'
import { errorMessage } from '@/shared/lib'
import {
    sendTripEmailInvitations,
    validateTripEmailInvitation,
} from '../api/trip-api'

type Props = {
    tripId: number
    onComplete: () => void
}

export function TripEmailInvitationStep({ tripId, onComplete }: Props) {
    const [email, setEmail] = useState('')
    const [emails, setEmails] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const [isSending, setIsSending] = useState(false)

    async function addEmail(event: FormEvent) {
        event.preventDefault()
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) {
            setError('초대할 멤버의 이메일을 입력해 주세요.')
            return
        }
        if (emails.includes(normalizedEmail)) {
            setError('이미 추가한 이메일입니다.')
            return
        }
        if (emails.length >= 20) {
            setError('한 번에 최대 20명까지 초대할 수 있습니다.')
            return
        }

        setIsValidating(true)
        setError(null)
        try {
            const availability = await validateTripEmailInvitation(
                tripId,
                normalizedEmail,
            )
            if (!availability.available) {
                setError(availability.message)
                return
            }
            setEmails((current) => [...current, normalizedEmail])
            setEmail('')
        } catch (caught) {
            setError(errorMessage(caught, '가입된 계정을 확인하지 못했습니다.'))
        } finally {
            setIsValidating(false)
        }
    }

    async function sendAll() {
        if (emails.length === 0) return
        setIsSending(true)
        setError(null)
        try {
            await sendTripEmailInvitations(tripId, emails)
            onComplete()
        } catch (caught) {
            setError(errorMessage(caught, '초대 메일을 보내지 못했습니다.'))
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4">
            <section className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
                <header className="flamingo-gradient relative px-7 py-7 text-white">
                    <button
                        type="button"
                        onClick={onComplete}
                        aria-label="초대 건너뛰기"
                        className="absolute right-5 top-5 rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
                    >
                        <XIcon size={19} />
                    </button>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                        <MailPlusIcon size={24} />
                    </span>
                    <h2 className="mt-4 text-2xl font-extrabold">함께 여행할 멤버를 초대해 보세요</h2>
                    <p className="mt-2 text-sm font-semibold text-white/85">
                        Plamingo에 가입된 계정 이메일만 초대할 수 있어요.
                    </p>
                </header>

                <form onSubmit={addEmail} className="p-7">
                    <label className="text-sm font-extrabold text-slate-700">
                        멤버 이메일
                        <div className="mt-2 flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="friend@example.com"
                                autoFocus
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                            />
                            <button
                                type="submit"
                                disabled={isValidating || isSending}
                                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-extrabold text-white transition hover:bg-brand-700 disabled:opacity-60"
                            >
                                <PlusIcon size={15} />
                                {isValidating ? '확인 중' : '이메일 추가'}
                            </button>
                        </div>
                    </label>

                    {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}

                    {emails.length > 0 && (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-extrabold text-slate-600">
                                초대 대상 {emails.length}명
                            </p>
                            <ul className="mt-2 space-y-2">
                                {emails.map((targetEmail) => (
                                    <li
                                        key={targetEmail}
                                        className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                                    >
                                        <CheckCircle2Icon className="text-emerald-500" size={15} />
                                        <span className="min-w-0 flex-1 truncate">{targetEmail}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEmails((current) =>
                                                    current.filter((item) => item !== targetEmail),
                                                )
                                            }
                                            aria-label={`${targetEmail} 삭제`}
                                            className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-red-500"
                                        >
                                            <XIcon size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={sendAll}
                        disabled={emails.length === 0 || isSending || isValidating}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        <SendIcon size={16} />
                        {isSending ? '초대 메일 발송 중' : `${emails.length}명에게 한 번에 보내기`}
                    </button>
                    <button
                        type="button"
                        onClick={onComplete}
                        disabled={isSending}
                        className="mt-2 w-full py-2 text-sm font-bold text-slate-400 hover:text-slate-600"
                    >
                        나중에 초대하기
                    </button>
                </form>
            </section>
        </div>
    )
}
