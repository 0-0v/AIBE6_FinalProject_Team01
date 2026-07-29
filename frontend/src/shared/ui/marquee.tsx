'use client'

import { useEffect, useRef } from 'react'

interface MarqueeProps {
    items: string[]
    speed?: number
    gap?: number
    className?: string
    itemClassName?: string
    itemStyle?: React.CSSProperties
    style?: React.CSSProperties
}

const KEYFRAME_ID = 'pl-marquee-kf'

export function Marquee({
    items,
    speed = 28,
    gap = 40,
    className,
    itemClassName,
    itemStyle,
    style,
}: MarqueeProps) {
    const injected = useRef(false)

    useEffect(() => {
        if (injected.current || document.getElementById(KEYFRAME_ID)) return
        injected.current = true
        const s = document.createElement('style')
        s.id = KEYFRAME_ID
        s.textContent = `@keyframes pl-marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`
        document.head.appendChild(s)
    }, [])

    // double items for seamless loop
    const doubled = [...items, ...items]
    const animDuration = (items.length * 100) / speed

    return (
        <div
            className={className}
            style={{
                overflow: 'hidden',
                display: 'flex',
                userSelect: 'none',
                ...style,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    gap,
                    animation: `pl-marquee-scroll ${animDuration}s linear infinite`,
                    whiteSpace: 'nowrap',
                    willChange: 'transform',
                }}
            >
                {doubled.map((item, i) => (
                    <span
                        key={`${i < items.length ? 'a' : 'b'}-${i}`}
                        className={itemClassName}
                        style={itemStyle}
                    >
                        {item}
                    </span>
                ))}
            </div>
        </div>
    )
}
