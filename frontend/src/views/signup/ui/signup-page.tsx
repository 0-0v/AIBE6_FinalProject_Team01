'use client'

import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SparklesIcon } from 'lucide-react'
import {
    confirmVerificationCode,
    sendVerificationCode,
    signup,
} from '@/features/local-auth'
import { getApiErrorMessage } from '@/shared/api/client'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=])[A-Za-z\d!@#$%^&*()_+\-=]{8,64}$/

export function SignupPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [nickname, setNickname] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [codeSent, setCodeSent] = useState(false)
    const [verified, setVerified] = useState(false)
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)

    async function handleSendCode() {
        if (!emailPattern.test(email)) {
            setMessage('올바른 이메일을 입력해 주세요.')
            return
        }
        setBusy(true)
        try {
            await sendVerificationCode(email, 'SIGNUP')
            setCodeSent(true)
            setVerified(false)
            setMessage('인증번호를 전송했습니다.')
        } catch (error) {
            setMessage(getApiErrorMessage(error, '인증번호 전송에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    async function handleVerifyCode() {
        if (!/^\d{6}$/.test(code)) {
            setMessage('인증번호 6자리를 입력해 주세요.')
            return
        }
        setBusy(true)
        try {
            await confirmVerificationCode(email, code, 'SIGNUP')
            setVerified(true)
            setMessage('이메일 인증이 완료되었습니다.')
        } catch (error) {
            setMessage(getApiErrorMessage(error, '이메일 인증에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        if (!verified) return setMessage('이메일 인증을 완료해 주세요.')
        if (nickname.trim().length < 2 || nickname.trim().length > 20)
            return setMessage('닉네임은 2~20자로 입력해 주세요.')
        if (!passwordPattern.test(password))
            return setMessage(
                '비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.',
            )
        if (password !== passwordConfirm)
            return setMessage('비밀번호가 일치하지 않습니다.')

        setBusy(true)
        try {
            await signup(email, password, nickname.trim())
            navigate('/app', { replace: true })
        } catch (error) {
            setMessage(getApiErrorMessage(error, '회원가입에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <AuthLayout title="이메일로 회원가입">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <Field label="이메일">
                    <div className="flex gap-2">
                        <input
                            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
                            type="email"
                            value={email}
                            disabled={verified}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                        <button
                            type="button"
                            disabled={busy || verified}
                            onClick={handleSendCode}
                            className="rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            인증 요청
                        </button>
                    </div>
                </Field>
                {codeSent && !verified && (
                    <Field label="인증번호">
                        <div className="flex gap-2">
                            <input
                                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
                                inputMode="numeric"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                            <button
                                type="button"
                                disabled={busy}
                                onClick={handleVerifyCode}
                                className="rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                확인
                            </button>
                        </div>
                    </Field>
                )}
                <Field label="닉네임">
                    <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        value={nickname}
                        maxLength={20}
                        onChange={(e) => setNickname(e.target.value)}
                        autoComplete="nickname"
                    />
                </Field>
                <Field label="비밀번호">
                    <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                </Field>
                <Field label="비밀번호 확인">
                    <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        autoComplete="new-password"
                    />
                </Field>
                {message && <p className="text-sm text-slate-600">{message}</p>}
                <button
                    className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
                    disabled={busy}
                >
                    회원가입
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
                이미 계정이 있나요?{' '}
                <Link className="font-semibold text-brand" to="/login">
                    로그인
                </Link>
            </p>
        </AuthLayout>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">{label}</span>
            {children}
        </label>
    )
}

function AuthLayout({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-full w-full items-center justify-center bg-slate-50 px-6 py-12">
            <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm">
                <div className="mb-7 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                        <SparklesIcon size={23} />
                    </div>
                    <h1 className="mt-4 text-2xl font-extrabold">{title}</h1>
                </div>
                {children}
            </div>
        </div>
    )
}
