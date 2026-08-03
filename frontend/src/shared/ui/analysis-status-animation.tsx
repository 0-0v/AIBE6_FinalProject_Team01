'use client'

import Lottie from 'lottie-react'
import successAnimation from '@/shared/assets/success.json'

const LOADING_SEGMENT: [number, number] = [0, 80]

type Props = {
    phase: 'loading' | 'complete'
    size?: number
    onComplete?: () => void
}

export function AnalysisStatusAnimation({
    phase,
    size = 80,
    onComplete,
}: Props) {
    const loading = phase === 'loading'

    return (
        <Lottie
            key={phase}
            animationData={successAnimation}
            loop={loading}
            initialSegment={loading ? LOADING_SEGMENT : undefined}
            onComplete={loading ? undefined : onComplete}
            aria-hidden="true"
            style={{ width: size, height: size }}
        />
    )
}
