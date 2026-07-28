import React, { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SparklesIcon } from 'lucide-react'
import { login } from '@/features/local-auth'
import { getApiErrorMessage } from '@/shared/api/client'
import { getLastLoginProvider } from '@/shared/lib'

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
    const [message, setMessage] = useState('')
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

    async function handleLocalLogin(event: FormEvent) {
        event.preventDefault()
        if (!identifier.trim()) {
            setMessage('닉네임 또는 이메일을 입력해 주세요.')
            return
        }
        if (!password) {
            setMessage('비밀번호를 입력해 주세요.')
            return
        }
        setBusy(true)
        try {
            await login(identifier.trim(), password)
            navigate('/app', { replace: true })
        } catch (error) {
            setMessage(getApiErrorMessage(error, '로그인에 실패했습니다.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex min-h-full w-full items-center justify-center bg-slate-50 px-6 py-12">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
                        <SparklesIcon size={26} />
                    </div>
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

                <p className="mt-8 text-center text-xs leading-relaxed text-slate-400">
                    가입 시 <span className="underline">이용약관</span> 및{' '}
                    <span className="underline">개인정보처리방침</span>에
                    동의하게 됩니다.
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
