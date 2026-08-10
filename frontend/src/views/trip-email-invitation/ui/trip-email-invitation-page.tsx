import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { consumeTripEmailInvitation } from '@/features/manage-trip'
import { BrandLogo } from '@/shared/ui'

export function TripEmailInvitationPage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const handledRef = useRef(false)
    const [error, setError] = useState<string | null>(null)

    const moveToLogin = useCallback(() => {
        if (!token) return
        sessionStorage.setItem(
            'postLoginReturnPath',
            `/trip-invite/${encodeURIComponent(token)}?afterLogin=1`,
        )
        navigate('/login', { replace: true })
    }, [navigate, token])

    useEffect(() => {
        if (!token || handledRef.current) return
        handledRef.current = true

        const params = new URLSearchParams(window.location.search)
        if (params.get('afterLogin') !== '1') {
            moveToLogin()
            return
        }

        consumeTripEmailInvitation(token)
            .then((result) => {
                navigate(`/app/room/${result.tripId}`, { replace: true })
            })
            .catch((caught: unknown) => {
                setError(
                    caught instanceof Error
                        ? caught.message
                        : '초대 링크를 사용할 수 없습니다.',
                )
            })
    }, [moveToLogin, navigate, token])

    return (
        <main className="flex min-h-full items-center justify-center bg-[#fff7f8] px-6 py-12">
            <section className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-[0_24px_70px_rgba(33,60,81,0.14)]">
                <span className="mx-auto flex h-16 w-16 items-center justify-center">
                    <BrandLogo />
                </span>
                <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
                    {error
                        ? '초대 링크를 확인해 주세요'
                        : '여행방에 참여하고 있어요'}
                </h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                    {error ??
                        '초대받은 계정으로 로그인한 뒤 여행방으로 이동합니다.'}
                </p>
                {error && (
                    <button
                        type="button"
                        onClick={moveToLogin}
                        className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white"
                    >
                        로그인 페이지로 이동
                    </button>
                )}
            </section>
        </main>
    )
}
