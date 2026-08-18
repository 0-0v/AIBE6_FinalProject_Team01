export const APP_THEMES = [
    { id: 'flamingo', label: '코랄 핑크', color: '#e7657a' },
    { id: 'deep-navy', label: '딥 네이비', color: '#2c5e9e' },
    { id: 'sky-sand', label: '스카이 + 샌드', color: '#bbdce5' },
    { id: 'sage-coral', label: '세이지 + 코랄', color: '#3a5a55' },
    { id: 'sky-cream', label: '스카이 + 크림옐로', color: '#95bdd7' },
    { id: 'mint-rose', label: '민트 + 로즈', color: '#a5cfbc' },
] as const

export type AppTheme = (typeof APP_THEMES)[number]['id']

export const DEFAULT_APP_THEME: AppTheme = 'flamingo'
export const APP_THEME_STORAGE_KEY = 'plamingo-app-theme'

export const APP_COLOR_MODES = [
    { id: 'light', label: '라이트' },
    { id: 'dark', label: '다크' },
] as const

export type AppColorMode = (typeof APP_COLOR_MODES)[number]['id']

export const DEFAULT_APP_COLOR_MODE: AppColorMode = 'light'
export const APP_COLOR_MODE_STORAGE_KEY = 'plamingo-app-color-mode'

export function isAppTheme(value: unknown): value is AppTheme {
    return APP_THEMES.some((theme) => theme.id === value)
}

export function isAppColorMode(value: unknown): value is AppColorMode {
    return APP_COLOR_MODES.some((mode) => mode.id === value)
}
