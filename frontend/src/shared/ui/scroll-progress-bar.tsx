'use client'

import { useScroll, useSpring, motion } from 'framer-motion'

/**
 * 상단 고정 스크롤 진행 바
 * 21st.dev ibelick/scroll-progress 패턴
 */
export function ScrollProgressBar({ color = '#FF7A59' }: { color?: string }) {
    const { scrollYProgress } = useScroll()
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    })

    return (
        <motion.div
            style={{
                scaleX,
                transformOrigin: '0%',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: color,
                zIndex: 200,
            }}
        />
    )
}
