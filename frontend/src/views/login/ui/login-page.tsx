import React, { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SparklesIcon } from 'lucide-react'
import { login } from '@/features/local-auth'
import { getApiErrorMessage } from '@/shared/api/client'

const socials = [
    {
        id: 'google',
        label: 'Google로 계속하기',
        bg: '#ffffff',
        color: '#0f172a',
        border: true,
        mark: 'G',
    },
    {
        id: 'kakao',
        label: '카카오로 계속하기',
        bg: '#FEE500',
        color: '#191600',
        mark: 'K',
    },
    {
        id: 'naver',
        label: '네이버로 계속하기',
        bg: '#03C75A',
        color: '#ffffff',
        mark: 'N',
    },
    {
        id: 'apple',
        label: 'Apple로 계속하기',
        bg: '#0f172a',
        color: '#ffffff',
        mark: '',
    },
]

const KAKAO_LOGIN_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2/authorization/kakao`
const GOOGLE_LOGIN_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2/authorization/google`

export function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)

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
        setBusy(true)
        try {
            await login(email, password)
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
                    <p className="mt-2 text-sm text-slate-500">
                        이메일 또는 소셜 계정으로 시작하세요.
                    </p>
                </div>

                <form className="space-y-3" onSubmit={handleLocalLogin}>
                    <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
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
                        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        이메일로 로그인
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
                            onClick={() => handleSocialLogin(s.id)}
                            className={`flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 ${
                                s.border ? 'border border-slate-300' : ''
                            }`}
                            style={{ backgroundColor: s.bg, color: s.color }}
                        >
                            {s.mark ? (
                                <span className="text-base font-bold">
                                    {s.mark}
                                </span>
                            ) : (
                                <span aria-hidden></span>
                            )}
                            {s.label}
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
