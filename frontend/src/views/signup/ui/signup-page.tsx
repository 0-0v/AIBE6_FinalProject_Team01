'use client'

import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    checkNicknameAvailability,
    confirmVerificationCode,
    hasRepeatedPasswordCharacters,
    isPasswordValid,
    PasswordField,
    sendVerificationCode,
    signup,
} from '@/features/local-auth'
import { getApiErrorCode, getApiErrorMessage } from '@/shared/api/client'
import { BrandLogo } from '@/shared/ui'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const nicknamePattern = /^[가-힣a-zA-Z0-9_]+$/
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
    const [emailError, setEmailError] = useState('')
    const [nicknameError, setNicknameError] = useState('')
    const [checkedNickname, setCheckedNickname] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordConfirmError, setPasswordConfirmError] = useState('')
    const [busy, setBusy] = useState(false)

    async function handleSendCode() {
        if (!emailPattern.test(email)) {
            setEmailError('올바른 이메일 형식으로 입력해 주세요.')
            return
        }
        setEmailError('')
        setBusy(true)
        try {
            await sendVerificationCode(email, 'SIGNUP')
            setCodeSent(true)
            setVerified(false)
            setMessage('인증번호를 전송했습니다.')
        } catch (error) {
            setEmailError(
                getApiErrorMessage(error, '인증번호 전송에 실패했습니다.'),
            )
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
            setEmailError('')
            setMessage('')
        } catch (error) {
            setMessage(getApiErrorMessage(error, '이메일 인증에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    async function handleCheckNickname() {
        const normalizedNickname = nickname.trim()
        if (normalizedNickname.length < 2 || normalizedNickname.length > 12) {
            setNicknameError('닉네임은 2~12자로 입력해 주세요.')
            return
        }
        if (!nicknamePattern.test(normalizedNickname)) {
            setNicknameError(
                '닉네임은 한글, 영문, 숫자, _만 사용할 수 있습니다.',
            )
            return
        }

        setBusy(true)
        try {
            const available =
                await checkNicknameAvailability(normalizedNickname)
            if (!available) {
                setCheckedNickname('')
                setNicknameError('이미 사용 중인 닉네임입니다.')
                return
            }
            setCheckedNickname(normalizedNickname)
            setNicknameError('')
        } catch (error) {
            setNicknameError(
                getApiErrorMessage(error, '닉네임 중복 확인에 실패했습니다.'),
            )
        } finally {
            setBusy(false)
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        if (checkedNickname !== nickname.trim()) {
            setNicknameError('닉네임 중복 확인을 완료해 주세요.')
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
        if (password !== passwordConfirm) {
            setPasswordConfirmError('비밀번호가 일치하지 않습니다.')
            return
        }

        setBusy(true)
        try {
            await signup(email, password, nickname.trim())
            navigate('/app', { replace: true })
        } catch (error) {
            if (getApiErrorCode(error) === 'AUTH_400_NOT_VERIFIED') {
                setVerified(false)
                setCodeSent(false)
                setCode('')
                setEmailError(
                    '이메일 인증이 만료되었습니다. 다시 인증해 주세요.',
                )
                setMessage('')
                return
            }
            const errorMessage = getApiErrorMessage(
                error,
                '회원가입에 실패했습니다.',
            )
            if (errorMessage === '이미 사용 중인 이메일입니다.') {
                setEmailError(errorMessage)
            } else if (errorMessage === '이미 사용 중인 닉네임입니다.') {
                setCheckedNickname('')
                setNicknameError(errorMessage)
            } else {
                setMessage(errorMessage)
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <AuthLayout title="이메일로 회원가입">
            <form className="space-y-4" noValidate onSubmit={handleSubmit}>
                <Field label="이메일">
                    <div className="flex gap-2">
                        <input
                            className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${
                                emailError
                                    ? 'border-red-400'
                                    : verified
                                      ? 'border-emerald-500'
                                      : 'border-slate-300'
                            }`}
                            type="email"
                            value={email}
                            disabled={verified}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setEmailError('')
                                setMessage('')
                                setCode('')
                                setCodeSent(false)
                            }}
                            autoComplete="email"
                            aria-invalid={Boolean(emailError)}
                            aria-describedby="signup-email-status"
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
                    {(emailError || verified) && (
                        <p
                            id="signup-email-status"
                            className={`mt-1.5 text-xs font-normal ${
                                emailError ? 'text-red-600' : 'text-emerald-600'
                            }`}
                        >
                            {emailError || '인증되었습니다.'}
                        </p>
                    )}
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
                    <div className="flex gap-2">
                        <input
                            className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${
                                nicknameError
                                    ? 'border-red-400'
                                    : 'border-slate-300'
                            }`}
                            value={nickname}
                            maxLength={12}
                            onChange={(e) => {
                                setNickname(e.target.value)
                                setCheckedNickname('')
                                setNicknameError('')
                            }}
                            autoComplete="nickname"
                            aria-invalid={Boolean(nicknameError)}
                            aria-describedby="signup-nickname-status"
                        />
                        <button
                            type="button"
                            disabled={busy || !nickname.trim()}
                            onClick={handleCheckNickname}
                            className="rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            중복 확인
                        </button>
                    </div>
                    {(nicknameError ||
                        (Boolean(checkedNickname) &&
                            checkedNickname === nickname.trim())) && (
                        <p
                            id="signup-nickname-status"
                            className={`mt-1.5 text-xs font-normal ${
                                nicknameError
                                    ? 'text-red-600'
                                    : 'text-green-600'
                            }`}
                        >
                            {nicknameError || '사용 가능한 닉네임입니다.'}
                        </p>
                    )}
                </Field>
                <PasswordField
                    label="비밀번호"
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
                    value={passwordConfirm}
                    onChange={(value) => {
                        setPasswordConfirm(value)
                        setPasswordConfirmError('')
                    }}
                    autoComplete="new-password"
                    error={passwordConfirmError}
                />
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

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
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
                    <div className="mx-auto flex h-14 w-14 items-center justify-center">
                        <BrandLogo />
                    </div>
                    <h1 className="mt-4 text-2xl font-extrabold">{title}</h1>
                </div>
                {children}
            </div>
        </div>
    )
}
