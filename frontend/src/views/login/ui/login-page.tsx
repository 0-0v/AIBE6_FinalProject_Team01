import React, { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/features/local-auth'
import { getApiErrorMessage } from '@/shared/api/client'
import { getLastLoginProvider } from '@/shared/lib'
import { BrandLogo } from '@/shared/ui'
import { TestAccountLogin, type TestAccount } from './test-account-login'

const socials = [
    {
        id: 'google',
        provider: 'GOOGLE',
        label: '구글로 시작하기',
        bg: '#ffffff',
        color: '#1f1f1f',
        border: true,
        iconSrc: '/google-g-logo.png',
        iconAlt: 'Google',
    },
    {
        id: 'kakao',
        provider: 'KAKAO',
        label: '카카오로 시작하기',
        bg: '#FEE500',
        color: '#191600',
        iconSrc: '/kakao-symbol.svg',
        iconAlt: '카카오',
    },
]

const KAKAO_LOGIN_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2/authorization/kakao`
const GOOGLE_LOGIN_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2/authorization/google`

export function Login() {
    const navigate = useNavigate()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState(() => {
        const error = new URLSearchParams(window.location.search).get('error')
        if (error === 'email_already_registered') {
            return '이미 다른 로그인 방식으로 가입된 이메일입니다. 기존 로그인 방식을 이용해 주세요.'
        }
        if (error === 'withdrawn_account_retained') {
            return '탈퇴 계정의 개인정보 보관기간이 아직 지나지 않아 같은 이메일 또는 소셜 계정으로 재가입할 수 없습니다. 보관기간이 끝난 후 다시 시도해 주세요.'
        }
        if (error === 'oauth2_login_failed') {
            return '소셜 로그인에 실패했습니다. 다시 시도해 주세요.'
        }
        return ''
    })
    const [busy, setBusy] = useState(false)
    const [lastLoginProvider] = useState(getLastLoginProvider)

    function handleSocialLogin(id: string) {
        if (id === 'kakao') {
            window.location.assign(KAKAO_LOGIN_URL)
            return
        }
        if (id === 'google') {
            window.location.assign(GOOGLE_LOGIN_URL)
            return
        }
        navigate('/app')
    }

    async function performLogin(
        loginIdentifier: string,
        loginPassword: string,
    ) {
        if (!loginIdentifier.trim()) {
            setMessage('닉네임 또는 이메일을 입력해 주세요.')
            return
        }
        if (!loginPassword) {
            setMessage('비밀번호를 입력해 주세요.')
            return
        }
        setBusy(true)
        setMessage('')
        try {
            await login(loginIdentifier.trim(), loginPassword)
            const returnPath = sessionStorage.getItem('postLoginReturnPath')
            sessionStorage.removeItem('postLoginReturnPath')
            navigate(returnPath ?? '/app', { replace: true })
        } catch (error) {
            setMessage(getApiErrorMessage(error, '로그인에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    async function handleLocalLogin(event: FormEvent) {
        event.preventDefault()
        await performLogin(identifier, password)
    }

    function handleTestAccountLogin(account: TestAccount) {
        setIdentifier(account.nickname)
        setPassword(account.password)
        void performLogin(account.identifier, account.password)
    }

    return (
        <div className="flex min-h-full w-full items-center justify-center bg-slate-50 px-6 py-12">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <Link
                        to="/"
                        aria-label="Plamingo 랜딩 페이지로 이동"
                        className="mx-auto flex h-16 w-16 items-center justify-center transition hover:-translate-y-0.5"
                    >
                        <BrandLogo />
                    </Link>
                    <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
                        Plamingo 시작하기
                    </h1>
                    <p className="text-xs text-slate-400">
                        Plan Together, Travel Better
                    </p>
                </div>

                <form
                    className="space-y-3"
                    noValidate
                    onSubmit={handleLocalLogin}
                >
                    <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                        type="text"
                        placeholder="닉네임 또는 이메일"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        autoComplete="username"
                        required
                    />
                    <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                    {message && (
                        <p className="text-sm text-red-600">{message}</p>
                    )}
                    <button
                        disabled={busy}
                        className="relative w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {lastLoginProvider === 'LOCAL' && <RecentLoginBadge />}
                        로그인
                    </button>
                </form>
                <div className="mt-3 flex justify-between text-xs">
                    <Link className="text-slate-500" to="/password-reset">
                        비밀번호를 잊으셨나요?
                    </Link>
                    <Link className="font-semibold text-brand" to="/signup">
                        회원가입
                    </Link>
                </div>
                <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />
                    또는
                    <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="space-y-3">
                    {socials.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSocialLogin(s.id)}
                            className={`relative flex w-full items-center justify-center rounded-xl px-4 py-3 text-xs font-semibold transition hover:opacity-90 ${
                                s.border ? 'border border-slate-300' : ''
                            }`}
                            style={{ backgroundColor: s.bg, color: s.color }}
                        >
                            {lastLoginProvider === s.provider && (
                                <RecentLoginBadge />
                            )}
                            <span className="grid grid-cols-[1rem_6.5rem] items-center gap-2">
                                <img
                                    className="h-4 w-4 object-contain"
                                    src={s.iconSrc}
                                    alt={s.iconAlt}
                                />
                                <span className="text-left">{s.label}</span>
                            </span>
                        </button>
                    ))}
                </div>

                <TestAccountLogin
                    busy={busy}
                    onLogin={handleTestAccountLogin}
                />

                <p className="mt-8 text-center text-xs leading-relaxed text-slate-400">
                    가입 시{' '}
                    <Link
                        to="/terms"
                        className="underline underline-offset-2 hover:text-slate-600"
                    >
                        이용약관
                    </Link>{' '}
                    및{' '}
                    <Link
                        to="/privacy"
                        className="underline underline-offset-2 hover:text-slate-600"
                    >
                        개인정보처리방침
                    </Link>
                    에 동의하게 됩니다.
                </p>
            </div>
        </div>
    )
}

function RecentLoginBadge() {
    return (
        <span className="absolute -top-2 left-4 rounded bg-slate-900 px-2 py-1 text-[10px] font-medium leading-none text-white shadow-sm">
            최근 로그인
        </span>
    )
}
