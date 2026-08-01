'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib'

export type TimePickerProps = {
    value: string // "HH:mm" 24h
    onChange: (value: string) => void
    className?: string
}

const ITEM_H = 40
const PERIODS = ['오전', '오후']
const HOURS = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, '0'),
)
const MINUTES = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, '0'),
)

function parse24(v: string): [number, number, number] {
    const parts = (v ?? '09:00').split(':').map(Number)
    const h = parts[0] ?? 9
    const m = parts[1] ?? 0
    const periodIdx = h < 12 ? 0 : 1
    const hourIdx = (h % 12 === 0 ? 12 : h % 12) - 1
    return [periodIdx, hourIdx, m]
}

function build24(periodIdx: number, hourIdx: number, minuteIdx: number): string {
    const h12 = hourIdx + 1
    let h24: number
    if (periodIdx === 0) {
        h24 = h12 === 12 ? 0 : h12
    } else {
        h24 = h12 === 12 ? 12 : h12 + 12
    }
    return `${String(h24).padStart(2, '0')}:${String(minuteIdx).padStart(2, '0')}`
}

function DrumColumn({
    items,
    selectedIdx,
    onSelect,
    colWidth,
}: {
    items: string[]
    selectedIdx: number
    onSelect: (idx: number) => void
    colWidth: number
}) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isProgrammatic = useRef(false)
    const initialized = useRef(false)

    // Instant scroll on first mount
    useEffect(() => {
        if (initialized.current) return
        initialized.current = true
        const el = scrollRef.current
        if (el) el.scrollTop = selectedIdx * ITEM_H
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // External value change → smooth scroll
    useEffect(() => {
        if (!initialized.current) return
        const el = scrollRef.current
        if (!el || isProgrammatic.current) return
        isProgrammatic.current = true
        el.scrollTo({ top: selectedIdx * ITEM_H, behavior: 'smooth' })
        const t = setTimeout(() => {
            isProgrammatic.current = false
        }, 400)
        return () => clearTimeout(t)
    }, [selectedIdx])

    function handleScroll() {
        if (isProgrammatic.current) return
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            const el = scrollRef.current
            if (!el) return
            const idx = Math.max(
                0,
                Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)),
            )
            isProgrammatic.current = true
            el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
            setTimeout(() => {
                isProgrammatic.current = false
            }, 400)
            onSelect(idx)
        }, 120)
    }

    function scrollTo(idx: number) {
        isProgrammatic.current = true
        scrollRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
        setTimeout(() => {
            isProgrammatic.current = false
        }, 400)
        onSelect(idx)
    }

    return (
        <div
            className="relative overflow-hidden"
            style={{ width: colWidth, height: ITEM_H * 3 }}
        >
            {/* Brand highlight for center row */}
            <div
                className="pointer-events-none absolute inset-x-0 rounded-xl bg-brand"
                style={{ top: ITEM_H, height: ITEM_H, zIndex: 1 }}
            />
            {/* Top fade */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 z-30"
                style={{
                    height: ITEM_H,
                    background:
                        'linear-gradient(to bottom, white 20%, transparent)',
                }}
            />
            {/* Bottom fade */}
            <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-30"
                style={{
                    height: ITEM_H,
                    background:
                        'linear-gradient(to top, white 20%, transparent)',
                }}
            />
            {/* Scrollable list */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-scroll overscroll-contain"
                style={{
                    scrollSnapType: 'y mandatory',
                    zIndex: 2,
                    scrollbarWidth: 'none',
                }}
            >
                <div
                    style={{
                        paddingTop: ITEM_H,
                        paddingBottom: ITEM_H,
                    }}
                >
                    {items.map((item, i) => (
                        <button
                            key={i}
                            type="button"
                            tabIndex={-1}
                            onClick={() => scrollTo(i)}
                            className={cn(
                                'flex w-full items-center justify-center text-sm font-bold transition-colors',
                                i === selectedIdx
                                    ? 'text-white'
                                    : 'text-slate-500 hover:text-slate-700',
                            )}
                            style={{
                                height: ITEM_H,
                                scrollSnapAlign: 'start',
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

type PopoverPos = {
    top: number
    left: number
    minWidth: number
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<PopoverPos | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    const [periodIdx, hourIdx, minuteIdx] = parse24(value)

    function openPicker() {
        const rect = triggerRef.current?.getBoundingClientRect()
        if (!rect) return
        const popoverWidth = 184
        const spaceBelow = window.innerHeight - rect.bottom - 8
        const spaceAbove = rect.top - 8
        const openBelow = spaceBelow >= 140 || spaceBelow >= spaceAbove
        setPos({
            top: openBelow ? rect.bottom + 6 : rect.top - 6 - 140,
            left: Math.min(
                rect.left,
                window.innerWidth - popoverWidth - 8,
            ),
            minWidth: Math.max(rect.width, popoverWidth),
        })
        setOpen(true)
    }

    useEffect(() => {
        if (!open) return
        function onPointer(e: PointerEvent) {
            const t = e.target as Node
            if (triggerRef.current?.contains(t)) return
            if (popoverRef.current?.contains(t)) return
            setOpen(false)
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointer)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('pointerdown', onPointer)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    function update(p: number, h: number, m: number) {
        onChange(build24(p, h, m))
    }

    const h12 = hourIdx + 1
    const display = `${PERIODS[periodIdx]} ${String(h12).padStart(2, '0')}:${String(minuteIdx).padStart(2, '0')}`

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={openPicker}
                className={cn(
                    'flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5',
                    'text-xs font-medium text-slate-700 outline-none transition',
                    'hover:border-slate-300',
                    open && 'border-brand ring-1 ring-brand/20',
                    className,
                )}
            >
                <span className="flex-1 text-left">{display}</span>
                <ChevronDownIcon
                    size={12}
                    className={cn(
                        'shrink-0 text-slate-400 transition-transform',
                        open && 'rotate-180',
                    )}
                />
            </button>

            {open &&
                pos &&
                createPortal(
                    <div
                        ref={popoverRef}
                        className="fixed z-[300] flex items-center gap-0.5 rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl shadow-slate-900/10"
                        style={{
                            top: pos.top,
                            left: pos.left,
                        }}
                    >
                        <DrumColumn
                            items={PERIODS}
                            selectedIdx={periodIdx}
                            onSelect={(i) => update(i, hourIdx, minuteIdx)}
                            colWidth={56}
                        />
                        <DrumColumn
                            items={HOURS}
                            selectedIdx={hourIdx}
                            onSelect={(i) => update(periodIdx, i, minuteIdx)}
                            colWidth={44}
                        />
                        <span className="pb-0.5 text-lg font-bold text-slate-400">
                            :
                        </span>
                        <DrumColumn
                            items={MINUTES}
                            selectedIdx={minuteIdx}
                            onSelect={(i) => update(periodIdx, hourIdx, i)}
                            colWidth={44}
                        />
                    </div>,
                    document.body,
                )}
        </>
    )
}
