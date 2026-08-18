import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeOAuthLoginCode } from '@/features/local-auth'
import { setAccessToken } from '@/shared/api/client'
import { setLastLoginProvider } from '@/shared/lib'

export function OAuthCallback() {
    const navigate = useNavigate()
    const handledRef = useRef(false)

    useEffect(() => {
        if (handledRef.current) {
            return
        }
        handledRef.current = true

        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        // 콜백 URL의 코드는 1회용이며 브라우저 방문 기록에 남는 것을 최소화하기 위해
        // 사용 여부와 관계없이 즉시 쿼리 파라미터를 제거한다.
        window.history.replaceState(null, '', window.location.pathname)

        if (!code) {
            navigate('/login', { replace: true })
            return
        }

        exchangeOAuthLoginCode(code)
            .then((user) => {
                if (!user) {
                    throw new Error('사용자 정보를 불러오지 못했습니다.')
                }
                if (user.provider === 'GOOGLE' || user.provider === 'KAKAO') {
                    setLastLoginProvider(user.provider)
                }
                if (user.role === 'SUB_ADMIN') {
                    navigate('/admin/login', { replace: true })
                    return
                }
                const returnPath = sessionStorage.getItem('postLoginReturnPath')
                sessionStorage.removeItem('postLoginReturnPath')
                navigate(returnPath ?? '/app', { replace: true })
            })
            .catch(() => {
                setAccessToken(null)
                navigate('/login?error=oauth2_login_failed', {
                    replace: true,
                })
            })
    }, [navigate])

    return null
}
