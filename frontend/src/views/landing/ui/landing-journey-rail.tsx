import { Fragment, useState, type MouseEventHandler } from 'react'

export const RAIL_LABEL_MAX_WIDTH = 110

const JOURNEY_STEPS: Array<[id: string, label: string]> = [
    ['problem', '흩어진 계획'],
    ['place', '장소 저장'],
    ['vote', '투표 결정'],
    ['ai', 'AI 일정 추천'],
    ['expense', '정산 N빵'],
    ['cta', '시작하기'],
]

const RAIL_DOT_PADDING_X = 6
const railConnectorOffset = (dotSize: number) =>
    RAIL_DOT_PADDING_X + dotSize / 2 - 1

type LandingJourneyRailProps = {
    activeSection: string
    onNavigate: (sectionId: string) => MouseEventHandler
}

export function LandingJourneyRail({
    activeSection,
    onNavigate,
}: LandingJourneyRailProps) {
    const [isHovered, setIsHovered] = useState(false)
    const activeIndex = JOURNEY_STEPS.findIndex(
        ([sectionId]) => sectionId === activeSection,
    )

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="pl-rail"
            style={{
                position: 'fixed',
                right: 28,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 2,
                padding: '10px 8px',
                borderRadius: 20,
                background: isHovered
                    ? 'var(--color-landing-surface)'
                    : 'transparent',
                border: isHovered
                    ? '1.5px solid var(--color-landing-border)'
                    : '1.5px solid transparent',
                boxShadow: isHovered
                    ? '0 12px 28px rgb(var(--rgb-landing-ink)/0.1)'
                    : 'none',
                transition:
                    'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            }}
        >
            {JOURNEY_STEPS.map(([id, label], index) => {
                const isActive = id === activeSection
                const isPassed = activeIndex > index

                return (
                    <Fragment key={id}>
                        <button
                            type="button"
                            aria-label={`${label} 섹션으로 이동`}
                            onClick={onNavigate(`${id}-section`)}
                            className="pl-rail-dot"
                            style={{
                                display: 'flex',
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                gap: 10,
                                padding: `4px ${RAIL_DOT_PADDING_X}px`,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <span
                                style={{
                                    display: 'block',
                                    flexShrink: 0,
                                    width: isActive ? 12 : 8,
                                    height: isActive ? 12 : 8,
                                    borderRadius: '50%',
                                    background: isActive
                                        ? 'var(--color-landing-coral)'
                                        : isPassed
                                          ? 'var(--color-landing-pink)'
                                          : 'var(--color-landing-border)',
                                    transition: 'all 0.35s ease',
                                    boxShadow: isActive
                                        ? '0 0 0 5px rgb(var(--rgb-landing-coral)/0.16)'
                                        : 'none',
                                }}
                            />
                            <span
                                className="pl-rail-label"
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: isActive
                                        ? 'var(--color-landing-coral)'
                                        : 'var(--color-landing-muted)',
                                    whiteSpace: 'nowrap',
                                    maxWidth: isHovered
                                        ? RAIL_LABEL_MAX_WIDTH
                                        : 0,
                                    opacity: isHovered ? 1 : 0,
                                    overflow: 'hidden',
                                    transition:
                                        'max-width 0.25s ease, opacity 0.2s ease',
                                }}
                            >
                                {label}
                            </span>
                        </button>
                        {index < JOURNEY_STEPS.length - 1 && (
                            <div
                                style={{
                                    width: 2,
                                    height: 22,
                                    marginRight: railConnectorOffset(
                                        isActive ? 12 : 8,
                                    ),
                                    background: isPassed
                                        ? 'var(--color-landing-pink)'
                                        : 'var(--color-landing-border)',
                                    transition:
                                        'background 0.35s ease, margin-right 0.35s ease',
                                }}
                            />
                        )}
                    </Fragment>
                )
            })}
        </div>
    )
}
