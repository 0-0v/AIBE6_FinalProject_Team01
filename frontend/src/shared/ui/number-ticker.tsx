'use client'

import { useEffect, useRef, useState } from 'react'

interface NumberTickerProps {
    value: number
    duration?: number
    prefix?: string
    suffix?: string
    className?: string
    style?: React.CSSProperties
}

export function NumberTicker({
    value,
    duration = 1800,
    prefix = '',
    suffix = '',
    className,
    style,
}: NumberTickerProps) {
    const [current, setCurrent] = useState(0)
    const startRef = useRef<number | null>(null)
    const rafRef = useRef<number | null>(null)
    const triggered = useRef(false)
    const containerRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        // value/duration이 바뀌면 다시 카운트업할 수 있도록 리셋
        triggered.current = false

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !triggered.current) {
                    triggered.current = true
                    setCurrent(0)
                    startRef.current = null
                    const animate = (now: number) => {
                        if (!startRef.current) startRef.current = now
                        const progress = Math.min((now - startRef.current) / duration, 1)
                        const eased = 1 - Math.pow(1 - progress, 3)
                        setCurrent(Math.round(eased * value))
                        if (progress < 1) {
                            rafRef.current = requestAnimationFrame(animate)
                        }
                    }
                    rafRef.current = requestAnimationFrame(animate)
                }
            },
            { threshold: 0.5 },
        )
        if (containerRef.current) observer.observe(containerRef.current)
        return () => {
            triggered.current = false
            observer.disconnect()
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [value, duration])

    return (
        <span ref={containerRef} className={className} style={style}>
            {prefix}
            {current.toLocaleString()}
            {suffix}
        </span>
    )
}
