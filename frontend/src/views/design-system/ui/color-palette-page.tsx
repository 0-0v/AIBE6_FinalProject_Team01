import { useEffect, useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'

const COLOR_GROUPS = [
    {
        title: 'Brand',
        description: '브랜드 기본색과 상호작용 상태',
        tokens: [
            '--color-brand',
            '--color-brand-50',
            '--color-brand-100',
            '--color-brand-200',
            '--color-brand-600',
            '--color-brand-700',
            '--color-brand-vivid',
            '--color-brand-dark',
            '--color-brand-deep',
            '--color-brand-muted',
            '--color-brand-accent',
            '--color-brand-gradient-start',
            '--color-brand-gradient-middle',
            '--color-brand-gradient-finish',
            '--color-brand-scrollbar-hover',
            '--color-brand-surface',
            '--color-brand-surface-soft',
            '--color-brand-surface-strong',
            '--color-brand-surface-subtle',
            '--color-brand-highlight',
        ],
    },
    {
        title: 'Application',
        description: '앱 배경, 본문, 테두리와 공용 표면',
        tokens: [
            '--color-app-background',
            '--color-app-background-alt',
            '--color-app-surface',
            '--color-app-ink',
            '--color-app-navy',
            '--color-app-navy-600',
            '--color-app-navy-700',
            '--color-app-navy-800',
            '--color-app-navy-900',
            '--color-app-navy-muted',
            '--color-app-navy-soft',
            '--color-app-text',
            '--color-app-text-secondary',
            '--color-app-text-muted',
            '--color-app-border',
            '--color-app-neutral',
            '--color-app-overlay',
            '--color-app-avatar',
            '--color-app-avatar-icon',
            '--color-app-warm-background',
            '--color-app-warm-surface',
            '--color-app-ticket-notch',
        ],
    },
    {
        title: 'Landing',
        description: '랜딩 페이지 전용 팔레트',
        tokens: [
            '--color-landing-canvas',
            '--color-landing-surface',
            '--color-landing-cream',
            '--color-landing-cream-deep',
            '--color-landing-surface-muted',
            '--color-landing-border',
            '--color-landing-border-strong',
            '--color-landing-ink',
            '--color-landing-body',
            '--color-landing-muted',
            '--color-landing-faint',
            '--color-landing-coral',
            '--color-landing-coral-strong',
            '--color-landing-pink',
            '--color-landing-rose',
            '--color-landing-lavender',
            '--color-landing-lavender-soft',
            '--color-landing-purple',
            '--color-landing-yellow',
            '--color-landing-rose-soft',
            '--color-landing-rose-muted',
        ],
    },
    {
        title: 'Category',
        description: '장소 분류와 지도 일정 색상',
        tokens: [
            '--color-category-cafe',
            '--color-category-food',
            '--color-category-bar',
            '--color-category-attraction',
            '--color-category-nature',
            '--color-category-lodging',
            '--color-category-shopping',
            '--color-category-convenience',
            '--color-category-activity',
            '--color-category-transport',
            '--color-category-other',
            '--color-map-day-1',
            '--color-map-day-2',
            '--color-map-day-3',
            '--color-map-day-4',
            '--color-map-day-5',
            '--color-map-day-6',
            '--color-map-day-7',
            '--color-map-day-8',
        ],
    },
    {
        title: 'Provider',
        description: '외부 로그인 제공자 색상',
        tokens: [
            '--color-provider-kakao',
            '--color-provider-kakao-ink',
            '--color-provider-google-ink',
        ],
    },
] as const

type TokenName = (typeof COLOR_GROUPS)[number]['tokens'][number]

export function ColorPalettePage() {
    const [values, setValues] = useState<Partial<Record<TokenName, string>>>({})
    const [copiedToken, setCopiedToken] = useState<TokenName | null>(null)

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            const styles = window.getComputedStyle(document.documentElement)
            const nextValues: Partial<Record<TokenName, string>> = {}

            COLOR_GROUPS.forEach((group) => {
                group.tokens.forEach((token) => {
                    nextValues[token] = styles.getPropertyValue(token).trim()
                })
            })
            setValues(nextValues)
        })

        return () => window.cancelAnimationFrame(frameId)
    }, [])

    const copyToken = async (token: TokenName) => {
        const cssVariable = `var(${token})`

        try {
            await navigator.clipboard.writeText(cssVariable)
        } catch {
            const textarea = document.createElement('textarea')
            textarea.value = cssVariable
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            textarea.remove()
        }

        setCopiedToken(token)
        window.setTimeout(() => setCopiedToken(null), 1200)
    }

    return (
        <main className="min-h-full bg-[var(--color-app-background)] px-6 py-10 text-[var(--color-app-ink)] sm:px-10 lg:px-16">
            <div className="mx-auto max-w-[1440px]">
                <header className="mb-12">
                    <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand">
                        Design System
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight">
                        Color Palette
                    </h1>
                    <p className="mt-3 text-sm text-[var(--color-app-text-secondary)]">
                        칩을 클릭하면 CSS 변수 표현식이 복사됩니다.
                    </p>
                </header>

                <div className="space-y-12">
                    {COLOR_GROUPS.map((group) => (
                        <section key={group.title}>
                            <div className="mb-5">
                                <h2 className="text-xl font-extrabold">
                                    {group.title}
                                </h2>
                                <p className="mt-1 text-sm text-[var(--color-app-text-muted)]">
                                    {group.description}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {group.tokens.map((token) => {
                                    const copied = copiedToken === token
                                    return (
                                        <button
                                            key={token}
                                            type="button"
                                            onClick={() =>
                                                void copyToken(token)
                                            }
                                            className="group overflow-hidden rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                                            aria-label={`${token} 복사`}
                                        >
                                            <span
                                                className="block h-28 border-b border-[var(--color-app-border)]"
                                                style={{
                                                    backgroundColor: `var(${token})`,
                                                }}
                                            />
                                            <span className="flex items-center justify-between gap-3 p-4">
                                                <span className="min-w-0">
                                                    <span className="block truncate font-mono text-xs font-bold">
                                                        {token}
                                                    </span>
                                                    <span className="mt-1 block font-mono text-xs uppercase text-[var(--color-app-text-muted)]">
                                                        {values[token] ||
                                                            '불러오는 중'}
                                                    </span>
                                                </span>
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-app-background)] text-[var(--color-app-text-secondary)] transition group-hover:text-brand">
                                                    {copied ? (
                                                        <CheckIcon size={16} />
                                                    ) : (
                                                        <CopyIcon size={16} />
                                                    )}
                                                </span>
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </main>
    )
}
