'use client'

import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SparklesIcon } from 'lucide-react'
import {
    confirmVerificationCode,
    resetPassword,
    sendVerificationCode,
} from '@/features/local-auth'
import { getApiErrorMessage } from '@/shared/api/client'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=])[A-Za-z\d!@#$%^&*()_+\-=]{8,64}$/

export function PasswordResetPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [sent, setSent] = useState(false)
    const [verified, setVerified] = useState(false)
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)

    async function sendCode() {
        if (!emailPattern.test(email))
            return setMessage('올바른 이메일을 입력해 주세요.')
        setBusy(true)
        try {
            await sendVerificationCode(email, 'PASSWORD_RESET')
            setSent(true)
            setMessage(
                '가입된 로컬 계정이라면 인증번호가 전송되었습니다.',
            )
        } catch (error) {
            setMessage(getApiErrorMessage(error, '요청 처리에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    async function verifyCode() {
        if (!/^\d{6}$/.test(code))
            return setMessage('인증번호 6자리를 입력해 주세요.')
        setBusy(true)
        try {
            await confirmVerificationCode(email, code, 'PASSWORD_RESET')
            setVerified(true)
            setMessage('이메일 인증이 완료되었습니다.')
        } catch (error) {
            setMessage(getApiErrorMessage(error, '이메일 인증에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    async function submit(event: FormEvent) {
        event.preventDefault()
        if (!verified) return setMessage('이메일 인증을 완료해 주세요.')
        if (!passwordPattern.test(password))
            return setMessage(
                '비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.',
            )
        if (password !== confirm)
            return setMessage('비밀번호가 일치하지 않습니다.')
        setBusy(true)
        try {
            await resetPassword(email, password)
            navigate('/login', { replace: true })
        } catch (error) {
            setMessage(getApiErrorMessage(error, '비밀번호 변경에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex min-h-full w-full items-center justify-center bg-slate-50 px-6 py-12">
            <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm">
                <div className="mb-7 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                        <SparklesIcon size={23} />
                    </div>
                    <h1 className="mt-4 text-2xl font-extrabold">
                        비밀번호 재설정
                    </h1>
                </div>
                <form className="space-y-4" onSubmit={submit}>
                    <label className="block text-sm font-medium">
                        <span className="mb-1.5 block">이메일</span>
                        <div className="flex gap-2">
                            <input
                                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
                                type="email"
                                value={email}
                                disabled={verified}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={sendCode}
                                disabled={busy || verified}
                                className="rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                인증 요청
                            </button>
                        </div>
                    </label>
                    {sent && !verified && (
                        <label className="block text-sm font-medium">
                            <span className="mb-1.5 block">인증번호</span>
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
                                    onClick={verifyCode}
                                    disabled={busy}
                                    className="rounded-xl bg-brand px-4 text-sm font-semibold text-white"
                                >
                                    확인
                                </button>
                            </div>
                        </label>
                    )}
                    <label className="block text-sm font-medium">
                        <span className="mb-1.5 block">새 비밀번호</span>
                        <input
                            className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    </label>
                    <label className="block text-sm font-medium">
                        <span className="mb-1.5 block">비밀번호 확인</span>
                        <input
                            className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                        />
                    </label>
                    {message && (
                        <p className="text-sm text-slate-600">{message}</p>
                    )}
                    <button
                        disabled={busy}
                        className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
                    >
                        비밀번호 변경
                    </button>
                </form>
                <p className="mt-6 text-center text-sm">
                    <Link className="font-semibold text-brand" to="/login">
                        로그인으로 돌아가기
                    </Link>
                </p>
            </div>
        </div>
    )
}
