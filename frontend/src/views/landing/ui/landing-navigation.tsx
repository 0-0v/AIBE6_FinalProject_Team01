import type { MouseEventHandler } from 'react'
import { BrandLogo } from '@/shared/ui'

type LandingNavigationProps = {
    isVisible: boolean
    isScrolled: boolean
    isInitialized: boolean
    onNavigate: (sectionId: string) => MouseEventHandler
    onStart: () => void
}

export function LandingNavigation({
    isVisible,
    isScrolled,
    isInitialized,
    onNavigate,
    onStart,
}: LandingNavigationProps) {
    return (
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
                transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
                transition:
                    'background 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease, opacity 0.35s ease',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: -1,
                    background: isScrolled
                        ? 'rgba(255,247,238,0.86)'
                        : 'transparent',
                    backdropFilter: isScrolled ? 'blur(16px)' : 'none',
                    boxShadow: isScrolled
                        ? '0 1.5px 0 rgba(35,38,75,0.06)'
                        : 'none',
                    transition: 'background 0.35s ease, box-shadow 0.35s ease',
                }}
            />
            <a
                href="#pl-hero"
                onClick={onNavigate('pl-hero')}
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
                    onClick={onNavigate('place-section')}
                    className="pl-nav-link"
                >
                    주요 기능
                </a>
                <a
                    href="#vote-section"
                    onClick={onNavigate('vote-section')}
                    className="pl-nav-link"
                >
                    이용 방법
                </a>
                <a
                    href="#ai-section"
                    onClick={onNavigate('ai-section')}
                    className="pl-nav-link"
                >
                    AI 여행 계획
                </a>
            </div>
            <button
                onClick={onStart}
                disabled={!isInitialized}
                style={{
                    zIndex: 1,
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
        </nav>
    )
}
