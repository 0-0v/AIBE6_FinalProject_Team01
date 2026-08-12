'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const EMAIL_VERIFICATION_COOLDOWN_SECONDS = 5 * 60

export function useEmailVerificationCooldown() {
    const [remainingSeconds, setRemainingSeconds] = useState(0)

    useEffect(() => {
        if (remainingSeconds <= 0) return

        const timer = window.setTimeout(() => {
            setRemainingSeconds((seconds) => Math.max(0, seconds - 1))
        }, 1000)

        return () => window.clearTimeout(timer)
    }, [remainingSeconds])

    const startCooldown = useCallback((seconds?: number | null) => {
        setRemainingSeconds(
            seconds && seconds > 0
                ? Math.ceil(seconds)
                : EMAIL_VERIFICATION_COOLDOWN_SECONDS,
        )
    }, [])

    const formattedRemaining = useMemo(() => {
        const minutes = Math.floor(remainingSeconds / 60)
        const seconds = remainingSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }, [remainingSeconds])

    return {
        formattedRemaining,
        isCoolingDown: remainingSeconds > 0,
        startCooldown,
    }
}
