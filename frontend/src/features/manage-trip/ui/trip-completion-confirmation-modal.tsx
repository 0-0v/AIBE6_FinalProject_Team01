import { useState } from 'react'
import { confirmTripCompletion } from '../api/trip-api'

type Props = {
    tripId: number
    tripTitle: string
    onConfirmed: () => void
}

export function TripCompletionConfirmationModal({
    tripId,
    tripTitle,
    onConfirmed,
}: Props) {
    const [visibility, setVisibility] = useState<
        'PRIVATE' | 'PUBLIC' | null
    >(null)
    const [tags, setTags] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function confirm() {
        if (!visibility) return
        const normalizedTags = tags
            .split(/[#,]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        if (visibility === 'PUBLIC' && normalizedTags.length === 0) {
            setError('공개할 여행방의 태그를 한 개 이상 입력해 주세요.')
            return
        }
        setBusy(true)
        setError(null)
        try {
            await confirmTripCompletion(tripId, visibility, normalizedTags)
            onConfirmed()
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : '여행방 완료 확인에 실패했습니다.',
            )
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <p className="text-sm font-extrabold text-brand-700">
                    여행방 종료
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                    {tripTitle} 여행이 완료되었습니다
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                    여행방을 다른 사용자에게 공개하시겠습니까? 비공개로
                    확정한 뒤에도 편집 메뉴에서 공개로 변경할 수 있습니다.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setVisibility('PRIVATE')}
                        className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                            visibility === 'PRIVATE'
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 text-slate-600'
                        }`}
                    >
                        비공개로 완료
                    </button>
                    <button
                        type="button"
                        onClick={() => setVisibility('PUBLIC')}
                        className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                            visibility === 'PUBLIC'
                                ? 'border-brand bg-brand text-white'
                                : 'border-slate-200 text-slate-600'
                        }`}
                    >
                        공개하기
                    </button>
                </div>
                {visibility === 'PUBLIC' && (
                    <label className="mt-4 block text-sm font-bold text-slate-700">
                        여행방 태그
                        <input
                            value={tags}
                            onChange={(event) => setTags(event.target.value)}
                            placeholder="#둘이서, #힐링여행"
                            maxLength={300}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-brand"
                        />
                    </label>
                )}
                {error && (
                    <p className="mt-3 text-sm font-semibold text-red-500">
                        {error}
                    </p>
                )}
                <button
                    type="button"
                    disabled={!visibility || busy}
                    onClick={() => void confirm()}
                    className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50"
                >
                    {busy ? '처리 중...' : '완료 확인'}
                </button>
            </section>
        </div>
    )
}
