import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCurrentUser } from '../lib/api/current-user'
import { useCurrentUserStore } from '../stores/current-user-store'

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
        const refreshToken = params.get('refreshToken')

        if (!accessToken || !refreshToken) {
            navigate('/login', { replace: true })
            return
        }

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        fetchCurrentUser(accessToken)
            .then((user) => {
                if (user) {
                    setCurrentUser(user)
                }
            })
            .finally(() => {
                navigate('/app', { replace: true })
            })
    }, [navigate, setCurrentUser])

    return null
}
