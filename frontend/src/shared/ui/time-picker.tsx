'use client'

import { useEffect, useRef, useState } from 'react'
import type {
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
} from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib'

export type TimePickerProps = {
    value: string
    onChange: (value: string) => void
    className?: string
}

const PERIODS = ['오전', '오후'] as const
const HOURS = Array.from({ length: 12 }, (_, index) =>
    String(index + 1).padStart(2, '0'),
)
const MINUTES = ['00', '10', '20', '30', '40', '50']
const QUICK_TIMES = ['09:00', '10:00', '18:00', '21:00']
const ITEM_HEIGHT = 40
const POPOVER_WIDTH = 272
const POPOVER_HEIGHT = 248

function parse24(value: string): [number, number, number] {
    const match = /^(\d{2}):(\d{2})$/.exec(value)
    const rawHour = match ? Number(match[1]) : 9
    const rawMinute = match ? Number(match[2]) : 0
    const hour = Math.min(23, Math.max(0, rawHour))
    const minute = Math.min(59, Math.max(0, rawMinute))

    return [hour < 12 ? 0 : 1, hour % 12 === 0 ? 12 : hour % 12, minute]
}

function build24(periodIndex: number, hour12: number, minute: number): string {
    const hour =
        periodIndex === 0
            ? hour12 === 12
                ? 0
                : hour12
            : hour12 === 12
              ? 12
              : hour12 + 12

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function DrumColumn({
    items,
    selectedIndex,
    onSelect,
    className,
}: {
    items: readonly string[]
    selectedIndex: number
    onSelect: (index: number) => void
    className?: string
}) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    )
    const isProgrammatic = useRef(false)
    const initialized = useRef(false)
    const isDragging = useRef(false)
    const activePointerId = useRef<number | null>(null)
    const dragStartY = useRef(0)
    const dragStartScrollTop = useRef(0)
    const lastPointerY = useRef(0)
    const lastPointerTime = useRef(0)
    const dragVelocity = useRef(0)
    const suppressClick = useRef(false)

    useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        if (!initialized.current) {
            initialized.current = true
            element.scrollTop = selectedIndex * ITEM_HEIGHT
            return
        }

        isProgrammatic.current = true
        element.scrollTo({
            top: selectedIndex * ITEM_HEIGHT,
            behavior: 'smooth',
        })
        if (programmaticTimerRef.current) {
            clearTimeout(programmaticTimerRef.current)
        }
        programmaticTimerRef.current = setTimeout(() => {
            isProgrammatic.current = false
        }, 350)
    }, [selectedIndex])

    useEffect(
        () => () => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
            if (programmaticTimerRef.current) {
                clearTimeout(programmaticTimerRef.current)
            }
        },
        [],
    )

    function selectIndex(index: number) {
        isProgrammatic.current = true
        onSelect(index)
        scrollRef.current?.scrollTo({
            top: index * ITEM_HEIGHT,
            behavior: 'smooth',
        })
        if (programmaticTimerRef.current) {
            clearTimeout(programmaticTimerRef.current)
        }
        programmaticTimerRef.current = setTimeout(() => {
            isProgrammatic.current = false
        }, 250)
    }

    function handleScroll() {
        if (isProgrammatic.current || isDragging.current) return
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)

        scrollTimerRef.current = setTimeout(() => {
            const element = scrollRef.current
            if (!element) return
            const index = Math.max(
                0,
                Math.min(
                    items.length - 1,
                    Math.round(element.scrollTop / ITEM_HEIGHT),
                ),
            )
            selectIndex(index)
        }, 100)
    }

    // 클릭인지 드래그인지 아직 알 수 없는 시점에 곧바로 setPointerCapture를 걸면
    // 이후 발생할 click 이벤트의 대상이 버튼이 아닌 이 스크롤 컨테이너로
    // 넘어가버려서(브라우저 표준 동작) 옵션 버튼을 클릭해도 아무 반응이 없게 된다.
    // 그래서 실제로 DRAG_THRESHOLD_PX 이상 움직였을 때만 드래그로 전환하고,
    // 그 전까지는 캡처하지 않아 순수 클릭이 버튼에 정상적으로 도달하게 한다.
    const DRAG_THRESHOLD_PX = 4

    function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.pointerType !== 'mouse') return
        const element = scrollRef.current
        if (!element) return

        if (programmaticTimerRef.current) {
            clearTimeout(programmaticTimerRef.current)
        }
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
        isProgrammatic.current = false
        isDragging.current = false
        suppressClick.current = false
        activePointerId.current = event.pointerId
        dragStartY.current = event.clientY
        dragStartScrollTop.current = element.scrollTop
        lastPointerY.current = event.clientY
        lastPointerTime.current = performance.now()
        dragVelocity.current = 0
    }

    function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.pointerType !== 'mouse') return
        if (activePointerId.current !== event.pointerId) return
        const element = scrollRef.current
        if (!element) return

        const totalDelta = event.clientY - dragStartY.current

        if (!isDragging.current) {
            if (Math.abs(totalDelta) < DRAG_THRESHOLD_PX) return
            isDragging.current = true
            suppressClick.current = true
            event.preventDefault()
            element.setPointerCapture(event.pointerId)
        }

        const now = performance.now()
        const elapsed = Math.max(1, now - lastPointerTime.current)
        const pointerDelta = event.clientY - lastPointerY.current

        const currentVelocity = -pointerDelta / elapsed
        dragVelocity.current =
            dragVelocity.current * 0.65 + currentVelocity * 0.35
        element.scrollTop = dragStartScrollTop.current - totalDelta
        lastPointerY.current = event.clientY
        lastPointerTime.current = now
    }

    function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.pointerType !== 'mouse') return
        if (activePointerId.current !== event.pointerId) return
        activePointerId.current = null
        const element = scrollRef.current
        if (!element) return

        if (!isDragging.current) {
            // 임계값 이상 움직이지 않은 순수 클릭 — 캡처한 적이 없으므로
            // 버튼의 클릭 이벤트가 그대로 처리되도록 별도 동작 없이 종료한다.
            return
        }

        isDragging.current = false
        if (element.hasPointerCapture(event.pointerId)) {
            element.releasePointerCapture(event.pointerId)
        }

        const inertiaDistance = Math.max(
            -ITEM_HEIGHT * 3,
            Math.min(ITEM_HEIGHT * 3, dragVelocity.current * 130),
        )
        const projectedScrollTop = element.scrollTop + inertiaDistance
        const index = Math.max(
            0,
            Math.min(
                items.length - 1,
                Math.round(projectedScrollTop / ITEM_HEIGHT),
            ),
        )
        selectIndex(index)
    }

    function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        const direction = event.key === 'ArrowUp' ? -1 : 1
        const nextIndex = Math.max(
            0,
            Math.min(items.length - 1, selectedIndex + direction),
        )
        selectIndex(nextIndex)
    }

    return (
        <div className={cn('relative h-[120px] overflow-hidden', className)}>
            <div className="pointer-events-none absolute inset-x-0 top-10 z-10 h-10 rounded-xl bg-brand" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-white to-transparent" />
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="listbox"
                aria-label="시간 값 선택"
                className="absolute inset-0 z-10 cursor-grab touch-pan-y select-none overflow-y-scroll overscroll-contain outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brand/30"
                style={{
                    scrollSnapType: 'y mandatory',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <div className="py-10">
                    {items.map((item, index) => (
                        <button
                            key={item}
                            type="button"
                            role="option"
                            aria-selected={selectedIndex === index}
                            onClick={() => {
                                if (suppressClick.current) {
                                    suppressClick.current = false
                                    return
                                }
                                selectIndex(index)
                            }}
                            className={cn(
                                'flex h-10 w-full snap-center items-center justify-center text-sm font-bold transition-colors',
                                selectedIndex === index
                                    ? 'text-white'
                                    : 'text-slate-400 hover:text-slate-700',
                            )}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

type PopoverPosition = {
    top: number
    left: number
}

function getPopoverPosition(rect: DOMRect): PopoverPosition {
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const openBelow = spaceBelow >= POPOVER_HEIGHT || spaceBelow >= rect.top
    const desiredTop = openBelow
        ? rect.bottom + 6
        : rect.top - POPOVER_HEIGHT - 6

    return {
        top: Math.max(
            8,
            Math.min(desiredTop, window.innerHeight - POPOVER_HEIGHT - 8),
        ),
        left: Math.max(
            8,
            Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
        ),
    }
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState<PopoverPosition | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const [periodIndex, hour12, minute] = parse24(value)
    const selectedMinuteIndex = MINUTES.reduce(
        (nearestIndex, option, index) => {
            const currentDistance = Math.abs(Number(option) - minute)
            const nearestDistance = Math.abs(
                Number(MINUTES[nearestIndex]) - minute,
            )
            return currentDistance < nearestDistance ? index : nearestIndex
        },
        0,
    )

    function openPicker() {
        const rect = triggerRef.current?.getBoundingClientRect()
        if (!rect) return
        setPosition(getPopoverPosition(rect))
        setOpen(true)
    }

    useEffect(() => {
        if (!open) return

        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node
            if (triggerRef.current?.contains(target)) return
            if (popoverRef.current?.contains(target)) return
            setOpen(false)
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false)
        }

        function updatePosition() {
            const rect = triggerRef.current?.getBoundingClientRect()
            if (rect) setPosition(getPopoverPosition(rect))
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [open])

    function update(nextPeriod: number, nextHour: number, nextMinute: number) {
        onChange(build24(nextPeriod, nextHour, nextMinute))
    }

    const display = `${PERIODS[periodIndex]} ${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={openPicker}
                aria-haspopup="dialog"
                aria-expanded={open}
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
                position &&
                createPortal(
                    <div
                        ref={popoverRef}
                        role="dialog"
                        aria-label="시간 선택"
                        className="fixed z-[300] w-[272px] rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl shadow-slate-900/10"
                        style={{ top: position.top, left: position.left }}
                    >
                        <div className="flex items-center gap-1">
                            <DrumColumn
                                items={PERIODS}
                                selectedIndex={periodIndex}
                                onSelect={(index) =>
                                    update(index, hour12, minute)
                                }
                                className="w-[72px]"
                            />
                            <DrumColumn
                                items={HOURS}
                                selectedIndex={hour12 - 1}
                                onSelect={(index) =>
                                    update(periodIndex, index + 1, minute)
                                }
                                className="w-[68px]"
                            />
                            <span className="text-lg font-bold text-slate-300">
                                :
                            </span>
                            <DrumColumn
                                items={MINUTES}
                                selectedIndex={selectedMinuteIndex}
                                onSelect={(index) =>
                                    update(
                                        periodIndex,
                                        hour12,
                                        Number(MINUTES[index]),
                                    )
                                }
                                className="w-[68px]"
                            />
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                            <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-1.5">
                                <span className="text-[10px] font-semibold text-slate-400">
                                    직접 입력
                                </span>
                                <input
                                    type="time"
                                    value={value}
                                    onChange={(event) => {
                                        if (event.target.value) {
                                            onChange(event.target.value)
                                        }
                                    }}
                                    className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
                            >
                                완료
                            </button>
                        </div>

                        <div className="mt-2 flex items-center gap-1 overflow-hidden">
                            <span className="mr-1 shrink-0 text-[10px] font-semibold text-slate-400">
                                빠른 선택
                            </span>
                            {QUICK_TIMES.map((time) => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => onChange(time)}
                                    className={cn(
                                        'rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors',
                                        value === time
                                            ? 'bg-brand-50 text-brand'
                                            : 'text-slate-500 hover:bg-slate-50',
                                    )}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    )
}
