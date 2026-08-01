'use client'

import { CheckIcon, ChevronDownIcon, LoaderCircleIcon } from 'lucide-react'
import {
    useEffect,
    useId,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib'

export type SelectOption = {
    value: string
    label: string
    leading?: ReactNode
}

type SelectProps = {
    value: string
    options: SelectOption[]
    onChange: (value: string) => void
    'aria-label': string
    disabled?: boolean
    loading?: boolean
    className?: string
    menuClassName?: string
    menuColumns?: 1 | 2
    variant?: 'default' | 'form'
}

type MenuPosition = {
    left: number
    width: number
    maxHeight: number
    top?: number
    bottom?: number
}

export function Select({
    value,
    options,
    onChange,
    'aria-label': ariaLabel,
    disabled = false,
    loading = false,
    className,
    menuClassName,
    menuColumns = 1,
    variant = 'default',
}: SelectProps) {
    const [open, setOpen] = useState(false)
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const focusedOnOpenRef = useRef(false)
    const listboxId = useId()
    const selected = options.find((option) => option.value === value)

    useEffect(() => {
        if (!open) return

        function updateMenuPosition() {
            const trigger = triggerRef.current
            if (!trigger) return

            const rect = trigger.getBoundingClientRect()
            const viewportPadding = 8
            const gap = 6
            const preferredHeight = 224
            const spaceBelow =
                window.innerHeight - rect.bottom - gap - viewportPadding
            const spaceAbove = rect.top - gap - viewportPadding
            const openBelow =
                spaceBelow >= Math.min(preferredHeight, spaceAbove)
            const width = Math.max(rect.width, menuColumns === 2 ? 280 : 160)
            const left = Math.min(
                Math.max(viewportPadding, rect.right - width),
                window.innerWidth - width - viewportPadding,
            )

            setMenuPosition({
                left,
                width,
                maxHeight: Math.max(
                    96,
                    Math.min(
                        preferredHeight,
                        openBelow ? spaceBelow : spaceAbove,
                    ),
                ),
                ...(openBelow
                    ? { top: rect.bottom + gap }
                    : { bottom: window.innerHeight - rect.top + gap }),
            })
        }

        let animationFrameId: number | null = null
        function schedulePositionUpdate(event?: Event) {
            if (
                event?.type === 'scroll' &&
                event.target instanceof Node &&
                menuRef.current?.contains(event.target)
            ) {
                return
            }
            if (animationFrameId != null) {
                cancelAnimationFrame(animationFrameId)
            }
            animationFrameId = requestAnimationFrame(updateMenuPosition)
        }

        updateMenuPosition()
        window.addEventListener('resize', schedulePositionUpdate)
        window.addEventListener('scroll', schedulePositionUpdate, true)

        function closeOnOutsidePointer(event: PointerEvent) {
            const target = event.target as Node
            if (
                !rootRef.current?.contains(target) &&
                !menuRef.current?.contains(target)
            ) {
                setOpen(false)
                focusedOnOpenRef.current = false
            }
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false)
                focusedOnOpenRef.current = false
                triggerRef.current?.focus()
            }
        }

        document.addEventListener('pointerdown', closeOnOutsidePointer)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            if (animationFrameId != null) {
                cancelAnimationFrame(animationFrameId)
            }
            window.removeEventListener('resize', schedulePositionUpdate)
            window.removeEventListener('scroll', schedulePositionUpdate, true)
            document.removeEventListener('pointerdown', closeOnOutsidePointer)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [menuColumns, open])

    useEffect(() => {
        if (!open || !menuPosition || focusedOnOpenRef.current) return
        menuRef.current
            ?.querySelector<HTMLElement>(
                '[role="option"][aria-selected="true"]',
            )
            ?.focus()
        focusedOnOpenRef.current = true
    }, [open, menuPosition])

    function moveFocus(event: React.KeyboardEvent, offset: -1 | 1) {
        const optionElements = Array.from(
            menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ??
                [],
        )
        if (optionElements.length === 0) return
        const currentIndex = optionElements.indexOf(
            document.activeElement as HTMLElement,
        )
        const nextIndex =
            (currentIndex + offset + optionElements.length) %
            optionElements.length
        event.preventDefault()
        optionElements[nextIndex]?.focus()
    }

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                disabled={disabled || loading || options.length === 0}
                onClick={() => {
                    if (!open) {
                        setMenuPosition(null)
                        focusedOnOpenRef.current = false
                    }
                    setOpen((current) => !current)
                }}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault()
                        setMenuPosition(null)
                        focusedOnOpenRef.current = false
                        setOpen(true)
                    }
                }}
                className={cn(
                    'flex w-full items-center gap-1.5 text-left outline-none transition disabled:cursor-not-allowed disabled:opacity-50',
                    variant === 'form'
                        ? 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20'
                        : 'rounded-full px-2 py-1 text-[10px] font-bold hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-white/80',
                )}
            >
                {loading ? (
                    <LoaderCircleIcon
                        size={12}
                        className="shrink-0 animate-spin"
                    />
                ) : (
                    selected?.leading
                )}
                <span
                    className={cn(
                        'min-w-0 flex-1 truncate',
                        value === '' && 'font-medium text-slate-400',
                    )}
                >
                    {selected?.label ?? '선택'}
                </span>
                <ChevronDownIcon
                    size={12}
                    className={cn(
                        'shrink-0 transition-transform',
                        open && 'rotate-180',
                    )}
                />
            </button>

            {open &&
                menuPosition &&
                createPortal(
                    <div
                        ref={menuRef}
                        id={listboxId}
                        role="listbox"
                        aria-label={ariaLabel}
                        className={cn(
                            'fixed z-[100] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl shadow-slate-900/10',
                            menuClassName,
                        )}
                        style={
                            {
                                left: menuPosition.left,
                                top: menuPosition.top,
                                bottom: menuPosition.bottom,
                                width: menuPosition.width,
                                '--select-menu-max-height': `${menuPosition.maxHeight}px`,
                            } as CSSProperties
                        }
                    >
                        <div
                            className={cn(
                                'mp-scroll max-h-[var(--select-menu-max-height)] overflow-y-auto',
                                menuColumns === 2 &&
                                    'grid grid-cols-2 gap-0.5',
                            )}
                        >
                            {options.map((option) => {
                                const active = option.value === value
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        onKeyDown={(event) => {
                                            if (event.key === 'ArrowDown') {
                                                moveFocus(event, 1)
                                            } else if (
                                                event.key === 'ArrowUp'
                                            ) {
                                                moveFocus(event, -1)
                                            } else if (event.key === 'Home') {
                                                event.preventDefault()
                                                ;(
                                                    event.currentTarget
                                                        .parentElement
                                                        ?.firstElementChild as HTMLElement | null
                                                )?.focus()
                                            } else if (event.key === 'End') {
                                                event.preventDefault()
                                                ;(
                                                    event.currentTarget
                                                        .parentElement
                                                        ?.lastElementChild as HTMLElement | null
                                                )?.focus()
                                            }
                                        }}
                                        onClick={() => {
                                            if (!active) onChange(option.value)
                                            setOpen(false)
                                            focusedOnOpenRef.current = false
                                            triggerRef.current?.focus()
                                        }}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition',
                                            active
                                                ? 'bg-brand-50 text-brand-700'
                                                : 'hover:bg-slate-50',
                                        )}
                                    >
                                        <span className="flex size-5 shrink-0 items-center justify-center">
                                            {option.leading}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                            {option.label}
                                        </span>
                                        {active && (
                                            <CheckIcon
                                                size={13}
                                                className="shrink-0"
                                            />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    )
}
