export type LastLoginProvider = 'LOCAL' | 'GOOGLE' | 'KAKAO'

const LAST_LOGIN_PROVIDER_KEY = 'lastLoginProvider'
const supportedProviders: LastLoginProvider[] = ['LOCAL', 'GOOGLE', 'KAKAO']

export function getLastLoginProvider(): LastLoginProvider | null {
    if (typeof window === 'undefined') return null

    try {
        const provider = window.localStorage.getItem(LAST_LOGIN_PROVIDER_KEY)
        return supportedProviders.includes(provider as LastLoginProvider)
            ? (provider as LastLoginProvider)
            : null
    } catch {
        return null
    }
}

export function setLastLoginProvider(provider: LastLoginProvider) {
    try {
        window.localStorage.setItem(LAST_LOGIN_PROVIDER_KEY, provider)
    } catch {
        // 저장소 접근이 제한되어도 로그인 자체는 정상적으로 완료한다.
    }
}
