'use client'

/* eslint-disable react/no-unescaped-entities */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfettiButton } from '@/shared/ui/confetti-button'
import { NumberTicker } from '@/shared/ui/number-ticker'
import { ScrollProgressBar } from '@/shared/ui/scroll-progress-bar'
import { WordRotate } from '@/shared/ui/word-rotate'
import { useCurrentUserStore } from '@/shared/model'
import { BrandLogo } from '@/shared/ui'

const LANDING_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Gothic+A1:wght@800;900&display=swap');
  @font-face {
    font-family: 'BMDOHYEON';
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/BMDOHYEON/BMDOHYEON.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/BMDOHYEON/BMDOHYEON.woff') format('woff');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  @keyframes pl-fadeUpIn { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pl-floatY { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
  @keyframes pl-floatY2 { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(10px) rotate(4deg); } }
  @keyframes pl-heroBody { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
  @keyframes pl-heroBag { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-2px); } }
  @keyframes pl-floatPin { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-13px); } }
  @keyframes pl-twinkle { 0%,100% { opacity: 0.5; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.1); } }
  .pl-h { font-family: 'BMDOHYEON', 'Gothic A1', 'Manrope', sans-serif !important; font-weight: 400 !important; letter-spacing: 0 !important; word-break: keep-all; }
  .pl-nav-link { font-weight: 600; font-size: 15px; color: #3A2A28; position: relative; padding-bottom: 2px; background-image: linear-gradient(#FF7A59, #FF7A59); background-size: 0% 2px; background-repeat: no-repeat; background-position: left bottom; transition: background-size 0.25s ease; text-decoration: none; }
  .pl-nav-link:hover { background-size: 100% 2px; }
  .pl-cta-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 28px rgba(255,90,60,0.42) !important; }
  .pl-ghost-btn:hover { transform: translateY(-3px); border-color: #FFB4C6 !important; }
  .pl-h2-hover:hover { transform: scale(1.015); }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  }
  @media (max-width: 720px) {
    #pl-hero { flex-wrap: wrap !important; min-height: auto !important; }
    #pl-hero > div { flex-basis: 100% !important; }
  }
