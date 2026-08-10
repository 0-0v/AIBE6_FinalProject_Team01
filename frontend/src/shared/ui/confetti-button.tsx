'use client'

import React, { useRef } from 'react'
import { DESIGN_COLORS } from '@/shared/config'

interface ConfettiButtonProps {
    onClick?: () => void
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
    as?: 'button' | 'a'
}

const COLORS = [
    DESIGN_COLORS.landing.coral,
    DESIGN_COLORS.landing.pink,
    DESIGN_COLORS.landing.purple,
    DESIGN_COLORS.landing.lavender,
    DESIGN_COLORS.landing.yellow,
    DESIGN_COLORS.landing.coralStrong,
    DESIGN_COLORS.landing.cream,
]

export function ConfettiButton({
    onClick,
    children,
    className,
    style,
    as = 'button',
}: ConfettiButtonProps) {
    const containerRef = useRef<HTMLSpanElement>(null)

    const launch = () => {
        const origin = containerRef.current?.getBoundingClientRect()
        const cx = origin
            ? origin.left + origin.width / 2
            : window.innerWidth / 2
        const cy = origin
            ? origin.top + origin.height / 2
            : window.innerHeight / 2

        const canvas = document.createElement('canvas')
        canvas.style.cssText =
            'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999'
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        document.body.appendChild(canvas)
        const ctx = canvas.getContext('2d')!

        const particles = Array.from({ length: 100 }, () => ({
            x: cx,
            y: cy,
            vx: (Math.random() - 0.5) * 16,
            vy: -(Math.random() * 14 + 5),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            w: Math.random() * 7 + 3,
            h: Math.random() * 12 + 5,
            alpha: 1,
            rot: Math.random() * Math.PI * 2,
            rotV: (Math.random() - 0.5) * 0.22,
        }))

        let rafId: number
        let frame = 0

        const cleanup = () => {
            cancelAnimationFrame(rafId)
            if (canvas.isConnected) canvas.remove()
        }

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            for (const p of particles) {
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.4
                p.vx *= 0.97
                p.alpha -= 0.012
                p.rot += p.rotV
                if (p.alpha <= 0) continue
                ctx.save()
                ctx.globalAlpha = Math.max(0, p.alpha)
                ctx.translate(p.x, p.y)
                ctx.rotate(p.rot)
                ctx.fillStyle = p.color
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
                ctx.restore()
            }
            frame++
            if (frame < 130) {
                rafId = requestAnimationFrame(loop)
            } else {
                cleanup()
            }
        }
        rafId = requestAnimationFrame(loop)
        onClick?.()
    }

    const Tag = as

    return (
        <span ref={containerRef} style={{ display: 'inline-block' }}>
            <Tag className={className} style={style} onClick={launch}>
                {children}
            </Tag>
        </span>
    )
}
