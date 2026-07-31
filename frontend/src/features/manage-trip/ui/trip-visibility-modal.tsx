import { useState } from 'react'
import { Globe2Icon, LockIcon, XIcon } from 'lucide-react'
import {
    confirmTripCompletion,
    updateTripVisibility,
    type TripResponse,
} from '../api/trip-api'

type Visibility = 'PRIVATE' | 'PUBLIC'

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
        required ? null : trip.visibility,
    )
    const [tags, setTags] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function save() {
        if (!visibility) return

        const normalizedTags = tags
            .split(/[#,]/)
            .map((tag) => tag.trim())
            .filter(Boolean)

        if (visibility === 'PUBLIC' && normalizedTags.length === 0) {
            setError('공개할 여행 카드의 태그를 한 개 이상 입력해 주세요.')
            return
        }

        setBusy(true)
        setError(null)
        try {
            if (!trip.completionConfirmed) {
                await confirmTripCompletion(trip.id, visibility, normalizedTags)
            } else if (visibility === 'PUBLIC') {
                await confirmTripCompletion(trip.id, visibility, normalizedTags)
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

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="trip-visibility-title"
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
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
                    공개하면 다른 사용자가 둘러보기에서 여행 카드를 확인할 수
                    있습니다. 공개 여부는 언제든 다시 변경할 수 있습니다.
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
                        onClick={() => setVisibility('PUBLIC')}
                        className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-sm font-extrabold transition ${
                            visibility === 'PUBLIC'
                                ? 'border-brand bg-brand text-white'
                                : 'border-slate-200 text-slate-500 hover:border-brand-200'
                        }`}
                    >
                        <Globe2Icon size={19} />
                        공개
                    </button>
                </div>

                {visibility === 'PUBLIC' && (
                    <label className="mt-4 block text-sm font-bold text-slate-700">
                        여행 카드 태그
                        <input
                            value={tags}
                            onChange={(event) => setTags(event.target.value)}
                            placeholder="#친구와 #액티비티"
                            maxLength={300}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-brand"
                        />
                    </label>
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
                    disabled={!visibility || busy}
                    onClick={() => void save()}
                    className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50"
                >
                    {busy ? '저장 중...' : '공개 설정 저장'}
                </button>
            </section>
        </div>
    )
}