`

/** 반복되는 fadeUpIn 애니메이션 문자열 생성 헬퍼 */
const fadeUpIn = (delayMs: number) =>
    `pl-fadeUpIn 0.8s cubic-bezier(.22,1,.36,1) ${delayMs}ms both`

export function Landing() {
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isInitialized = useCurrentUserStore((state) => state.isInitialized)

    const [scrolled, setScrolled] = useState(false)
    const [revealed, setRevealed] = useState<Record<string, boolean>>({})
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth <= 768,
    )
    const [reduced, setReduced] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    const [ctaHover, setCtaHover] = useState(false)
    const [activeSection, setActiveSection] = useState('problem')
    const [smx, setSmx] = useState(0)
    const [smy, setSmy] = useState(0)

    const startService = useCallback(() => {
        if (!isInitialized) return
        navigate(currentUser ? '/app' : '/login')
    }, [currentUser, isInitialized, navigate])

    const targetMxRef = useRef(0)
    const targetMyRef = useRef(0)
    const smxRef = useRef(0)
    const smyRef = useRef(0)
    const smoothRafRef = useRef<number | null>(null)
    const scrollRafRef = useRef<number | null>(null)
    const ioRef = useRef<IntersectionObserver | null>(null)

    // CSS 주입
    useEffect(() => {
        const style = document.createElement('style')
        style.textContent = LANDING_STYLES
        document.head.appendChild(style)
        return () => {
            document.head.removeChild(style)
        }
    }, [])

    // 스크롤 감지
    useEffect(() => {
        const onScroll = () => {
            if (scrollRafRef.current) return
            scrollRafRef.current = requestAnimationFrame(() => {
                scrollRafRef.current = null
                setScrolled(window.scrollY > 24)
            })
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    // 모바일 감지 + reduced motion
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        const onResize = () => setIsMobile(window.innerWidth <= 768)
        const onMotionChange = (event: MediaQueryListEvent) =>
            setReduced(event.matches)
        window.addEventListener('resize', onResize)
        mq.addEventListener('change', onMotionChange)
        return () => {
            window.removeEventListener('resize', onResize)
            mq.removeEventListener('change', onMotionChange)
        }
    }, [])

    // 마우스 패럴랙스
    useEffect(() => {
        const onMouse = (e: MouseEvent) => {
            if (window.innerWidth <= 768) return
            targetMxRef.current = e.clientX / window.innerWidth - 0.5
            targetMyRef.current = e.clientY / window.innerHeight - 0.5
        }
        window.addEventListener('mousemove', onMouse)

        const loop = () => {
            smxRef.current += (targetMxRef.current - smxRef.current) * 0.08
            smyRef.current += (targetMyRef.current - smyRef.current) * 0.08
            setSmx(smxRef.current)
            setSmy(smyRef.current)
            smoothRafRef.current = requestAnimationFrame(loop)
        }
        smoothRafRef.current = requestAnimationFrame(loop)

        return () => {
            window.removeEventListener('mousemove', onMouse)
            if (smoothRafRef.current) cancelAnimationFrame(smoothRafRef.current)
        }
    }, [])

    // IntersectionObserver 스크롤 리빌
    useEffect(() => {
        ioRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('data-reveal-root')
                        if (id) {
                            setRevealed((prev) => ({ ...prev, [id]: true }))
                            ioRef.current?.unobserve(entry.target)
                        }
                    }
                })
            },
            { threshold: 0.22 },
        )
        document
            .querySelectorAll('[data-reveal-root]')
            .forEach((el) => ioRef.current?.observe(el))
        return () => {
            ioRef.current?.disconnect()
            ioRef.current = null
        }
    }, [])

    // 활성 섹션 추적
    useEffect(() => {
        const update = () => {
            const centerY = window.innerHeight / 2
            let best: string | null = null
            let bestDist = Infinity
            document.querySelectorAll('[data-reveal-root]').forEach((el) => {
                const rect = el.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                const d = Math.abs(mid - centerY)
                if (d < bestDist) {
                    bestDist = d
                    best = el.getAttribute('data-reveal-root')
                }
            })
            if (best) setActiveSection(best)
        }
        update()
        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
        }
    }, [])

    // 헬퍼
    const scrollTo = useCallback(
        (id: string) => (e: React.MouseEvent) => {
            e.preventDefault()
            document.getElementById(id)?.scrollIntoView({
                behavior: reduced ? 'auto' : 'smooth',
                block: 'start',
            })
        },
        [reduced],
    )

    const reveal = (
        id: string,
        delay = 0,
        dist = 26,
        extra: { scale?: number; rotate?: number } = {},
    ): React.CSSProperties => {
        const shown = reduced || revealed[id]
        return {
            opacity: shown ? 1 : 0,
            transform: shown
                ? 'translateY(0) scale(1) rotate(0deg)'
                : `translateY(${dist}px) scale(${extra.scale ?? 1}) rotate(${extra.rotate ?? 0}deg)`,
            transition: `opacity 0.85s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.85s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        }
    }

    const revealCard = (
        id: string,
        delay: number,
        hiddenT: string,
        shownT: string,
    ): React.CSSProperties => {
        const shown = reduced || revealed[id]
        return {
            opacity: shown ? 1 : 0,
            transform: shown ? shownT : hiddenT,
            transition: `opacity 0.95s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.95s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        }
    }

    const sceneParallax = (
        id: string,
        strength: number,
    ): React.CSSProperties => {
        if (isMobile || reduced) return {}
        const el = document.getElementById(id)
        if (!el) return {}
        const rect = el.getBoundingClientRect()
        const vh = window.innerHeight || 1
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh
        const offset = Math.max(-26, Math.min(26, progress * strength))
        return {
            transform: `translateY(${offset}px)`,
            transition: 'transform 0.12s linear',
        }
    }

    const gazeRotate =
        isMobile || reduced ? 0 : Math.max(-3, Math.min(3, smx * 6))
    const heroFlamingoStyle: React.CSSProperties = {
        position: 'relative',
        transform: `translate(${isMobile || reduced ? 0 : smx * 10}px, ${isMobile || reduced ? 0 : smy * 10}px) rotate(${ctaHover ? -6 : gazeRotate}deg) translateX(${ctaHover ? -10 : 0}px) translateY(${ctaHover ? -6 : 0}px)`,
        transition: 'transform 0.45s cubic-bezier(.22,1,.36,1)',
    }

    const journeySteps = [
        ['problem', '문제'],
        ['place', '장소'],
        ['vote', '투표'],
        ['ai', 'AI'],
        ['expense', '정산'],
        ['cta', '출발'],
    ]

    // 공용 스타일 상수
    const CARD_BASE: React.CSSProperties = {
        background: '#FFFDF8',
        border: '2.5px solid #3A2A28',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '3px 3px 0 #3A2A28',
        minHeight: 76,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        justifyContent: 'center',
    }

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '100vw',
                overflowX: 'hidden',
                background: '#FDF3E7',
                fontFamily: "'Manrope', sans-serif",
                color: '#3A2A28',
                WebkitFontSmoothing: 'antialiased',
            }}
        >
            <ScrollProgressBar color="#FF7A59" />

            {/* ── NAV ── */}
            <nav
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '18px clamp(20px,5vw,64px)',
                    transition: 'background 0.35s ease, box-shadow 0.35s ease',
                }}
            >
                {/* nav 배경 블러 레이어 */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: -1,
                        background: scrolled
                            ? 'rgba(255,247,238,0.86)'
                            : 'transparent',
                        backdropFilter: scrolled ? 'blur(16px)' : 'none',
                        boxShadow: scrolled
                            ? '0 1.5px 0 rgba(35,38,75,0.06)'
                            : 'none',
                        transition:
                            'background 0.35s ease, box-shadow 0.35s ease',
                    }}
                />
                <a
                    href="#pl-hero"
                    onClick={scrollTo('pl-hero')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 800,
                        fontSize: 20,
                        color: '#3A2A28',
                        zIndex: 1,
                        textDecoration: 'none',
                    }}
                >
                    <BrandLogo className="h-[34px] w-[34px]" />
                    Plamingo
                </a>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(16px,3vw,36px)',
                        zIndex: 1,
                        flexWrap: 'wrap',
                    }}
                >
                    <a
                        href="#place-section"
                        onClick={scrollTo('place-section')}
                        className="pl-nav-link"
                    >
                        주요 기능
                    </a>
                    <a
                        href="#vote-section"
                        onClick={scrollTo('vote-section')}
                        className="pl-nav-link"
                    >
                        이용 방법
                    </a>
                    <a
                        href="#ai-section"
                        onClick={scrollTo('ai-section')}
                        className="pl-nav-link"
                    >
                        AI 여행 계획
                    </a>
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        zIndex: 1,
                    }}
                >
                    <button
                        onClick={startService}
                        disabled={!isInitialized}
                        style={{
                            background: '#FF7A59',
                            color: '#FDF3E7',
                            fontWeight: 700,
                            fontSize: 14,
                            padding: '9px 20px',
                            borderRadius: 999,
                            border: 'none',
                            cursor: isInitialized ? 'pointer' : 'wait',
                            opacity: isInitialized ? 1 : 0.65,
                            boxShadow: '0 8px 18px rgba(255,90,60,0.28)',
                            fontFamily: "'Manrope', sans-serif",
                        }}
                    >
                        시작하기
                    </button>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section
                id="pl-hero"
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '96px clamp(16px,4vw,80px) 40px',
                    gap: 'clamp(16px,2.5vw,60px)',
                    flexWrap: 'wrap',
                    overflow: 'hidden',
                }}
            >
                {/* 배경 점선 경로 */}
                <svg
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 0,
                        opacity: 0.85,
                    }}
                    viewBox="0 0 1440 900"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M-40 620 C 220 520, 340 720, 560 600 S 900 420, 1180 520 S 1500 380, 1560 460"
                        stroke="#FF7A59"
                        strokeWidth="3"
                        strokeDasharray="3 12"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.9"
                    />
                    <path
                        d="M-60 220 C 180 300, 380 120, 620 220 S 1000 340, 1220 200"
                        stroke="#8B7CFF"
                        strokeWidth="3"
                        strokeDasharray="3 12"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.85"
                    />
                    {[
                        { cx: 220, cy: 520, r: 5, fill: '#FF7A59', o: 0.5 },
                        { cx: 620, cy: 220, r: 4, fill: '#D8CFFF', o: 0.6 },
                        { cx: 1180, cy: 520, r: 4.5, fill: '#FFB4C6', o: 0.6 },
                        { cx: 380, cy: 680, r: 3.5, fill: '#FFB4C6', o: 0.5 },
                        { cx: 860, cy: 150, r: 4, fill: '#FF7A59', o: 0.45 },
                        { cx: 1340, cy: 240, r: 3.5, fill: '#D8CFFF', o: 0.5 },
                        { cx: 90, cy: 330, r: 3.5, fill: '#FF7A59', o: 0.4 },
                        { cx: 1020, cy: 620, r: 4, fill: '#FFB4C6', o: 0.5 },
                    ].map(({ cx, cy, r, fill, o }) => (
                        <circle
                            key={`${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill={fill}
                            opacity={o}
                        />
                    ))}
                </svg>

                {/* 플로팅 아이콘들 */}
                <div
                    style={{
                        position: 'absolute',
                        left: '3%',
                        bottom: '6%',
                        zIndex: 0,
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: '#FFF',
                        border: '2px solid #3A2A28',
                        boxShadow: '2px 2px 0 #3A2A28',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pl-floatY 6s ease-in-out infinite',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path
                            d="M12 2C7 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3-8-8-8z"
                            fill="#FF7A59"
                        />
                    </svg>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: '4%',
                        top: '18%',
                        zIndex: 0,
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: '#FFF',
                        border: '2px solid #3A2A28',
                        boxShadow: '2px 2px 0 #3A2A28',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pl-floatY2 5.4s ease-in-out infinite',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path
                            d="M12 21s-8-4.8-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6.2-8 11-8 11z"
                            fill="#8B7CFF"
                        />
                    </svg>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: '6%',
                        bottom: '10%',
                        zIndex: 0,
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#FFF',
                        border: '2px solid #3A2A28',
                        boxShadow: '2px 2px 0 #3A2A28',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pl-floatPin 6.6s ease-in-out infinite',
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24">
                        <rect
                            x="2"
                            y="7"
                            width="20"
                            height="13"
                            rx="2"
                            fill="#D8CFFF"
                        />
                        <circle cx="12" cy="13.5" r="3.4" fill="#FFF" />
                    </svg>
                </div>

                {/* 히어로 텍스트 */}
                <div
                    style={{
                        flex: '1 1 380px',
                        position: 'relative',
                        zIndex: 1,
                        maxWidth: 760,
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            background: '#FFE3EA',
                            color: '#C7476B',
                            fontWeight: 700,
                            fontSize: 13,
                            padding: '8px 16px',
                            borderRadius: 999,
                            marginBottom: 16,
                            animation: fadeUpIn(0),
                        }}
                    >
                        함께 계획하는 AI 여행 플랫폼
                    </div>
                    <h1
                        className="pl-h"
                        style={{
                            fontSize: 'clamp(56px,7vw,96px)',
                            lineHeight: 1.22,
                            margin: '0 0 18px',
                            animation: fadeUpIn(100),
                        }}
                    >
                        이번 여행,
                        <br />
                        <WordRotate
                            words={['플래너 말고', '엑셀 말고', '메모장 말고']}
                            interval={2200}
                            style={{ color: '#FF7A59' }}
                        />
                        <br />
                        여기서 짜자.
                    </h1>
                    <p
                        style={{
                            fontSize: 'clamp(16px,1.7vw,20px)',
                            lineHeight: 1.6,
                            color: '#5B5F7E',
                            fontWeight: 500,
                            margin: '0 0 24px',
                            maxWidth: 520,
                            animation: fadeUpIn(200),
                        }}
                    >
                        흩어진 장소랑 의견, 한곳에 모으고
                        <br />
                        AI가 정리까지 싹 다 해드려요.
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            gap: 14,
                            flexWrap: 'wrap',
                            marginBottom: 12,
                            animation: fadeUpIn(300),
                        }}
                    >
                        <a
                            href="#place-section"
                            onClick={scrollTo('place-section')}
                            onMouseEnter={() => setCtaHover(true)}
                            onMouseLeave={() => setCtaHover(false)}
                            className="pl-cta-btn"
                            style={{
                                background: '#FF7A59',
                                color: '#FDF3E7',
                                fontWeight: 700,
                                fontSize: 16,
                                padding: '16px 28px',
                                borderRadius: 999,
                                boxShadow: '0 12px 24px rgba(255,90,60,0.34)',
                                transition:
                                    'transform 0.2s ease, box-shadow 0.2s ease',
                                textDecoration: 'none',
                                display: 'inline-block',
                            }}
                        >
                            바로 여행방 만들기
                        </a>
                        <a
                            href="#ai-section"
                            onClick={scrollTo('ai-section')}
                            className="pl-ghost-btn"
                            style={{
                                background: '#FFFDF9',
                                color: '#3A2A28',
                                fontWeight: 700,
                                fontSize: 16,
                                padding: '16px 28px',
                                borderRadius: 999,
                                border: '1.5px solid #EFE2D6',
                                transition:
                                    'transform 0.2s ease, border-color 0.2s ease',
                                textDecoration: 'none',
                                display: 'inline-block',
                            }}
                        >
                            뭐가 다른지 보기
                        </a>
                    </div>
                    <p
                        style={{
                            fontSize: 14,
                            color: '#8A8FA8',
                            fontWeight: 600,
                            animation: fadeUpIn(380),
                        }}
                    >
                        ✓ 회원가입 30초, 카드 필요 없음
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            gap: 'clamp(20px,4vw,48px)',
                            marginTop: 28,
                            flexWrap: 'wrap',
                            animation: fadeUpIn(460),
                        }}
                    >
                        {[
                            { value: 1200, suffix: '+', label: '여행방' },
                            { value: 4800, suffix: '+', label: '여행자' },
                            { value: 38000, suffix: '+', label: '저장 장소' },
                        ].map(({ value, suffix, label }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <NumberTicker
                                    value={value}
                                    suffix={suffix}
                                    style={{
                                        fontSize: 'clamp(22px,3.2vw,36px)',
                                        fontWeight: 800,
                                        color: '#FF7A59',
                                        fontFamily: "'Manrope', sans-serif",
                                        lineHeight: 1,
                                    }}
                                />
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#8A8FA8',
                                        fontWeight: 600,
                                        marginTop: 4,
                                    }}
                                >
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 히어로 이미지 */}
                <div
                    style={{
                        flex: '1 1 300px',
                        position: 'relative',
                        minHeight: 480,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        paddingRight: '2%',
                        paddingBottom: '2%',
                        zIndex: 1,
                        minWidth: 0,
                        overflow: 'visible',
                    }}
                >
                    <svg
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%,-50%)',
                            width: 'min(60vw,380px)',
                            height: 'min(60vw,380px)',
                            zIndex: 0,
                            opacity: 0.7,
                        }}
                        viewBox="0 0 400 400"
                    >
                        <circle
                            cx="200"
                            cy="200"
                            r="196"
                            fill="none"
                            stroke="#8B7CFF"
                            strokeWidth="2"
                            strokeDasharray="3 9"
                        />
                    </svg>
                    <div
                        style={{
                            animation: 'pl-heroBody 4.6s ease-in-out infinite',
                        }}
                    >
                        <div style={heroFlamingoStyle}>
                            <img
                                src="/assets/plamingo2-hero-v2.png"
                                alt="Plamingo 캐릭터"
                                style={{
                                    width: 280,
                                    height: 'auto',
                                    display: 'block',
                                    filter: 'drop-shadow(0 26px 30px rgba(255,122,89,0.3))',
                                    animation:
                                        'pl-heroBag 4.6s ease-in-out infinite 0.25s',
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    right: -6,
                                    top: 10,
                                    opacity: ctaHover ? 1 : 0,
                                    transform: ctaHover
                                        ? 'translate(0,0) rotate(0deg)'
                                        : 'translate(8px,-6px) rotate(-10deg)',
                                    transition:
                                        'opacity 0.3s ease, transform 0.3s ease',
                                }}
                            >
                                <svg width="46" height="46" viewBox="0 0 46 46">
                                    <path
                                        d="M6 23c8 0 16-8 16-16M22 7l6 0 0 6"
                                        stroke="#FF7A59"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 여정 레일 (좌측 고정) ── */}
            {!isMobile && (
                <div
                    style={{
                        position: 'fixed',
                        left: 28,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    {journeySteps.map(([id, label], i) => {
                        const idx = journeySteps.findIndex(
                            ([oid]) => oid === activeSection,
                        )
                        const active = id === activeSection
                        const passed = idx > i
                        return (
                            <React.Fragment key={id}>
                                <div
                                    title={label}
                                    style={{
                                        width: active ? 12 : 8,
                                        height: active ? 12 : 8,
                                        borderRadius: '50%',
                                        background: active
                                            ? '#FF7A59'
                                            : passed
                                              ? '#FFB4C6'
                                              : '#EFE2D6',
                                        transition: 'all 0.35s ease',
                                        boxShadow: active
                                            ? '0 0 0 5px rgba(255,122,89,0.16)'
                                            : 'none',
                                    }}
                                />
                                {i < journeySteps.length - 1 && (
                                    <div
                                        style={{
                                            width: 2,
                                            height: 22,
                                            background: passed
                                                ? '#FFB4C6'
                                                : '#EFE2D6',
                                            transition: 'background 0.35s ease',
                                        }}
                                    />
                                )}
                            </React.Fragment>
                        )
                    })}
                </div>
            )}

            {/* ── SCENE 01 PROBLEM ── */}
            <section
                id="problem-section"
                data-reveal-root="problem"
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    padding: 'min(10vw,100px) clamp(20px,6vw,80px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '-8%',
                        top: '-6%',
                        width: 420,
                        height: 420,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #D8CFFF 0%, transparent 70%)',
                        opacity: 0.24,
                        filter: 'blur(14px)',
                        zIndex: 0,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        right: '-10%',
                        bottom: '-10%',
                        width: 460,
                        height: 460,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #FFB4C6 0%, transparent 70%)',
                        opacity: 0.2,
                        filter: 'blur(14px)',
                        zIndex: 0,
                    }}
                />

                <div
                    style={{
                        ...reveal('problem', 0),
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            marginBottom: 8,
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%,-52%)',
                                fontSize: 'clamp(90px,12vw,150px)',
                                fontWeight: 800,
                                color: 'transparent',
                                WebkitTextStroke: '1.5px rgba(199,71,107,0.16)',
                                lineHeight: 1,
                                zIndex: -1,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            01
                        </div>
                        <div
                            style={{
                                fontWeight: 800,
                                fontSize: 15,
                                color: '#C7476B',
                                letterSpacing: '0.05em',
                            }}
                        >
                            SCENE 01 · PROBLEM
                        </div>
                    </div>
                    <h2
                        className="pl-h pl-h2-hover"
                        style={{
                            fontSize: 'clamp(44px,6.4vw,72px)',
                            lineHeight: 1.36,
                            margin: '0 0 60px',
                            transition: 'transform 0.3s ease',
                        }}
                    >
                        여행은 다 같이 가면서,
                        <br />
                        계획은 왜 맨날 나 혼자짤까?
                    </h2>
                </div>

                <div
                    style={{
                        zIndex: 1,
                        width: '100%',
                        maxWidth: 920,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'clamp(24px,4vw,56px)',
                        flexWrap: 'wrap',
                    }}
                >
                    {/* 왼쪽 스크랩 */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 22,
                            flex: '1 1 240px',
                            maxWidth: 280,
                            marginTop: -10,
                        }}
                    >
                        {[
                            {
                                delay: 60,
                                rotate: '-4deg',
                                ml: 14,
                                label: '메신저',
                                title: '여기 숙소 어때?? 🏝️',
                                sub: '민지',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M4 4h16v12H8l-4 4z"
                                            fill="#D8CFFF"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                delay: 140,
                                rotate: '3deg',
                                ml: -10,
                                label: '공유 링크',
                                title: 'map.naver.com/p/entry/...',
                                sub: '저장 12곳',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2"
                                            stroke="#8A8FA8"
                                            strokeWidth="2.2"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                delay: 220,
                                rotate: '-6deg',
                                ml: 18,
                                label: '지도 캡처',
                                title: '아라시야마 근처',
                                sub: '',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M12 2C7 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3-8-8-8z"
                                            fill="#D8CFFF"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                delay: 300,
                                rotate: '-5deg',
                                ml: -6,
                                label: '맛집',
                                title: '니시키 카페',
                                sub: '',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"
                                            fill="none"
                                            stroke="#C7476B"
                                            strokeWidth="1.8"
                                        />
                                    </svg>
                                ),
                            },
                        ].map(
                            (
                                { delay, rotate, ml, label, title, sub, icon },
                                idx,
                            ) => (
                                <div
                                    key={idx}
                                    style={{
                                        ...revealCard(
                                            'problem',
                                            delay,
                                            'translateY(14px) rotate(0deg)',
                                            `translateY(0) rotate(${rotate})`,
                                        ),
                                        ...CARD_BASE,
                                        marginLeft: ml,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: '#8A8FA8',
                                            letterSpacing: '0.03em',
                                        }}
                                    >
                                        {icon}
                                        {label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: '#3A2A28',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {title}
                                    </div>
                                    {sub && (
                                        <div
                                            style={{
                                                fontSize: 11.5,
                                                fontWeight: 600,
                                                color: '#8A8FA8',
                                            }}
                                        >
                                            {sub}
                                        </div>
                                    )}
                                </div>
                            ),
                        )}
                    </div>

                    {/* 캐릭터 */}
                    <div
                        style={{
                            ...revealCard(
                                'problem',
                                440,
                                'translateY(18px) scale(0.94)',
                                'translateY(0) scale(1)',
                            ),
                            position: 'absolute',
                            right: 'clamp(16px,4vw,48px)',
                            bottom: 'clamp(12px,3vw,36px)',
                            width: 200,
                            zIndex: 5,
                        }}
                    >
                        <img
                            src="/assets/plamingo2-hero-v2.png"
                            alt="Plamingo 캐릭터"
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                filter: 'drop-shadow(0 16px 20px rgba(255,122,89,0.2))',
                            }}
                        />
                    </div>

                    {/* 오른쪽 스크랩 */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 22,
                            flex: '1 1 240px',
                            maxWidth: 280,
                            marginTop: 14,
                        }}
                    >
                        {[
                            {
                                delay: 160,
                                rotate: '5deg',
                                ml: -8,
                                label: '메모 · 여행 일정',
                                title: 'Day1: 아라시야마?',
                                sub: 'Day2: 오사카?',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M6 2h9l3 3v17H6z"
                                            fill="none"
                                            stroke="#8A8FA8"
                                            strokeWidth="1.8"
                                        />
                                        <path
                                            d="M9 11h6M9 15h6"
                                            stroke="#8A8FA8"
                                            strokeWidth="1.6"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                delay: 240,
                                rotate: '-3deg',
                                ml: 16,
                                label: '숙소 예약',
                                title: '교토 게스트하우스',
                                sub: '3박 4일 확정',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M2 10h20v9H2z"
                                            fill="none"
                                            stroke="#8A8FA8"
                                            strokeWidth="1.8"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                delay: 320,
                                rotate: '4deg',
                                ml: -14,
                                label: 'e-티켓',
                                title: '간사이공항',
                                sub: '',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <rect
                                            x="2"
                                            y="7"
                                            width="20"
                                            height="13"
                                            rx="2"
                                            fill="none"
                                            stroke="#8A8FA8"
                                            strokeWidth="1.8"
                                        />
                                        <circle
                                            cx="12"
                                            cy="13.5"
                                            r="3"
                                            fill="none"
                                            stroke="#8A8FA8"
                                            strokeWidth="1.6"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                delay: 380,
                                rotate: '3deg',
                                ml: 10,
                                label: '체크리스트',
                                title: '여권 확인',
                                sub: '유심 구매',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M9 11l3 3L22 4"
                                            stroke="#8A8FA8"
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                                            stroke="#8A8FA8"
                                            strokeWidth="1.8"
                                            fill="none"
                                        />
                                    </svg>
                                ),
                            },
                        ].map(
                            (
                                { delay, rotate, ml, label, title, sub, icon },
                                idx,
                            ) => (
                                <div
                                    key={idx}
                                    style={{
                                        ...revealCard(
                                            'problem',
                                            delay,
                                            'translateY(14px) rotate(0deg)',
                                            `translateY(0) rotate(${rotate})`,
                                        ),
                                        ...CARD_BASE,
                                        marginLeft: ml,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: '#8A8FA8',
                                            letterSpacing: '0.03em',
                                        }}
                                    >
                                        {icon}
                                        {label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: '#3A2A28',
                                        }}
                                    >
                                        {title}
                                    </div>
                                    {sub && (
                                        <div
                                            style={{
                                                fontSize: 11.5,
                                                fontWeight: 600,
                                                color: '#8A8FA8',
                                            }}
                                        >
                                            {sub}
                                        </div>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                </div>
            </section>

            {/* ── SCENE 02 PLACE ── */}
            <section
                id="place-section"
                data-reveal-root="place"
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    padding: 'min(10vw,100px) clamp(20px,6vw,80px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(30px,5vw,72px)',
                    flexWrap: 'wrap-reverse',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        right: '-6%',
                        top: '-8%',
                        width: 480,
                        height: 480,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #FF7A59 0%, transparent 70%)',
                        opacity: 0.14,
                        filter: 'blur(14px)',
                        zIndex: 0,
                    }}
                />
                <div
                    style={{
                        flex: '1 1 420px',
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 420,
                        }}
                    >
                        <div
                            style={{
                                ...reveal('place', 160, 34, {
                                    scale: 0.94,
                                    rotate: -2,
                                }),
                                ...sceneParallax('place-section', 30),
                            }}
                        >
                            <div
                                style={{
                                    background: '#FFFDF8',
                                    border: '3px solid #3A2A28',
                                    borderRadius: 22,
                                    padding: 22,
                                    boxShadow: '5px 5px 0 #3A2A28',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        background: '#F4F1EC',
                                        borderRadius: 12,
                                        padding: '12px 16px',
                                        marginBottom: 16,
                                    }}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2"
                                            stroke="#8A8FA8"
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#5B5F7E',
                                        }}
                                    >
                                        map.naver.com/p/entry/place/1934...
                                    </span>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 14,
                                        alignItems: 'center',
                                        border: '1.5px solid #F4F1EC',
                                        borderRadius: 16,
                                        padding: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 12,
                                            background:
                                                'linear-gradient(135deg,#FFB4C6,#D8CFFF)',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <div>
                                        <div
                                            style={{
                                                fontWeight: 800,
                                                fontSize: 15,
                                                marginBottom: 4,
                                            }}
                                        >
                                            교토 아라시야마 카페
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                marginBottom: 6,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    background: '#FFE3EA',
                                                    color: '#C7476B',
                                                    padding: '3px 8px',
                                                    borderRadius: 999,
                                                }}
                                            >
                                                카페
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    background: '#EDE8FF',
                                                    color: '#6B5FC7',
                                                    padding: '3px 8px',
                                                    borderRadius: 999,
                                                }}
                                            >
                                                대나무숲 근처
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: '#8A8FA8',
                                                fontWeight: 600,
                                            }}
                                        >
                                            AI 메모 · "노을 시간대 추천"
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ flex: '1 1 380px', maxWidth: 520 }}>
                    <div
                        style={{
                            ...reveal('place', 0),
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                                marginBottom: 8,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '50%',
                                    transform: 'translateY(-52%)',
                                    fontSize: 'clamp(80px,10vw,130px)',
                                    fontWeight: 800,
                                    color: 'transparent',
                                    WebkitTextStroke:
                                        '1.5px rgba(199,71,107,0.14)',
                                    lineHeight: 1,
                                    zIndex: -1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                02
                            </div>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: '#C7476B',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 02 · PLACE
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                fontSize: 'clamp(44px,6.4vw,72px)',
                                lineHeight: 1.36,
                                margin: '0 0 20px',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            링크만 툭 던져주세요.
                            <br />
                            정리는 AI가 다 해드릴게요.
                        </h2>
                        <p
                            style={{
                                fontSize: 19,
                                lineHeight: 1.75,
                                color: '#5B5F7E',
                                fontWeight: 500,
                            }}
                        >
                            채팅으로 공유한 지도 링크, 붙여넣기만 하세요.
                            <br />
                            카테고리·위치·태그까지 AI가 알아서 정리해요.
                        </p>
                    </div>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: 'clamp(16px,4vw,44px)',
                        bottom: 'clamp(12px,3vw,32px)',
                        width: 170,
                        zIndex: 5,
                    }}
                >
                    <img
                        src="/assets/plamingo2-place-v2.png"
                        alt="Plamingo 캐릭터 - 지도 핀"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            filter: 'drop-shadow(0 12px 14px rgba(255,122,89,0.24))',
                        }}
                    />
                </div>
            </section>

            {/* ── SCENE 03 VOTE ── */}
            <section
                id="vote-section"
                data-reveal-root="vote"
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    padding: 'min(10vw,100px) clamp(20px,6vw,80px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(30px,5vw,72px)',
                    flexWrap: 'wrap',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '-8%',
                        bottom: '-10%',
                        width: 460,
                        height: 460,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #FFB4C6 0%, transparent 70%)',
                        opacity: 0.22,
                        filter: 'blur(10px)',
                        zIndex: 0,
                    }}
                />
                <div style={{ flex: '1 1 380px', maxWidth: 520 }}>
                    <div
                        style={{
                            ...reveal('vote', 0),
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                                marginBottom: 8,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '50%',
                                    transform: 'translateY(-52%)',
                                    fontSize: 'clamp(80px,10vw,130px)',
                                    fontWeight: 800,
                                    color: 'transparent',
                                    WebkitTextStroke:
                                        '1.5px rgba(199,71,107,0.14)',
                                    lineHeight: 1,
                                    zIndex: -1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                03
                            </div>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: '#C7476B',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 03 · VOTE
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                fontSize: 'clamp(44px,6.4vw,72px)',
                                lineHeight: 1.36,
                                margin: '0 0 20px',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            투표 한 번이면
                            <br />
                            다수결 끝! 싸울 일 없어요.
                        </h2>
                        <p
                            style={{
                                fontSize: 19,
                                lineHeight: 1.75,
                                color: '#5B5F7E',
                                fontWeight: 500,
                            }}
                        >
                            멤버들이 장소마다 꼭 가기, 좋아요, 제외로 투표하고
                            댓글을 남기면, 모두의 의견이 자연스럽게 하나로
                            모여요.
                        </p>
                    </div>
                </div>
                <div
                    style={{
                        flex: '1 1 420px',
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 400,
                        }}
                    >
                        <div
                            style={{
                                ...reveal('vote', 120, 30, {
                                    scale: 0.94,
                                    rotate: 2,
                                }),
                                ...sceneParallax('vote-section', -26),
                                position: 'relative',
                            }}
                        >
                            <div
                                style={{
                                    background: '#FFFDF8',
                                    border: '3px solid #3A2A28',
                                    borderRadius: 22,
                                    padding: 22,
                                    boxShadow: '5px 5px 0 #3A2A28',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 14,
                                        marginBottom: 16,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 12,
                                            background:
                                                'linear-gradient(135deg,#D8CFFF,#FFB4C6)',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <div>
                                        <div
                                            style={{
                                                fontWeight: 800,
                                                fontSize: 15,
                                                marginBottom: 4,
                                            }}
                                        >
                                            교토 후시미이나리 신사
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                marginLeft: -2,
                                            }}
                                        >
                                            {[
                                                '#FFB4C6',
                                                '#D8CFFF',
                                                '#FF7A59',
                                            ].map((bg, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: '50%',
                                                        background: bg,
                                                        border: '2px solid #FFF',
                                                        marginLeft:
                                                            i > 0 ? -8 : 0,
                                                        boxShadow:
                                                            '0 2px 6px rgba(35,38,75,0.12)',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            background: '#FFE3EA',
                                            color: '#C7476B',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            padding: '9px 0',
                                            borderRadius: 10,
                                        }}
                                    >
                                        꼭 가기 · 3
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            background: '#EDE8FF',
                                            color: '#6B5FC7',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            padding: '9px 0',
                                            borderRadius: 10,
                                        }}
                                    >
                                        좋아요 · 1
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            background: '#F4F1EC',
                                            color: '#8A8FA8',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            padding: '9px 0',
                                            borderRadius: 10,
                                        }}
                                    >
                                        제외 · 0
                                    </div>
                                </div>
                                <div
                                    style={{
                                        borderTop: '1.5px solid #F4F1EC',
                                        paddingTop: 12,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#5B5F7E',
                                    }}
                                >
                                    💬 "아침 일찍 가면 사람 없대!"
                                </div>
                                {/* 스탬프 */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: -18,
                                        top: -18,
                                        ...revealCard(
                                            'vote',
                                            420,
                                            'scale(0.3) rotate(-30deg)',
                                            'scale(1) rotate(-8deg)',
                                        ),
                                    }}
                                >
                                    <svg
                                        width="64"
                                        height="64"
                                        viewBox="0 0 64 64"
                                    >
                                        <circle
                                            cx="32"
                                            cy="32"
                                            r="30"
                                            fill="#FFFFFF"
                                            stroke="#FF7A59"
                                            strokeWidth="2.5"
                                        />
                                        <path
                                            d="M32 44s-14-8.5-14-18a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 9.5-14 18-14 18z"
                                            fill="#FF7A59"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: 'clamp(16px,4vw,44px)',
                        bottom: 'clamp(12px,3vw,32px)',
                        width: 170,
                        zIndex: 5,
                    }}
                >
                    <img
                        src="/assets/plamingo2-vote-v2.png"
                        alt="Plamingo 캐릭터 - 하트 스탬프"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            filter: 'drop-shadow(0 12px 14px rgba(255,122,89,0.24))',
                        }}
                    />
                </div>
            </section>

            {/* ── SCENE 04 AI ── */}
            <section
                id="ai-section"
                data-reveal-root="ai"
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    padding: 'min(10vw,100px) clamp(20px,6vw,80px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(30px,5vw,72px)',
                    flexWrap: 'wrap-reverse',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        right: '-8%',
                        top: '-6%',
                        width: 460,
                        height: 460,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #D8CFFF 0%, transparent 70%)',
                        opacity: 0.22,
                        filter: 'blur(14px)',
                        zIndex: 0,
                    }}
                />
                <div
                    style={{
                        flex: '1 1 420px',
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 440,
                        }}
                    >
                        <div
                            style={{
                                ...reveal('ai', 140, 30, {
                                    scale: 0.95,
                                    rotate: -2,
                                }),
                                ...sceneParallax('ai-section', 30),
                            }}
                        >
                            <div
                                style={{
                                    background: '#FFFDF8',
                                    border: '3px solid #3A2A28',
                                    borderRadius: 22,
                                    padding: 20,
                                    boxShadow: '5px 5px 0 #3A2A28',
                                }}
                            >
                                <svg
                                    width="100%"
                                    height="140"
                                    viewBox="0 0 380 140"
                                    style={{
                                        display: 'block',
                                        marginBottom: 14,
                                    }}
                                >
                                    <rect
                                        width="380"
                                        height="140"
                                        rx="14"
                                        fill="#EDE8FF"
                                    />
                                    <path
                                        d="M40 100 C 90 40, 160 120, 220 60 S 320 30, 340 50"
                                        stroke="#8B7CFF"
                                        strokeWidth="3"
                                        strokeDasharray="500"
                                        strokeDashoffset={
                                            revealed.ai || reduced ? 0 : 500
                                        }
                                        strokeLinecap="round"
                                        fill="none"
                                        style={{
                                            transition:
                                                'stroke-dashoffset 1.7s cubic-bezier(.22,1,.36,1) 300ms',
                                        }}
                                    />
                                    <circle
                                        cx="40"
                                        cy="100"
                                        r="7"
                                        fill="#FF7A59"
                                    />
                                    <circle
                                        cx="220"
                                        cy="60"
                                        r="6"
                                        fill="#FF7A59"
                                    />
                                    <circle
                                        cx="340"
                                        cy="50"
                                        r="7"
                                        fill="#FF7A59"
                                    />
                                </svg>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[
                                        {
                                            day: 'DAY 1',
                                            items: [
                                                '10:00 아라시야마 대나무숲',
                                                '13:00 카페 & 강변산책',
                                            ],
                                        },
                                        {
                                            day: 'DAY 2',
                                            items: [
                                                '09:30 후시미이나리',
                                                '15:00 기온 거리',
                                            ],
                                        },
                                    ].map(({ day, items }) => (
                                        <div
                                            key={day}
                                            style={{
                                                flex: 1,
                                                background: '#F4F1EC',
                                                borderRadius: 12,
                                                padding: 12,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    color: '#8A8FA8',
                                                    marginBottom: 8,
                                                }}
                                            >
                                                {day}
                                            </div>
                                            {items.map((item) => (
                                                <div
                                                    key={item}
                                                    style={{
                                                        fontSize: 12.5,
                                                        fontWeight: 700,
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginTop: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            background: '#FFF',
                                            border: '1.5px solid #F4F1EC',
                                            color: '#5B5F7E',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            padding: '9px 0',
                                            borderRadius: 10,
                                        }}
                                    >
                                        수정하기
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            background: '#FF7A59',
                                            color: '#FDF3E7',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            padding: '9px 0',
                                            borderRadius: 10,
                                        }}
                                    >
                                        이 일정 승인
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ flex: '1 1 380px', maxWidth: 520 }}>
                    <div
                        style={{
                            ...reveal('ai', 0),
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                                marginBottom: 8,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '50%',
                                    transform: 'translateY(-52%)',
                                    fontSize: 'clamp(80px,10vw,130px)',
                                    fontWeight: 800,
                                    color: 'transparent',
                                    WebkitTextStroke:
                                        '1.5px rgba(199,71,107,0.14)',
                                    lineHeight: 1,
                                    zIndex: -1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                04
                            </div>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: '#C7476B',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 04 · AI
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                fontSize: 'clamp(44px,6.4vw,72px)',
                                lineHeight: 1.36,
                                margin: '0 0 20px',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            고르기만 하면
                            <br />
                            동선까지 AI가 짜드려요.
                        </h2>
                        <p
                            style={{
                                fontSize: 19,
                                lineHeight: 1.75,
                                color: '#5B5F7E',
                                fontWeight: 500,
                            }}
                        >
                            확정된 장소들을 동선까지 고려해 하루씩 배치해드려요.
                            마음에 안 들면 언제든 직접 수정할 수 있어요 — 결정은
                            늘 여러분의 몫이에요.
                        </p>
                    </div>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: 'clamp(16px,4vw,44px)',
                        bottom: 'clamp(12px,3vw,32px)',
                        width: 170,
                        zIndex: 5,
                    }}
                >
                    <img
                        src="/assets/plamingo2-ai-v2.png"
                        alt="Plamingo 캐릭터 - AI 동선"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            filter: 'drop-shadow(0 12px 14px rgba(255,122,89,0.24))',
                        }}
                    />
                </div>
            </section>

            {/* ── SCENE 05 EXPENSE ── */}
            <section
                id="expense-section"
                data-reveal-root="expense"
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    padding: 'min(10vw,100px) clamp(20px,6vw,80px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'clamp(30px,5vw,72px)',
                    flexWrap: 'wrap',
                    textAlign: 'center',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-14%',
                        transform: 'translateX(-50%)',
                        width: 520,
                        height: 520,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #FF7A59 0%, transparent 70%)',
                        opacity: 0.12,
                        filter: 'blur(14px)',
                        zIndex: 0,
                    }}
                />
                <div style={{ maxWidth: 640 }}>
                    <div style={reveal('expense', 0)}>
                        <div
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                                marginBottom: 6,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%,-52%)',
                                    fontSize: 'clamp(70px,9vw,110px)',
                                    fontWeight: 800,
                                    color: 'transparent',
                                    WebkitTextStroke:
                                        '1.5px rgba(199,71,107,0.14)',
                                    lineHeight: 1,
                                    zIndex: -1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                05
                            </div>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: '#C7476B',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 05 · EXPENSE
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                fontSize: 'clamp(44px,6.4vw,72px)',
                                lineHeight: 1.36,
                                margin: '0 0 24px',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            누가 얼마 냈는지,
                            <br />
                            더치페이 계산기 그만.
                        </h2>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 16,
                                background: '#FFFDF8',
                                border: '3px solid #3A2A28',
                                borderRadius: 20,
                                padding: '16px 22px',
                                boxShadow: '5px 5px 0 #3A2A28',
                            }}
                        >
                            <svg width="30" height="30" viewBox="0 0 24 24">
                                <rect
                                    x="4"
                                    y="2"
                                    width="16"
                                    height="20"
                                    rx="2"
                                    fill="#EDE8FF"
                                />
                                <path
                                    d="M8 8h8M8 12h8M8 16h5"
                                    stroke="#8B7CFF"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div style={{ textAlign: 'left' }}>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#8A8FA8',
                                    }}
                                >
                                    교토 3박 4일 정산
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 800 }}>
                                    1인당 128,000원 · N빵 완료
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: 'clamp(16px,4vw,44px)',
                        bottom: 'clamp(12px,3vw,32px)',
                        width: 170,
                        zIndex: 5,
                    }}
                >
                    <img
                        src="/assets/plamingo2-expense-v2.png"
                        alt="Plamingo 캐릭터 - 영수증"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            filter: 'drop-shadow(0 12px 14px rgba(255,122,89,0.22))',
                        }}
                    />
                </div>
            </section>

            {/* ── SCENE 06 CTA ── */}
            <section
                id="cta-section"
                data-reveal-root="cta"
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    padding: 'min(10vw,100px) clamp(20px,6vw,80px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    background:
                        'linear-gradient(180deg,#FDF3E7 0%,#FBE8D8 100%)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '-10%',
                        top: '-16%',
                        width: 520,
                        height: 520,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #FFB4C6 0%, transparent 70%)',
                        opacity: 0.24,
                        filter: 'blur(14px)',
                        zIndex: 0,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        right: '-10%',
                        bottom: '-14%',
                        width: 480,
                        height: 480,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #D8CFFF 0%, transparent 70%)',
                        opacity: 0.22,
                        filter: 'blur(10px)',
                        zIndex: 0,
                    }}
                />
                <svg
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0.85,
                    }}
                    viewBox="0 0 1440 500"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M-40 400 C 300 300, 500 460, 780 340 S 1200 220, 1500 300"
                        stroke="#FF7A59"
                        strokeWidth="3"
                        strokeDasharray="3 12"
                        fill="none"
                        opacity="0.9"
                    />
                </svg>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={reveal('cta', 0)}>
                        <div
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                                marginBottom: 8,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%,-52%)',
                                    fontSize: 'clamp(80px,10vw,130px)',
                                    fontWeight: 800,
                                    color: 'transparent',
                                    WebkitTextStroke:
                                        '1.5px rgba(199,71,107,0.16)',
                                    lineHeight: 1,
                                    zIndex: -1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                06
                            </div>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: '#C7476B',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 06 · GO
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                fontSize: 'clamp(44px,6.4vw,72px)',
                                lineHeight: 1.36,
                                margin: '0 0 32px',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            고민은 그만,
                            <br />
                            여행은 이미 시작됐어요.
                        </h2>
                        <ConfettiButton
                            onClick={startService}
                            className="pl-cta-btn"
                            style={{
                                display: 'inline-block',
                                background: '#FF7A59',
                                color: '#FDF3E7',
                                fontWeight: 700,
                                fontSize: 17,
                                padding: '18px 36px',
                                borderRadius: 999,
                                boxShadow: '0 16px 30px rgba(255,90,60,0.36)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                fontFamily: "'Manrope', sans-serif",
                            }}
                        >
                            첫 여행방 만들기 🎉
                        </ConfettiButton>
                    </div>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        right: 'clamp(16px,4vw,48px)',
                        bottom: 'clamp(16px,4vw,40px)',
                        zIndex: 5,
                    }}
                >
                    <div
                        style={{
                            ...reveal('cta', 200, 30, { scale: 0.92 }),
                            ...sceneParallax('cta-section', -20),
                            display: 'flex',
                            alignItems: 'flex-end',
                        }}
                    >
                        <img
                            src="/assets/plamingo2-cta-v2.png"
                            alt="Plamingo 캐릭터 - 출발"
                            style={{
                                width: 150,
                                height: 'auto',
                                display: 'block',
                                filter: 'drop-shadow(0 14px 16px rgba(255,122,89,0.26))',
                            }}
                        />
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: '#D8CFFF',
                                margin: '0 -8px 20px',
                                boxShadow: '0 8px 16px rgba(35,38,75,0.14)',
                            }}
                        />
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: '#FFB4C6',
                                marginBottom: 34,
                                boxShadow: '0 8px 16px rgba(35,38,75,0.14)',
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer
                id="footer-section"
                style={{
                    padding: '36px clamp(20px,6vw,80px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    borderTop: '1.5px solid #F0E4D8',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 800,
                        fontSize: 15,
                        color: '#3A2A28',
                    }}
                >
                    <BrandLogo className="h-6 w-6" />
                    Plamingo
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: 24,
                        flexWrap: 'wrap',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#8A8FA8',
                    }}
                >
                    <Link
                        to="/terms"
                        style={{ color: '#8A8FA8', textDecoration: 'none' }}
                    >
                        이용약관
                    </Link>
                    <Link
                        to="/privacy"
                        style={{ color: '#8A8FA8', textDecoration: 'none' }}
                    >
                        개인정보처리방침
                    </Link>
                    <a
                        href="https://github.com/prgrms-aibe-devcourse/AIBE6_FinalProject_Team01"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#8A8FA8', textDecoration: 'none' }}
                    >
                        GitHub
                    </a>
                </div>
                <div
                    style={{
                        fontSize: 12.5,
                        color: '#B7BBCF',
                        fontWeight: 600,
                    }}
                >
                    © 2026 Plamingo
                </div>
            </footer>
        </div>
    )
}
