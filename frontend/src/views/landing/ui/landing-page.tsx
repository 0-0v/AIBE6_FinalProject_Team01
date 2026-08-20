'use client'

import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfettiButton } from '@/shared/ui/confetti-button'
import { NumberTicker } from '@/shared/ui/number-ticker'
import { WordRotate } from '@/shared/ui/word-rotate'
import { useCurrentUserStore } from '@/shared/model'
import { HeroGlobe } from './hero-globe'
import { LandingFooter } from './landing-footer'
import { LandingNavigation } from './landing-navigation'
import { LandingJourneyRail } from './landing-journey-rail'
import {
    fadeUpIn,
    LANDING_STYLES,
    SCENE_H2_BASE,
    SCENE_SECTION_PADDING,
    ScrollDownHint,
} from './landing-scene-shared'
import { useLandingInteractions } from '../model/use-landing-interactions'
export function Landing() {
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isInitialized = useCurrentUserStore((state) => state.isInitialized)

    const {
        scrolled,
        showNav,
        isMobile,
        reduced,
        ctaHover,
        setCtaHover,
        activeSection,
        smx,
        smy,
        scrollTo,
        reveal,
        revealCard,
        sceneParallax,
    } = useLandingInteractions(LANDING_STYLES)

    const startService = useCallback(() => {
        if (!isInitialized) return
        navigate(currentUser ? '/app' : '/login')
    }, [currentUser, isInitialized, navigate])

    const startCreatingTrip = useCallback(() => {
        if (!isInitialized) return
        const createTripPath = '/app/room?create=true'
        if (currentUser) {
            navigate(createTripPath)
            return
        }
        sessionStorage.setItem('postLoginReturnPath', createTripPath)
        navigate('/login')
    }, [currentUser, isInitialized, navigate])

    const gazeRotate =
        isMobile || reduced ? 0 : Math.max(-3, Math.min(3, smx * 6))
    const heroFlamingoStyle: React.CSSProperties = {
        position: 'relative',
        transform: `translate(${isMobile || reduced ? 0 : smx * 10}px, ${isMobile || reduced ? 0 : smy * 10}px) rotate(${ctaHover ? -6 : gazeRotate}deg) translateX(${ctaHover ? -10 : 0}px) translateY(${ctaHover ? -6 : 0}px)`,
        transition: 'transform 0.45s cubic-bezier(.22,1,.36,1)',
    }

    // 공용 스타일 상수
    const CARD_BASE: React.CSSProperties = {
        background: 'var(--color-landing-canvas)',
        border: '2.5px solid var(--color-landing-ink)',
        borderRadius: 16,
        padding: '13px 18px',
        boxShadow: '3px 3px 0 var(--color-landing-ink)',
        minHeight: 68,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        justifyContent: 'center',
    }

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '100vw',
                overflowX: 'hidden',
                background: 'var(--color-landing-cream)',
                fontFamily: 'var(--font-landing)',
                color: 'var(--color-landing-ink)',
                WebkitFontSmoothing: 'antialiased',
            }}
        >
            <LandingNavigation
                isVisible={showNav}
                isScrolled={scrolled}
                isInitialized={isInitialized}
                onNavigate={scrollTo}
                onStart={startService}
            />

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
                    padding: '92px clamp(16px,4vw,80px) 24px',
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
                        stroke="var(--color-landing-coral)"
                        strokeWidth="3"
                        strokeDasharray="3 12"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.9"
                    />
                    <path
                        d="M-60 220 C 180 300, 380 120, 620 220 S 1000 340, 1220 200"
                        stroke="var(--color-landing-purple)"
                        strokeWidth="3"
                        strokeDasharray="3 12"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.85"
                    />
                    {[
                        {
                            cx: 220,
                            cy: 520,
                            r: 5,
                            fill: 'var(--color-landing-coral)',
                            o: 0.5,
                        },
                        {
                            cx: 620,
                            cy: 220,
                            r: 4,
                            fill: 'var(--color-landing-lavender)',
                            o: 0.6,
                        },
                        {
                            cx: 1180,
                            cy: 520,
                            r: 4.5,
                            fill: 'var(--color-landing-pink)',
                            o: 0.6,
                        },
                        {
                            cx: 380,
                            cy: 680,
                            r: 3.5,
                            fill: 'var(--color-landing-pink)',
                            o: 0.5,
                        },
                        {
                            cx: 860,
                            cy: 150,
                            r: 4,
                            fill: 'var(--color-landing-coral)',
                            o: 0.45,
                        },
                        {
                            cx: 1340,
                            cy: 240,
                            r: 3.5,
                            fill: 'var(--color-landing-lavender)',
                            o: 0.5,
                        },
                        {
                            cx: 90,
                            cy: 330,
                            r: 3.5,
                            fill: 'var(--color-landing-coral)',
                            o: 0.4,
                        },
                        {
                            cx: 1020,
                            cy: 620,
                            r: 4,
                            fill: 'var(--color-landing-pink)',
                            o: 0.5,
                        },
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
                            background: 'var(--color-landing-rose-soft)',
                            color: 'var(--color-landing-rose)',
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
                            fontSize: 'clamp(40px,5.6vw,68px)',
                            lineHeight: 1.2,
                            margin: '0 0 12px',
                            animation: fadeUpIn(100),
                        }}
                    >
                        이번 여행,
                        <br />
                        <WordRotate
                            words={['플래너 말고', '엑셀 말고', '메모장 말고']}
                            interval={2200}
                            style={{ color: 'var(--color-landing-coral)' }}
                        />
                        <br />
                        여기서 짜자.
                    </h1>
                    <p
                        style={{
                            fontSize: 'clamp(16px,1.8vw,20px)',
                            lineHeight: 1.45,
                            color: 'var(--color-landing-body)',
                            fontWeight: 700,
                            margin: '0 0 14px',
                            maxWidth: 520,
                            animation: fadeUpIn(200),
                        }}
                    >
                        흩어진 장소랑 의견,
                        <br />
                        한곳에 모으고
                        <br />
                        AI가 정리까지 싹 다 해드려요.
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            gap: 14,
                            flexWrap: 'wrap',
                            marginBottom: 8,
                            animation: fadeUpIn(300),
                        }}
                    >
                        <button
                            type="button"
                            onClick={startCreatingTrip}
                            disabled={!isInitialized}
                            onMouseEnter={() => setCtaHover(true)}
                            onMouseLeave={() => setCtaHover(false)}
                            className="pl-cta-btn"
                            style={{
                                background: 'var(--color-landing-coral)',
                                color: 'var(--color-landing-cream)',
                                fontWeight: 700,
                                fontSize: 16,
                                padding: '16px 28px',
                                borderRadius: 999,
                                boxShadow:
                                    '0 12px 24px rgb(var(--rgb-landing-coral-strong)/0.34)',
                                transition:
                                    'transform 0.2s ease, box-shadow 0.2s ease',
                                textDecoration: 'none',
                                display: 'inline-block',
                                border: 'none',
                                cursor: isInitialized ? 'pointer' : 'wait',
                                fontFamily: 'var(--font-landing)',
                            }}
                        >
                            바로 여행방 만들기
                        </button>
                        <a
                            href="#ai-section"
                            onClick={scrollTo('ai-section')}
                            className="pl-ghost-btn"
                            style={{
                                background: 'var(--color-landing-surface)',
                                color: 'var(--color-landing-ink)',
                                fontWeight: 700,
                                fontSize: 16,
                                padding: '16px 28px',
                                borderRadius: 999,
                                border: '1.5px solid var(--color-landing-border)',
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
                            color: 'var(--color-landing-muted)',
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
                            marginTop: 14,
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
                                        color: 'var(--color-landing-coral)',
                                        fontFamily: 'var(--font-landing)',
                                        lineHeight: 1,
                                    }}
                                />
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--color-landing-muted)',
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
                            stroke="var(--color-landing-purple)"
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
                            <HeroGlobe />
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
                                        stroke="var(--color-landing-coral)"
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
                <ScrollDownHint onClick={scrollTo('problem-section')} />
            </section>

            {!isMobile && (
                <LandingJourneyRail
                    activeSection={activeSection}
                    onNavigate={scrollTo}
                />
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
                    padding: SCENE_SECTION_PADDING,
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
                            'radial-gradient(circle, var(--color-landing-lavender) 0%, transparent 70%)',
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
                            'radial-gradient(circle, var(--color-landing-pink) 0%, transparent 70%)',
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
                                WebkitTextStroke:
                                    '1.5px rgb(var(--rgb-landing-rose)/0.16)',
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
                                color: 'var(--color-landing-rose)',
                                letterSpacing: '0.05em',
                            }}
                        >
                            SCENE 01 · PROBLEM
                        </div>
                    </div>
                    <h2
                        className="pl-h pl-h2-hover"
                        style={{
                            ...SCENE_H2_BASE,
                            margin: '0 0 20px',
                        }}
                    >
                        지도 검색 따로, 캡처 따로, 공유 따로.
                        <br />이 번거로운 무한 굴레.
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
                            gap: 18,
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
                                            fill="var(--color-landing-lavender)"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                delay: 140,
                                rotate: '3deg',
                                ml: -10,
                                label: '공유 링크',
                                title: '지도 앱에서 공유하기',
                                sub: '저장 12곳',
                                icon: (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2"
                                            stroke="var(--color-landing-muted)"
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
                                            fill="var(--color-landing-lavender)"
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
                                            color: 'var(--color-landing-muted)',
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
                                            color: 'var(--color-landing-ink)',
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
                                                color: 'var(--color-landing-muted)',
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
                                filter: 'drop-shadow(0 16px 20px rgb(var(--rgb-landing-coral)/0.2))',
                            }}
                        />
                    </div>

                    {/* 오른쪽 스크랩 */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 18,
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
                                            stroke="var(--color-landing-muted)"
                                            strokeWidth="1.8"
                                        />
                                        <path
                                            d="M9 11h6M9 15h6"
                                            stroke="var(--color-landing-muted)"
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
                                            stroke="var(--color-landing-muted)"
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
                                            stroke="var(--color-landing-muted)"
                                            strokeWidth="1.8"
                                        />
                                        <circle
                                            cx="12"
                                            cy="13.5"
                                            r="3"
                                            fill="none"
                                            stroke="var(--color-landing-muted)"
                                            strokeWidth="1.6"
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
                                            color: 'var(--color-landing-muted)',
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
                                            color: 'var(--color-landing-ink)',
                                        }}
                                    >
                                        {title}
                                    </div>
                                    {sub && (
                                        <div
                                            style={{
                                                fontSize: 11.5,
                                                fontWeight: 600,
                                                color: 'var(--color-landing-muted)',
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
                <ScrollDownHint onClick={scrollTo('place-section')} />
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
                    padding: SCENE_SECTION_PADDING,
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
                            'radial-gradient(circle, var(--color-landing-coral) 0%, transparent 70%)',
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
                            maxWidth: 520,
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
                            <img
                                src="/assets/landing-place-search-preview.png"
                                alt="도쿄 카페를 검색하고 여행방에 장소를 추가하는 실제 서비스 화면"
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    height: 'auto',
                                    border: '3px solid var(--color-landing-ink)',
                                    borderRadius: 22,
                                    boxShadow:
                                        '5px 5px 0 var(--color-landing-ink)',
                                }}
                            />
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
                                        '1.5px rgb(var(--rgb-landing-rose)/0.14)',
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
                                    color: 'var(--color-landing-rose)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 02 · PLACE
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                ...SCENE_H2_BASE,
                                margin: '0 0 20px',
                            }}
                        >
                            검색창에 쓱, 지도에 콕.
                            <br />
                            귀찮은 정리는 AI가 알아서.
                        </h2>
                        <p
                            style={{
                                fontSize: 19,
                                lineHeight: 1.75,
                                color: 'var(--color-landing-body)',
                                fontWeight: 500,
                                wordBreak: 'keep-all',
                            }}
                        >
                            저장한 장소는 카테고리별로 자동 정리돼서,
                            <br />
                            여행방 전체가 한눈에 볼 수 있어요.
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
                            filter: 'drop-shadow(0 12px 14px rgb(var(--rgb-landing-coral)/0.24))',
                        }}
                    />
                </div>
                <ScrollDownHint onClick={scrollTo('vote-section')} />
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
                    padding: SCENE_SECTION_PADDING,
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
                            'radial-gradient(circle, var(--color-landing-pink) 0%, transparent 70%)',
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
                                        '1.5px rgb(var(--rgb-landing-rose)/0.14)',
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
                                    color: 'var(--color-landing-rose)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 03 · VOTE
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                ...SCENE_H2_BASE,
                                margin: '0 0 20px',
                            }}
                        >
                            투표 한 번이면
                            <br />
                            싸울 일 없이 결정 끝.
                        </h2>
                        <p
                            style={{
                                fontSize: 19,
                                lineHeight: 1.75,
                                color: 'var(--color-landing-body)',
                                fontWeight: 500,
                                wordBreak: 'keep-all',
                            }}
                        >
                            멤버들이 장소마다 찬성, 반대로 투표하고 댓글을
                            남기면,
                            <br />
                            모두의 의견이 자연스럽게 하나로 모여요.
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
                            maxWidth: 560,
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
                            <img
                                src="/assets/landing-vote-preview.png"
                                alt="한큐 우메다 본점의 AI 장소 정보와 찬반 투표가 표시된 실제 서비스 화면"
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    height: 'auto',
                                    border: '3px solid var(--color-landing-ink)',
                                    borderRadius: 22,
                                    boxShadow:
                                        '5px 5px 0 var(--color-landing-ink)',
                                }}
                            />
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
                            filter: 'drop-shadow(0 12px 14px rgb(var(--rgb-landing-coral)/0.24))',
                        }}
                    />
                </div>
                <ScrollDownHint onClick={scrollTo('ai-section')} />
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
                    padding: SCENE_SECTION_PADDING,
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
                            'radial-gradient(circle, var(--color-landing-lavender) 0%, transparent 70%)',
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
                            maxWidth: 560,
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
                            <img
                                src="/assets/landing-route-preview.png"
                                alt="오사카 여행 장소를 이동 거리와 방문 시간에 맞춰 배치한 실제 동선 추천 화면"
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    height: 'auto',
                                    border: '3px solid var(--color-landing-ink)',
                                    borderRadius: 22,
                                    boxShadow:
                                        '5px 5px 0 var(--color-landing-ink)',
                                }}
                            />
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
                                        '1.5px rgb(var(--rgb-landing-rose)/0.14)',
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
                                    color: 'var(--color-landing-rose)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 04 · AI
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                ...SCENE_H2_BASE,
                                margin: '0 0 20px',
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
                                color: 'var(--color-landing-body)',
                                fontWeight: 500,
                                wordBreak: 'keep-all',
                            }}
                        >
                            확정된 장소들을 동선까지 고려해 하루씩 배치해드려요.
                            <br />
                            마음에 안 들면 언제든 직접 수정할 수 있어요.
                            <br />
                            결정은 늘 여러분의 몫이에요.
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
                            filter: 'drop-shadow(0 12px 14px rgb(var(--rgb-landing-coral)/0.24))',
                        }}
                    />
                </div>
                <ScrollDownHint onClick={scrollTo('expense-section')} />
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
                    padding: SCENE_SECTION_PADDING,
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
                            'radial-gradient(circle, var(--color-landing-coral) 0%, transparent 70%)',
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
                                    fontSize: 'clamp(80px,10vw,130px)',
                                    fontWeight: 800,
                                    color: 'transparent',
                                    WebkitTextStroke:
                                        '1.5px rgb(var(--rgb-landing-rose)/0.14)',
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
                                    color: 'var(--color-landing-rose)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 05 · EXPENSE
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                ...SCENE_H2_BASE,
                                margin: '0 0 24px',
                            }}
                        >
                            누가 얼마 냈는지,
                            <br />
                            더치페이 계산기 그만.
                        </h2>
                        <img
                            src="/assets/landing-expense-preview.png"
                            alt="오사카 숙박비를 여행 멤버별로 나누고 정산 상태를 확인하는 실제 서비스 화면"
                            style={{
                                display: 'block',
                                width: 'min(100%, 440px)',
                                height: 'auto',
                                margin: '0 auto',
                                border: '3px solid var(--color-landing-ink)',
                                borderRadius: 22,
                                boxShadow: '5px 5px 0 var(--color-landing-ink)',
                            }}
                        />
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
                            filter: 'drop-shadow(0 12px 14px rgb(var(--rgb-landing-coral)/0.22))',
                        }}
                    />
                </div>
                <ScrollDownHint onClick={scrollTo('cta-section')} />
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
                    padding: SCENE_SECTION_PADDING,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    background:
                        'linear-gradient(180deg,var(--color-landing-cream) 0%,var(--color-landing-cream-deep) 100%)',
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
                            'radial-gradient(circle, var(--color-landing-pink) 0%, transparent 70%)',
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
                            'radial-gradient(circle, var(--color-landing-lavender) 0%, transparent 70%)',
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
                        stroke="var(--color-landing-coral)"
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
                                        '1.5px rgb(var(--rgb-landing-rose)/0.16)',
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
                                    color: 'var(--color-landing-rose)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                SCENE 06 · GO
                            </div>
                        </div>
                        <h2
                            className="pl-h pl-h2-hover"
                            style={{
                                ...SCENE_H2_BASE,
                                margin: '0 0 32px',
                            }}
                        >
                            고민은 그만,
                            <br />
                            여행은 이미 시작됐어요.
                        </h2>
                        <ConfettiButton
                            onClick={startCreatingTrip}
                            className="pl-cta-btn"
                            style={{
                                display: 'inline-block',
                                background: 'var(--color-landing-coral)',
                                color: 'var(--color-landing-cream)',
                                fontWeight: 700,
                                fontSize: 17,
                                padding: '18px 36px',
                                borderRadius: 999,
                                boxShadow:
                                    '0 16px 30px rgb(var(--rgb-landing-coral-strong)/0.36)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                fontFamily: 'var(--font-landing)',
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
                                filter: 'drop-shadow(0 14px 16px rgb(var(--rgb-landing-coral)/0.26))',
                            }}
                        />
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'var(--color-landing-lavender)',
                                margin: '0 -8px 20px',
                                boxShadow:
                                    '0 8px 16px rgb(var(--rgb-landing-deep)/0.14)',
                            }}
                        />
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'var(--color-landing-pink)',
                                marginBottom: 34,
                                boxShadow:
                                    '0 8px 16px rgb(var(--rgb-landing-deep)/0.14)',
                            }}
                        />
                    </div>
                </div>
            </section>

            <LandingFooter />
        </div>
    )
}
