import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAccessToken } from '@/shared/api/client'
import { fetchCurrentUser } from '@/shared/api/current-user'
import { setLastLoginProvider } from '@/shared/lib'
import { useCurrentUserStore } from '@/shared/model'

export function OAuthCallback() {
    const navigate = useNavigate()
    const setCurrentUser = useCurrentUserStore((state) => state.setCurrentUser)
    const handledRef = useRef(false)

    useEffect(() => {
        if (handledRef.current) {
            return
        }
        handledRef.current = true

        const params = new URLSearchParams(window.location.search)
        const accessToken = params.get('accessToken')

        if (!accessToken) {
            navigate('/login', { replace: true })
            return
        }

        setAccessToken(accessToken)

        fetchCurrentUser(accessToken)
            .then((user) => {
                if (!user) {
                    throw new Error('사용자 정보를 불러오지 못했습니다.')
                }
                setCurrentUser(user)
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
    }, [navigate, setCurrentUser])

    return null
}
