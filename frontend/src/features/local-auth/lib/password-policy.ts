export type PasswordCheck = {
    label: string
    passed: boolean
}

const repeatedPattern = /(.)\1{2,}/

export function getPasswordChecks(password: string): PasswordCheck[] {
    return [
        { label: '8자 이상', passed: password.length >= 8 },
        { label: '영문 포함', passed: /[A-Za-z]/.test(password) },
        { label: '숫자 포함', passed: /\d/.test(password) },
        {
            label: '특수문자 포함',
            passed: /[^A-Za-z\d\s]/.test(password),
        },
        {
            label: '동일한 문자·숫자 3회 이상 연속 사용 안 함',
            passed: password.length > 0 && !repeatedPattern.test(password),
        },
    ]
}

export function hasRepeatedPasswordCharacters(password: string) {
    return repeatedPattern.test(password)
}

export function isPasswordValid(password: string) {
    return (
        password.length >= 8 &&
        password.length <= 64 &&
        !hasRepeatedPasswordCharacters(password)
    )
}
