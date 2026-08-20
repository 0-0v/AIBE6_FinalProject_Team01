import { useEffect, useState } from 'react'
import {
    CheckIcon,
    CopyIcon,
    ExternalLinkIcon,
    RotateCcwIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const DASHBOARD_TOKENS = [
    { token: '--background-app-panel', label: '대시보드 패널' },
    { token: '--background-vote-panel', label: '투표 대기 패널' },
    { token: '--background-calendar-panel', label: '캘린더 패널' },
    { token: '--background-app-ticket', label: '비행기 티켓' },
    {
        token: '--color-app-ticket-accent',
        label: '비행기·D-Day·캘린더 날짜',
    },
    { token: '--background-trip-selector', label: '여행지 선택 배경' },
    { token: '--color-trip-selector', label: '여행지 선택 글자' },
    { token: '--background-trip-status', label: '여행 상태 배지' },
    { token: '--color-trip-status', label: '여행 상태 글자·점' },
    { token: '--color-carousel-active', label: '슬라이드 활성 표시' },
    { token: '--color-carousel-inactive', label: '슬라이드 비활성 표시' },
    { token: '--background-strong-action', label: '강한 액션 버튼' },
    { token: '--color-notification-badge', label: '알림 배지' },
    { token: '--color-primary-action', label: '주 액션·선택 날짜' },
    { token: '--color-secondary-action', label: '보조 액션·링크' },
    { token: '--color-vote-accent', label: '투표 강조' },
] as const

type DashboardToken = (typeof DASHBOARD_TOKENS)[number]['token']

function getPickerColor(value: string) {
    return value.match(/#[0-9a-f]{6}/i)?.[0] ?? '#ffffff'
}

const COLOR_GROUPS = [
    {
        title: 'Brand',
        description: '밝은 배경부터 진한 강조색까지 50~900 단계',
        tokens: [
            '--color-brand-50',
            '--color-brand-100',
            '--color-brand-200',
            '--color-brand-300',
            '--color-brand-400',
            '--color-brand-500',
            '--color-brand-600',
            '--color-brand-700',
            '--color-brand-800',
            '--color-brand-900',
        ],
    },
    {
        title: 'Application',
        description: '앱 공용 무채색과 네이비를 50~900 단계로 통합',
        tokens: [
            '--color-app-neutral-50',
            '--color-app-neutral-100',
            '--color-app-neutral-200',
            '--color-app-neutral-300',
            '--color-app-neutral-400',
            '--color-app-neutral-500',
            '--color-app-neutral-700',
            '--color-app-neutral-800',
            '--color-app-neutral-900',
            '--color-app-navy-50',
            '--color-app-navy-100',
            '--color-app-navy-200',
            '--color-app-navy-300',
            '--color-app-navy-400',
            '--color-app-navy-500',
            '--color-app-navy-600',
            '--color-app-navy-700',
            '--color-app-navy-800',
            '--color-app-navy-900',
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
    const [dashboardValues, setDashboardValues] = useState<
        Record<DashboardToken, string>
    >({} as Record<DashboardToken, string>)
    const [dashboardDefaults, setDashboardDefaults] = useState<
        Record<DashboardToken, string>
    >({} as Record<DashboardToken, string>)
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
            const nextDashboardValues = {} as Record<DashboardToken, string>
            DASHBOARD_TOKENS.forEach(({ token }) => {
                nextDashboardValues[token] = styles
                    .getPropertyValue(token)
                    .trim()
            })
            setValues(nextValues)
            setDashboardValues(nextDashboardValues)
            setDashboardDefaults(nextDashboardValues)
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

    const updateDashboardToken = (token: DashboardToken, value: string) => {
        setDashboardValues((current) => ({ ...current, [token]: value }))
        document.documentElement.style.setProperty(token, value)
    }

    const resetDashboardTokens = () => {
        DASHBOARD_TOKENS.forEach(({ token }) => {
            document.documentElement.style.removeProperty(token)
        })
        setDashboardValues(dashboardDefaults)
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

                <section className="mb-12 rounded-3xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">
                                Live Theme Lab
                            </p>
                            <h2 className="mt-1 text-2xl font-black">
                                대시보드 색상 바로 바꾸기
                            </h2>
                            <p className="mt-2 text-sm text-[var(--color-app-text-secondary)]">
                                변경값은 현재 브라우저 탭에만 임시 적용됩니다.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetDashboardTokens}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-app-border)] px-4 text-sm font-bold text-[var(--color-app-text-secondary)] transition hover:bg-[var(--color-app-background)]"
                            >
                                <RotateCcwIcon size={15} /> 초기화
                            </button>
                            <Link
                                to="/app"
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-700"
                            >
                                대시보드 보기 <ExternalLinkIcon size={15} />
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {DASHBOARD_TOKENS.map(({ token, label }) => {
                            const value = dashboardValues[token] ?? ''

                            return (
                                <label
                                    key={token}
                                    className="rounded-2xl border border-[var(--color-app-border)] p-4"
                                >
                                    <span className="flex items-center gap-3">
                                        <span
                                            className="size-10 shrink-0 rounded-xl border border-black/5"
                                            style={{ background: value }}
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-extrabold">
                                                {label}
                                            </span>
                                            <span className="block truncate font-mono text-[11px] text-[var(--color-app-text-muted)]">
                                                {token}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="mt-3 flex gap-2">
                                        <input
                                            type="color"
                                            value={getPickerColor(value)}
                                            onChange={(event) =>
                                                updateDashboardToken(
                                                    token,
                                                    event.target.value,
                                                )
                                            }
                                            className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-[var(--color-app-border)] bg-transparent p-1"
                                            aria-label={`${label} 색상 선택`}
                                        />
                                        <input
                                            value={value}
                                            onChange={(event) =>
                                                updateDashboardToken(
                                                    token,
                                                    event.target.value,
                                                )
                                            }
                                            className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-background)] px-3 font-mono text-xs outline-none focus:border-brand"
                                            aria-label={`${label} CSS 값`}
                                        />
                                    </span>
                                </label>
                            )
                        })}
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl bg-[var(--color-app-background)] p-5">
                        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-app-text-muted)]">
                            Dashboard Preview
                        </p>
                        <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)_260px]">
                            <aside className="rounded-2xl bg-[var(--color-app-surface)] p-4 shadow-sm">
                                <p className="text-lg font-black">
                                    여행지 선택
                                </p>
                                <div className="mt-5">
                                    <p className="mb-2 text-xs font-bold text-[var(--color-app-text-muted)]">
                                        오늘 여행지는
                                    </p>
                                    <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--background-trip-selector)] px-3 py-2 text-lg font-black text-[var(--color-trip-selector)]">
                                        북한⌄
                                    </div>
                                </div>
                            </aside>

                            <article className="relative min-h-64 overflow-hidden rounded-2xl bg-[var(--background-app-ticket)] p-6 text-white shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="font-display text-xs font-black uppercase tracking-[0.22em]">
                                        Boarding pass
                                    </p>
                                    <span className="rounded-full bg-[var(--background-trip-status)] px-3 py-1 text-xs font-bold text-[var(--color-trip-status)]">
                                        준비 중
                                    </span>
                                </div>
                                <div className="mt-10 grid grid-cols-[auto_1fr_auto] items-center gap-4">
                                    <strong className="font-display text-4xl font-black">
                                        KOR
                                    </strong>
                                    <div className="flex items-center">
                                        <span className="w-full border-t-2 border-dashed border-white/35" />
                                        <span className="px-3 text-3xl text-[var(--color-app-ticket-accent)]">
                                            ✈
                                        </span>
                                        <span className="w-full border-t-2 border-dashed border-white/35" />
                                    </div>
                                    <strong className="font-display text-4xl font-black">
                                        JP
                                    </strong>
                                </div>
                                <div className="absolute bottom-5 right-6 font-display text-3xl font-black text-[var(--color-app-ticket-accent)]">
                                    D-6
                                </div>
                            </article>

                            <aside className="rounded-2xl bg-[var(--background-app-panel)] p-5 shadow-sm">
                                <p className="text-lg font-black">투표 대기</p>
                                <p className="mt-1 text-xs text-[var(--color-app-text-secondary)]">
                                    패널 배경과 글자색 미리보기
                                </p>
                                <div className="mt-5 rounded-xl bg-[var(--color-brand-surface)] p-4">
                                    <p className="font-bold text-[var(--color-brand)]">
                                        제주도 여행
                                    </p>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                        <div className="h-full w-2/3 rounded-full bg-brand" />
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-[var(--color-app-text-muted)]">
                                    {[18, 19, 20, 21, 22, 23, 24].map((day) => (
                                        <span
                                            key={day}
                                            className={`flex size-7 items-center justify-center rounded-full ${day === 21 ? 'bg-[var(--color-app-ticket-accent)] text-white' : ''}`}
                                        >
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>

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
