'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRoundIcon, ShieldCheckIcon, XIcon } from 'lucide-react'
import {
    requestAdminOtp,
    requestSubAdminOtp,
    verifyAdminOtp,
} from '@/features/admin'
import { getApiErrorMessage } from '@/shared/api/client'
import { BrandLogo } from '@/shared/ui'
import { useCurrentUserStore } from '@/shared/model'

type Challenge = {
    challengeToken: string
    maskedEmail: string
    expiresInSeconds: number
}

export function AdminLoginPage() {
    const navigate = useNavigate()
    const [identifier, setIdentifier] = useState('admin12')
    const [password, setPassword] = useState('')
    const [challenge, setChallenge] = useState<Challenge | null>(null)
    const [code, setCode] = useState('')
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const stepUpRequested = useRef(false)

    useEffect(() => {
        if (currentUser?.role !== 'SUB_ADMIN' || stepUpRequested.current) {
            return
        }
        stepUpRequested.current = true
        setBusy(true)
        requestSubAdminOtp()
            .then(setChallenge)
            .catch((error) => {
                setMessage(
                    getApiErrorMessage(
                        error,
                        '부관리자 OTP를 발송하지 못했습니다.',
                    ),
                )
            })
            .finally(() => setBusy(false))
    }, [currentUser])

    async function handleCredentials(event: FormEvent) {
        event.preventDefault()
        setBusy(true)
        setMessage('')
        try {
            setChallenge(await requestAdminOtp(identifier.trim(), password))
        } catch (error) {
            setMessage(
                getApiErrorMessage(
                    error,
                    '관리자 로그인을 시작하지 못했습니다.',
                ),
            )
        } finally {
            setBusy(false)
        }
    }

    async function handleOtp(event: FormEvent) {
        event.preventDefault()
        if (!challenge) return
        setBusy(true)
        setMessage('')
        try {
            await verifyAdminOtp(challenge.challengeToken, code)
            navigate('/app/admin', { replace: true })
        } catch (error) {
            setMessage(getApiErrorMessage(error, 'OTP를 확인하지 못했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <main className="flex min-h-full items-center justify-center bg-slate-950 px-6 py-12">
            <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-white p-8 shadow-2xl">
                <Link
                    to="/"
                    className="mx-auto block h-14 w-14"
                    aria-label="홈으로 이동"
                >
                    <BrandLogo />
                </Link>
                <div className="mt-5 text-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        <ShieldCheckIcon size={14} /> 관리자 보안 영역
                    </span>
                    <h1 className="mt-4 text-2xl font-extrabold text-slate-950">
                        관리자 로그인
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        비밀번호와 이메일 OTP 인증이 모두 필요합니다.
                    </p>
                </div>
                {currentUser?.role !== 'SUB_ADMIN' && (
                    <form
                        className="mt-8 space-y-3"
                        onSubmit={handleCredentials}
                    >
                        <input
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                            value={identifier}
                            onChange={(event) =>
                                setIdentifier(event.target.value)
                            }
                            autoComplete="username"
                            aria-label="관리자 아이디"
                        />
                        <input
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            autoComplete="current-password"
                            placeholder="비밀번호"
                        />
                        {message && (
                            <p className="break-keep text-sm text-red-600">
                                {message}
                            </p>
                        )}
                        <button
                            disabled={busy}
                            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {busy ? '확인 중...' : '이메일 OTP 받기'}
                        </button>
                    </form>
                )}
                {currentUser?.role === 'SUB_ADMIN' && busy && (
                    <p className="mt-8 text-center text-sm font-semibold text-slate-500">
                        등록된 이메일로 OTP를 전송하고 있습니다.
                    </p>
                )}
                <Link
                    to="/login"
                    className="mt-5 block text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                    일반 로그인으로 돌아가기
                </Link>
            </section>

            {challenge && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-otp-title"
                        className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"
                    >
                        <div className="flex items-start justify-between">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                                <KeyRoundIcon size={21} />
                            </span>
                            <button
                                type="button"
                                aria-label="OTP 모달 닫기"
                                onClick={() => {
                                    setChallenge(null)
                                    setCode('')
                                    setMessage('')
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <h2
                            id="admin-otp-title"
                            className="mt-5 text-xl font-extrabold text-slate-950"
                        >
                            이메일 OTP 인증
                        </h2>
                        <p className="mt-2 break-keep text-sm leading-6 text-slate-500">
                            {challenge.maskedEmail}로 전송된 6자리 코드를 입력해
                            주세요. 코드는{' '}
                            {Math.ceil(challenge.expiresInSeconds / 60)}분간
                            유효합니다.
                        </p>
                        <form className="mt-6 space-y-4" onSubmit={handleOtp}>
                            <input
                                autoFocus
                                inputMode="numeric"
                                maxLength={6}
                                pattern="[0-9]{6}"
                                value={code}
                                onChange={(event) =>
                                    setCode(
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-center text-2xl font-extrabold tracking-[0.35em]"
                                aria-label="OTP 6자리"
                            />
                            {message && (
                                <p className="break-keep text-sm text-red-600">
                                    {message}
                                </p>
                            )}
                            <button
                                disabled={busy || code.length !== 6}
                                className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {busy ? '인증 중...' : '관리자 로그인'}
                            </button>
                        </form>
                    </section>
                </div>
            )}
        </main>
    )
}
