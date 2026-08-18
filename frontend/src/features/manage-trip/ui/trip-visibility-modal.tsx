import { useEffect, useRef, useState } from 'react'
import { Globe2Icon, LockIcon, XIcon } from 'lucide-react'
import {
    confirmTripCompletion,
    fetchTripVisibilitySettings,
    updateTripVisibility,
    type TripResponse,
} from '../api/trip-api'
import { PublicScopeOptions, type PublicScope } from './public-scope-options'

type Visibility = 'PRIVATE' | 'PUBLIC_ROUTE' | 'PUBLIC_RECORD'

type Props = {
    trip: TripResponse
    required?: boolean
    onClose: () => void
    onChanged: () => void
}

export function TripVisibilityModal({
    trip,
    required = false,
    onClose,
    onChanged,
}: Props) {
    const [visibility, setVisibility] = useState<Visibility | null>(
        required ? 'PRIVATE' : trip.visibility,
    )
    const [step, setStep] = useState<'settings' | 'scope'>('settings')
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')
    const isTagComposing = useRef(false)
    const [description, setDescription] = useState('')
    const [scopeCounts, setScopeCounts] = useState({
        photoCount: 0,
        recordCount: 0,
    })
    const [busy, setBusy] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        void fetchTripVisibilitySettings(trip.id)
            .then((settings) => {
                if (!active) return
                setTags(settings.tags)
                setDescription(settings.description ?? '')
                setScopeCounts({
                    photoCount: settings.photoCount,
                    recordCount: settings.recordCount,
                })
                if (!required) setVisibility(settings.visibility)
                setError(null)
            })
            .catch((caught: unknown) => {
                if (!active) return
                setError(
                    caught instanceof Error
                        ? caught.message
                        : '기존 공개 설정을 불러오지 못했습니다.',
                )
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [required, trip.id])

    async function save() {
        if (!visibility) return

        const normalizedTags = tags

        if (visibility !== 'PRIVATE' && normalizedTags.length === 0) {
            setError('태그를 하나 이상 입력해 주세요.')
            return
        }
        if (visibility !== 'PRIVATE' && !description.trim()) {
            setError('둘러보기에 보여줄 여행 설명을 입력해 주세요.')
            return
        }

        setBusy(true)
        setError(null)
        try {
            if (!trip.completionConfirmed) {
                await confirmTripCompletion(
                    trip.id,
                    visibility,
                    normalizedTags,
                    description.trim(),
                )
            } else if (visibility !== 'PRIVATE') {
                await confirmTripCompletion(
                    trip.id,
                    visibility,
                    normalizedTags,
                    description.trim(),
                )
            } else if (visibility !== trip.visibility) {
                await updateTripVisibility(trip.id, visibility)
            }
            onChanged()
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : '여행방 공개 설정을 변경하지 못했습니다.',
            )
            setBusy(false)
        }
    }

    function addTags(value: string) {
        const nextTags = value
            .split(/[\s,]+/)
            .map((tag) => tag.replace(/^#+/, '').trim())
            .filter(Boolean)

        if (nextTags.length === 0) return
        setTags((current) =>
            [...new Set([...current, ...nextTags])].slice(0, 10),
        )
        setTagInput('')
    }

    function selectPublicScope(scope: PublicScope) {
        setVisibility(scope)
        setStep('settings')
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="trip-visibility-title"
                className={`w-full rounded-3xl bg-white p-6 shadow-2xl ${
                    step === 'scope' ? 'max-w-2xl' : 'max-w-md'
                }`}
            >
                {step === 'scope' ? (
                    <div className="relative">
                        <PublicScopeOptions
                            photoCount={scopeCounts.photoCount}
                            recordCount={scopeCounts.recordCount}
                            selected={
                                visibility === 'PUBLIC_ROUTE' ||
                                visibility === 'PUBLIC_RECORD'
                                    ? visibility
                                    : null
                            }
                            onSelect={selectPublicScope}
                            busy={busy}
                        />
                        <button
                            type="button"
                            onClick={() => setStep('settings')}
                            aria-label="공개 범위 선택 닫기"
                            className="absolute right-0 top-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-extrabold text-brand-700">
                                    완료된 여행방
                                </p>
                                <h2
                                    id="trip-visibility-title"
                                    className="mt-1 text-xl font-black text-slate-900"
                                >
                                    공개 설정
                                </h2>
                            </div>
                            {!required && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={busy}
                                    aria-label="공개 설정 닫기"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <XIcon size={18} />
                                </button>
                            )}
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            공개하면 다른 사용자가 둘러보기에서 여행 카드를
                            확인할 수 있습니다. 공개 여부는 언제든 다시 변경할
                            수 있습니다.
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setVisibility('PRIVATE')}
                                className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-sm font-extrabold transition ${
                                    visibility === 'PRIVATE'
                                        ? 'border-slate-800 bg-slate-800 text-white'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                <LockIcon size={19} />
                                비공개
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('scope')}
                                className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-sm font-extrabold transition ${
                                    visibility !== 'PRIVATE'
                                        ? 'border-brand bg-brand text-white'
                                        : 'border-slate-200 text-slate-500 hover:border-brand-200'
                                }`}
                            >
                                <Globe2Icon size={19} />
                                공개
                            </button>
                        </div>

                        {visibility !== 'PRIVATE' && (
                            <div className="mt-4 space-y-4">
                                <div className="block text-sm font-bold text-slate-700">
                                    Tag
                                    <div className="mt-2 flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-brand">
                                        {tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700"
                                            >
                                                #{tag}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setTags((current) =>
                                                            current.filter(
                                                                (item) =>
                                                                    item !==
                                                                    tag,
                                                            ),
                                                        )
                                                    }
                                                    aria-label={`${tag} 태그 삭제`}
                                                    className="rounded-full p-0.5 hover:bg-brand-100"
                                                >
                                                    <XIcon size={11} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            value={tagInput}
                                            onCompositionStart={() => {
                                                isTagComposing.current = true
                                            }}
                                            onCompositionEnd={(event) => {
                                                isTagComposing.current = false
                                                setTagInput(
                                                    event.currentTarget.value,
                                                )
                                            }}
                                            onChange={(event) =>
                                                setTagInput(event.target.value)
                                            }
                                            onKeyDown={(event) => {
                                                if (isTagComposing.current) {
                                                    return
                                                }
                                                if (event.key === 'Enter') {
                                                    event.preventDefault()
                                                } else if (
                                                    event.key === 'Backspace' &&
                                                    !tagInput &&
                                                    tags.length > 0
                                                ) {
                                                    setTags((current) =>
                                                        current.slice(0, -1),
                                                    )
                                                }
                                            }}
                                            onKeyUp={(event) => {
                                                if (
                                                    isTagComposing.current ||
                                                    ![
                                                        ' ',
                                                        'Enter',
                                                        ',',
                                                    ].includes(event.key)
                                                ) {
                                                    return
                                                }
                                                addTags(
                                                    event.currentTarget.value,
                                                )
                                            }}
                                            onBlur={() => addTags(tagInput)}
                                            placeholder={
                                                tags.length === 0
                                                    ? '#둘이서 #엄마랑'
                                                    : '#태그 입력'
                                            }
                                            maxLength={50}
                                            disabled={
                                                loading || tags.length >= 10
                                            }
                                            className="min-w-28 flex-1 border-0 bg-transparent py-1 font-normal outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                                <label className="block text-sm font-bold text-slate-700">
                                    여행 설명
                                    <textarea
                                        value={description}
                                        onChange={(event) =>
                                            setDescription(event.target.value)
                                        }
                                        placeholder="둘러보기에 보여줄 여행을 설명해 주세요."
                                        maxLength={500}
                                        disabled={loading}
                                        rows={3}
                                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-brand"
                                    />
                                </label>
                            </div>
                        )}

                        {error && (
                            <p
                                role="alert"
                                className="mt-3 text-sm font-semibold text-red-500"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="button"
                            disabled={!visibility || busy || loading}
                            onClick={() => void save()}
                            className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50"
                        >
                            {loading
                                ? '설정 불러오는 중...'
                                : busy
                                  ? '저장 중...'
                                  : '공개 설정 저장'}
                        </button>
                    </>
                )}
            </section>
        </div>
    )
}
