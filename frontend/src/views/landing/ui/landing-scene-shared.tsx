import type { CSSProperties, MouseEventHandler } from 'react'
import { RAIL_LABEL_MAX_WIDTH } from './landing-journey-rail'

export const LANDING_STYLES = `
  @keyframes pl-fadeUpIn { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pl-heroBody { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
  @keyframes pl-heroBag { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-2px); } }
  @keyframes pl-twinkle { 0%,100% { opacity: 0.5; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.1); } }
  @keyframes pl-scrollBounce { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(7px); } }
  .pl-h { font-family: var(--font-landing-heading) !important; font-weight: 400 !important; letter-spacing: 0 !important; word-break: keep-all; }
  .pl-nav-link { font-weight: 600; font-size: 15px; color: var(--color-landing-ink); position: relative; padding-bottom: 2px; background-image: linear-gradient(var(--color-landing-coral), var(--color-landing-coral)); background-size: 0% 2px; background-repeat: no-repeat; background-position: left bottom; transition: background-size 0.25s ease; text-decoration: none; }
  .pl-nav-link:hover { background-size: 100% 2px; }
  .pl-cta-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 28px rgb(var(--rgb-landing-coral-strong)/0.42) !important; }
  .pl-ghost-btn:hover { transform: translateY(-3px); border-color: var(--color-landing-pink) !important; }
  .pl-scroll-hint:hover { border-color: var(--color-landing-pink) !important; animation-play-state: paused; }
  .pl-rail-dot:focus-visible { outline: 2px solid var(--color-landing-coral); outline-offset: 2px; border-radius: 10px; }
  .pl-rail:focus-within { background: var(--color-landing-surface) !important; border-color: var(--color-landing-border) !important; box-shadow: 0 12px 28px rgb(var(--rgb-landing-ink)/0.1) !important; }
  .pl-rail:focus-within .pl-rail-label { max-width: ${RAIL_LABEL_MAX_WIDTH}px !important; opacity: 1 !important; }
  .pl-h2-hover:hover { transform: scale(1.015); }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  }
  @media (max-width: 720px) {
    #pl-hero { flex-wrap: wrap !important; min-height: auto !important; }
    #pl-hero > div { flex-basis: 100% !important; }
  }
`

export const fadeUpIn = (delayMs: number) =>
    `pl-fadeUpIn 0.8s cubic-bezier(.22,1,.36,1) ${delayMs}ms both`

export const SCENE_SECTION_PADDING =
    'calc(min(5vw,48px) + 64px) clamp(20px,6vw,80px) calc(min(5vw,48px) + 16px)'

export const SCENE_H2_BASE: CSSProperties = {
    fontSize: 'clamp(32px,4.6vw,52px)',
    lineHeight: 1.36,
    transition: 'transform 0.3s ease',
}

export function ScrollDownHint({
    onClick,
}: {
    onClick?: MouseEventHandler<HTMLButtonElement>
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="다음 섹션으로 스크롤"
            className="pl-scroll-hint"
            style={{
                position: 'absolute',
                left: '50%',
                bottom: 'clamp(14px,2.5vw,28px)',
                transform: 'translateX(-50%)',
                zIndex: 2,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--color-landing-surface)',
                border: '1.5px solid var(--color-landing-border)',
                boxShadow: '0 8px 18px rgb(var(--rgb-landing-ink)/0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                animation: 'pl-scrollBounce 1.8s ease-in-out infinite',
            }}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                    d="M5 9l7 7 7-7"
                    stroke="var(--color-landing-coral)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    )
}
