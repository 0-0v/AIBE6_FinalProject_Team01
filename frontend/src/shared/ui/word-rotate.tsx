'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface WordRotateProps {
    words: string[]
    interval?: number
    className?: string
    style?: React.CSSProperties
}

export function WordRotate({
    words,
    interval = 2400,
    className,
    style,
}: WordRotateProps) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % words.length)
        }, interval)
        return () => clearInterval(id)
    }, [words.length, interval])

    return (
        <span
            className={className}
            style={{ display: 'inline-block', position: 'relative', ...style }}
        >
            <AnimatePresence mode="wait">
                <motion.span
                    key={index}
                    style={{ display: 'inline-block' }}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                    {words[index]}
                </motion.span>
            </AnimatePresence>
        </span>
    )
}
