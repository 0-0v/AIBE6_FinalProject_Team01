import React, { useCallback, useEffect, useRef, useState } from 'react'

export function useLandingInteractions(landingStyles: string) {
    const [scrolled, setScrolled] = useState(false)
    // 히어로(첫 섹션)에서만 헤더를 보여주고, 다른 섹션으로 넘어가면 숨긴다.
    const [showNav, setShowNav] = useState(true)
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
    const [railHovered, setRailHovered] = useState(false)
    const [smx, setSmx] = useState(0)
    const [smy, setSmy] = useState(0)

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
        style.textContent = landingStyles
        document.head.appendChild(style)
        return () => {
            document.head.removeChild(style)
        }
    }, [landingStyles])

    // 스크롤 감지
    useEffect(() => {
        const onScroll = () => {
            if (scrollRafRef.current) return
            scrollRafRef.current = requestAnimationFrame(() => {
                scrollRafRef.current = null
                setScrolled(window.scrollY > 24)
                const heroHeight =
                    document.getElementById('pl-hero')?.getBoundingClientRect()
                        .height ?? window.innerHeight
                setShowNav(window.scrollY < heroHeight * 0.6)
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

    // 파워포인트 슬라이드처럼 휠을 한 번 굴릴 때마다 다음/이전 섹션으로 즉시 전환한다.
    // (스크롤이 흐르듯 이어지지 않도록 기본 스크롤을 막고 섹션 단위로만 점프시킨다)
    useEffect(() => {
        if (isMobile || reduced) return

        const sectionIds = [
            'pl-hero',
            'problem-section',
            'place-section',
            'vote-section',
            'ai-section',
            'expense-section',
            'cta-section',
        ]
        let locked = false

        const onWheel = (e: WheelEvent) => {
            if (locked) {
                e.preventDefault()
                return
            }

            let currentIndex = 0
            sectionIds.forEach((id, index) => {
                const top = document
                    .getElementById(id)
                    ?.getBoundingClientRect().top
                if (top != null && top <= 1) currentIndex = index
            })

            const nextIndex = currentIndex + (e.deltaY > 0 ? 1 : -1)
            if (nextIndex < 0 || nextIndex >= sectionIds.length) return

            e.preventDefault()
            locked = true
            document.getElementById(sectionIds[nextIndex])?.scrollIntoView({
                behavior: 'auto',
                block: 'start',
            })
            window.setTimeout(() => {
                locked = false
            }, 750)
        }

        window.addEventListener('wheel', onWheel, { passive: false })
        return () => window.removeEventListener('wheel', onWheel)
    }, [isMobile, reduced])

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

    return {
        scrolled,
        showNav,
        revealed,
        isMobile,
        reduced,
        ctaHover,
        setCtaHover,
        activeSection,
        railHovered,
        setRailHovered,
        smx,
        smy,
        scrollTo,
        reveal,
        revealCard,
        sceneParallax,
    }
}
