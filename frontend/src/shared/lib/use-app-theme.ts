'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    APP_COLOR_MODE_STORAGE_KEY,
    APP_THEME_STORAGE_KEY,
    DEFAULT_APP_COLOR_MODE,
    DEFAULT_APP_THEME,
    isAppColorMode,
    isAppTheme,
    type AppColorMode,
    type AppTheme,
} from '@/shared/config'

function applyTheme(theme: AppTheme) {
    if (theme === DEFAULT_APP_THEME) {
        document.documentElement.removeAttribute('data-theme')
        return
    }
    document.documentElement.dataset.theme = theme
}

function applyColorMode(colorMode: AppColorMode) {
    document.documentElement.dataset.colorMode = colorMode
    document.documentElement.style.colorScheme = colorMode
}

export function useAppTheme() {
    const [theme, setThemeState] = useState<AppTheme>(() => {
        if (typeof window === 'undefined') return DEFAULT_APP_THEME
        const savedTheme = window.localStorage.getItem(APP_THEME_STORAGE_KEY)
        return isAppTheme(savedTheme) ? savedTheme : DEFAULT_APP_THEME
    })
    const [colorMode, setColorModeState] = useState<AppColorMode>(() => {
        if (typeof window === 'undefined') return DEFAULT_APP_COLOR_MODE
        const savedMode = window.localStorage.getItem(
            APP_COLOR_MODE_STORAGE_KEY,
        )
        return isAppColorMode(savedMode) ? savedMode : DEFAULT_APP_COLOR_MODE
    })

    useEffect(() => {
        applyTheme(theme)
    }, [theme])

    useEffect(() => {
        applyColorMode(colorMode)
    }, [colorMode])

    const setTheme = useCallback((nextTheme: AppTheme) => {
        setThemeState(nextTheme)
        applyTheme(nextTheme)
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme)
    }, [])

    const setColorMode = useCallback((nextMode: AppColorMode) => {
        setColorModeState(nextMode)
        applyColorMode(nextMode)
        window.localStorage.setItem(APP_COLOR_MODE_STORAGE_KEY, nextMode)
    }, [])

    return { theme, setTheme, colorMode, setColorMode }
}
