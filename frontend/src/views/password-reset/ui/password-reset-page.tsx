'use client'

import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SparklesIcon } from 'lucide-react'
import {
    confirmVerificationCode,
    hasRepeatedPasswordCharacters,
    isPasswordValid,
    PasswordField,
    resetPassword,
    sendVerificationCode,
} from '@/features/local-auth'
import { getApiErrorMessage } from '@/shared/api/client'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function PasswordResetPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [sent, setSent] = useState(false)
    const [verified, setVerified] = useState(false)
    const [emailMessage, setEmailMessage] = useState('')
    const [emailError, setEmailError] = useState(false)
    const [codeMessage, setCodeMessage] = useState('')
    const [codeError, setCodeError] = useState(false)
    const [shakeCount, setShakeCount] = useState(0)
    const [passwordError, setPasswordError] = useState('')
    const [confirmError, setConfirmError] = useState('')
    const [busy, setBusy] = useState(false)

    async function sendCode() {
        if (!emailPattern.test(email)) {
            setEmailError(true)
            return setEmailMessage('올바른 이메일을 입력해 주세요.')
        }
        setBusy(true)
        setEmailError(false)
        try {
            await sendVerificationCode(email, 'PASSWORD_RESET')
            setSent(true)
            setCode('')
            setVerified(false)
            setCodeMessage('')
            setCodeError(false)
            setEmailMessage(
                '입력하신 이메일로 인증번호를 전송했습니다.',
            )
        } catch (error) {
            setEmailError(true)
            setEmailMessage(
                getApiErrorMessage(error, '인증번호 전송에 실패했습니다.'),
            )
        } finally {
            setBusy(false)
        }
    }

    async function verifyCode() {
        if (!/^\d{6}$/.test(code)) {
            showCodeError('인증번호 6자리를 입력해 주세요.')
            return
        }
        setBusy(true)
        try {
            await confirmVerificationCode(email, code, 'PASSWORD_RESET')
            setVerified(true)
            setCodeError(false)
            setCodeMessage('')
            setEmailError(false)
            setEmailMessage('인증되었습니다.')
        } catch (error) {
            showCodeError(
                getApiErrorMessage(
                    error,
                    '인증번호가 올바르지 않거나 만료되었습니다.',
                ),
            )
        } finally {
            setBusy(false)
        }
    }

    async function submit(event: FormEvent) {
        event.preventDefault()
        if (!verified) {
            if (sent) showCodeError('이메일 인증을 완료해 주세요.')
            else setEmailMessage('이메일 인증을 완료해 주세요.')
            return
        }
        if (!isPasswordValid(password)) {
            setPasswordError(
                hasRepeatedPasswordCharacters(password)
                    ? '동일한 문자 또는 숫자를 3번 이상 연속 사용할 수 없습니다.'
                    : '비밀번호는 8~64자로 입력해 주세요.',
            )
            return
        }
        if (password !== confirm) {
            setConfirmError('비밀번호가 일치하지 않습니다.')
            return
        }
        setBusy(true)
        try {
            await resetPassword(email, password)
            navigate('/login', { replace: true })
        } catch (error) {
            setPasswordError(
                getApiErrorMessage(error, '비밀번호 변경에 실패했습니다.'),
            )
        } finally {
            setBusy(false)
        }
    }

    function showCodeError(message: string) {
        setCodeError(true)
        setCodeMessage(message)
        setShakeCount((count) => count + 1)
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
                <form className="space-y-4" noValidate onSubmit={submit}>
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
                        {emailMessage && (
                            <span
                                className={`mt-2 block text-sm ${
                                    verified
                                        ? 'text-emerald-600'
                                        : emailError
                                          ? 'text-red-600'
                                        : 'text-slate-600'
                                }`}
                            >
                                {emailMessage}
                            </span>
                        )}
                    </label>
                    {sent && !verified && (
                        <label className="block text-sm font-medium">
                            <span className="mb-1.5 block">인증번호</span>
                            <div
                                key={shakeCount}
                                className={`flex gap-2 ${
                                    codeError ? 'auth-field-shake' : ''
                                }`}
                            >
                                <input
                                    className={`min-w-0 flex-1 rounded-xl border px-4 py-3 outline-none transition-colors ${
                                        codeError
                                            ? 'border-red-500 focus:border-red-500'
                                            : verified
                                              ? 'border-emerald-500'
                                              : 'border-slate-300 focus:border-brand'
                                    }`}
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={code}
                                    disabled={verified}
                                    aria-invalid={codeError}
                                    aria-describedby="verification-code-message"
                                    onChange={(e) => {
                                        setCode(e.target.value)
                                        setCodeError(false)
                                        setCodeMessage('')
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={verifyCode}
                                    disabled={busy || verified}
                                    className="rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    확인
                                </button>
                            </div>
                            {codeMessage && (
                                <span
                                    id="verification-code-message"
                                    className={`mt-2 block text-sm ${
                                        codeError
                                            ? 'text-red-600'
                                            : 'text-emerald-600'
                                    }`}
                                >
                                    {codeMessage}
                                </span>
                            )}
                        </label>
                    )}
                    <PasswordField
                        label="새 비밀번호"
                        value={password}
                        onChange={(value) => {
                            setPassword(value)
                            setPasswordError('')
                        }}
                        autoComplete="new-password"
                        error={passwordError}
                        showGuidance
                    />
                    <PasswordField
                        label="비밀번호 확인"
                        value={confirm}
                        onChange={(value) => {
                            setConfirm(value)
                            setConfirmError('')
                        }}
                        autoComplete="new-password"
                        error={confirmError}
                    />
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
