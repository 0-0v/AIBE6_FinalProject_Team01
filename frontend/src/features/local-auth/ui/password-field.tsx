'use client'

import { type KeyboardEvent, useState } from 'react'
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, XCircleIcon } from 'lucide-react'
import { getPasswordChecks } from '../lib/password-policy'

type PasswordFieldProps = {
    label: string
    value: string
    onChange: (value: string) => void
    autoComplete: 'new-password' | 'current-password'
    error?: string
    showGuidance?: boolean
}

export function PasswordField({
    label,
    value,
    onChange,
    autoComplete,
    error,
    showGuidance = false,
}: PasswordFieldProps) {
    const [visible, setVisible] = useState(false)
    const [capsLock, setCapsLock] = useState(false)
    const [numLock, setNumLock] = useState(false)
    const passwordChecks = getPasswordChecks(value)

    function updateModifierState(event: KeyboardEvent<HTMLInputElement>) {
        setCapsLock(event.getModifierState('CapsLock'))
        setNumLock(event.getModifierState('NumLock'))
    }

    return (
        <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">{label}</span>
            <div className={`relative ${error ? 'auth-field-shake' : ''}`}>
                <input
                    className={`w-full rounded-xl border px-4 py-3 pr-12 outline-none transition-colors ${
                        error
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-300 focus:border-brand'
                    }`}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    maxLength={64}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={updateModifierState}
                    onKeyUp={updateModifierState}
                    onBlur={() => {
                        setCapsLock(false)
                        setNumLock(false)
                    }}
                    autoComplete={autoComplete}
                    aria-invalid={Boolean(error)}
                />
                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500"
                    aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                    {visible ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
                </button>
            </div>
            {error && <span className="mt-1.5 block text-red-600">{error}</span>}
            {(capsLock || numLock) && (
                <div className="mt-1.5 space-y-0.5 text-xs text-amber-600">
                    {capsLock && <p>Caps Lock이 켜져 있어요.</p>}
                    {numLock && <p>Num Lock이 켜져 있어요.</p>}
                </div>
            )}
            {showGuidance && value && (
                <div className="mt-3">
                    <ul className="space-y-1 text-xs">
                        {passwordChecks.map((check) => (
                            <li
                                key={check.label}
                                className={
                                    check.passed
                                        ? 'text-emerald-600'
                                        : 'text-slate-500'
                                }
                            >
                                {check.passed ? (
                                    <CheckCircle2Icon
                                        className="mr-1 inline"
                                        size={14}
                                    />
                                ) : (
                                    <XCircleIcon
                                        className="mr-1 inline"
                                        size={14}
                                    />
                                )}
                                {check.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </label>
    )
}
