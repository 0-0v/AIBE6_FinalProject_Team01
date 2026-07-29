'use client'

import { useEffect, useRef, useState } from 'react'
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from 'lucide-react'

type RouteDay = {
    dayId: string | number
    dayNumber: number
    color: string
}

type Props = {
    routes: RouteDay[]
    selectedDay: number | null
    onSelect: (dayNumber: number | null) => void
}

export function MapRouteFilter({ routes, selectedDay, onSelect }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const selectedIndex =
        selectedDay == null
            ? 0
            : Math.max(
                  routes.findIndex((route) => route.dayNumber === selectedDay),
                  0,
              )
    const selectedRoute =
        selectedDay == null ? null : (routes[selectedIndex] ?? null)

    useEffect(() => {
        if (!menuOpen) return

        function closeOnOutsideClick(event: MouseEvent) {
            if (!menuRef.current?.contains(event.target as Node)) {
                setMenuOpen(false)
            }
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setMenuOpen(false)
        }

        document.addEventListener('mousedown', closeOnOutsideClick)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [menuOpen])

    function selectDay(dayNumber: number | null) {
        onSelect(dayNumber)
        setMenuOpen(false)
    }

    function selectPreviousDay() {
        if (selectedDay == null) return
        if (selectedIndex === 0) {
            selectDay(null)
            return
        }
        selectDay(routes[selectedIndex - 1].dayNumber)
    }

    function selectNextDay() {
        if (selectedDay == null) {
            selectDay(routes[0].dayNumber)
            return
        }
        if (selectedIndex >= routes.length - 1) return
        selectDay(routes[selectedIndex + 1].dayNumber)
    }

    return (
        <div
            ref={menuRef}
            className="absolute left-3 top-3 z-30 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur"
            role="group"
            aria-label="지도 Day 탐색"
        >
            <button
                type="button"
                aria-label="이전 Day 보기"
                disabled={selectedDay == null}
                onClick={selectPreviousDay}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
                <ChevronLeftIcon size={15} aria-hidden />
            </button>

            <div className="relative">
                <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                    className={`flex h-8 min-w-28 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition ${
                        menuOpen
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    <span
                        className="size-2 rounded-full"
                        style={{
                            backgroundColor:
                                selectedRoute?.color ?? '#64748b',
                        }}
                    />
                    {selectedRoute == null
                        ? '전체 일정'
                        : `Day ${selectedRoute.dayNumber}`}
                    <ChevronDownIcon
                        size={13}
                        className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                </button>

                {menuOpen && (
                    <div
                        role="listbox"
                        aria-label="전체 Day 목록"
                        className="absolute left-0 top-10 z-50 max-h-64 w-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                    >
                        <button
                            type="button"
                            role="option"
                            aria-selected={selectedDay == null}
                            onClick={() => selectDay(null)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                                selectedDay == null
                                    ? 'bg-slate-100 text-slate-800 ring-1 ring-slate-300'
                                    : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <span className="size-2 rounded-full bg-slate-500" />
                            <span className="flex-1">전체 일정</span>
                            {selectedDay == null && (
                                <CheckIcon size={14} aria-hidden />
                            )}
                        </button>
                        {routes.map((route) => {
                            const isSelected =
                                selectedDay === route.dayNumber
                            return (
                                <button
                                    key={route.dayId}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() =>
                                        selectDay(route.dayNumber)
                                    }
                                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                                        isSelected
                                            ? 'bg-slate-100 text-slate-800'
                                            : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    <span
                                        className="size-2 rounded-full"
                                        style={{
                                            backgroundColor: route.color,
                                        }}
                                    />
                                    <span className="flex-1">
                                        Day {route.dayNumber}
                                    </span>
                                    {isSelected && (
                                        <CheckIcon
                                            size={14}
                                            aria-hidden
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <button
                type="button"
                aria-label="다음 Day 보기"
                disabled={
                    selectedDay != null &&
                    selectedIndex === routes.length - 1
                }
                onClick={selectNextDay}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
                <ChevronRightIcon size={15} aria-hidden />
            </button>
        </div>
    )
}
