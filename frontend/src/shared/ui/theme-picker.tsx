'use client'

import { CheckIcon, MoonIcon, SunIcon } from 'lucide-react'
import {
    APP_COLOR_MODES,
    APP_THEMES,
    type AppColorMode,
    type AppTheme,
} from '@/shared/config'

type ThemePickerProps = {
    value: AppTheme
    onChange: (theme: AppTheme) => void
    colorMode: AppColorMode
    onColorModeChange: (mode: AppColorMode) => void
}

export function ThemePicker({
    value,
    onChange,
    colorMode,
    onColorModeChange,
}: ThemePickerProps) {
    return (
        <div className="space-y-7">
            <fieldset>
                <legend className="text-base font-bold text-[var(--color-app-ink)]">
                    화면 모드
                </legend>
                <p className="mt-1 text-sm text-[var(--color-app-text-secondary)]">
                    화면 밝기를 선택해 주세요.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    {APP_COLOR_MODES.map((option) => {
                        const selected = option.id === colorMode
                        const Icon = option.id === 'light' ? SunIcon : MoonIcon
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => onColorModeChange(option.id)}
                                aria-pressed={selected}
                                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                                    selected
                                        ? 'border-[var(--color-brand)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                                        : 'border-[var(--color-app-border)] bg-[var(--color-app-surface)] text-[var(--color-app-text)] hover:bg-[var(--color-app-background-alt)]'
                                }`}
                            >
                                <Icon size={17} />
                                {option.label}
                            </button>
                        )
                    })}
                </div>
            </fieldset>

            <fieldset>
                <legend className="text-base font-bold text-[var(--color-app-ink)]">
                    테마 색상
                </legend>
                <p className="mt-1 text-sm text-[var(--color-app-text-secondary)]">
                    앱에서 사용할 포인트 색상을 선택해 주세요.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {APP_THEMES.map((option) => {
                        const selected = option.id === value
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => onChange(option.id)}
                                aria-pressed={selected}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                                    selected
                                        ? 'border-[var(--color-brand)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                                        : 'border-[var(--color-app-border)] bg-[var(--color-app-surface)] text-[var(--color-app-text)] hover:bg-[var(--color-app-background-alt)]'
                                }`}
                            >
                                <span
                                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                                    style={{ backgroundColor: option.color }}
                                >
                                    {selected && <CheckIcon size={15} />}
                                </span>
                                {option.label}
                            </button>
                        )
                    })}
                </div>
            </fieldset>
        </div>
    )
}
