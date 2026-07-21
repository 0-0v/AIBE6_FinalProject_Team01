import React from 'react'
import { useNavigate } from 'react-router-dom'
import { SparklesIcon } from 'lucide-react'

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

export function Login() {
    const navigate = useNavigate()

    function handleSocialLogin(id: string) {
        if (id === 'kakao') {
            window.location.assign(KAKAO_LOGIN_URL)
            return
        }
        navigate('/app')
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
                        소셜 계정으로 간편하게 가입하세요.
                        <br />
                        닉네임은 계정 이름으로 자동 설정돼요.
                    </p>
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
