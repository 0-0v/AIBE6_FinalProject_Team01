import { XIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState } from 'react'

export type PublicScope = 'PUBLIC_ROUTE' | 'PUBLIC_RECORD'

type Props = {
    photoCount: number
    recordCount: number
    selected?: PublicScope | null
    onSelect: (scope: PublicScope) => void
    busy?: boolean
}

export function PublicScopeOptions({
    photoCount,
    recordCount,
    selected,
    onSelect,
    busy = false,
}: Props) {
    const [activeScope, setActiveScope] = useState<PublicScope | null>(
        selected ?? null,
    )

    return (
        <div>
            <h3 className="text-base font-black text-slate-900">
                어디까지 공개할까요?
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ScopeCard
                    title="루트만 공개"
                    description="동선·장소·시간만 보입니다. 사진과 후기, 지출은 비공개."
                    included={['Day별 장소 목록', '지도 동선']}
                    excluded={['사진 · 후기 · 지출']}
                    active={activeScope === 'PUBLIC_ROUTE'}
                    busy={busy}
                    onActivate={() => setActiveScope('PUBLIC_ROUTE')}
                    onConfirm={() => onSelect('PUBLIC_ROUTE')}
                />
                <ScopeCard
                    title="기록까지 공개"
                    description="사진과 후기가 함께 보이는 여행기로 공개됩니다."
                    included={[
                        '루트 전체',
                        `사진 ${photoCount}장 · 후기 ${recordCount}개`,
                        '태그',
                    ]}
                    excluded={['지출']}
                    recommended
                    active={activeScope === 'PUBLIC_RECORD'}
                    busy={busy}
                    onActivate={() => setActiveScope('PUBLIC_RECORD')}
                    onConfirm={() => onSelect('PUBLIC_RECORD')}
                />
            </div>
        </div>
    )
}

export function PublicScopeModal({
    onClose,
    ...props
}: Props & { onClose: () => void }) {
    return createPortal(
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="public-scope-title"
                className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div id="public-scope-title" className="sr-only">
                        공개 범위 선택
                    </div>
                    <div className="flex-1">
                        <PublicScopeOptions {...props} />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={props.busy}
                        aria-label="공개 범위 선택 닫기"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <XIcon size={18} />
                    </button>
                </div>
            </section>
        </div>,
        document.body,
    )
}

function ScopeCard({
    title,
    description,
    included,
    excluded,
    recommended = false,
    active = false,
    busy = false,
    onActivate,
    onConfirm,
}: {
    title: string
    description: string
    included: string[]
    excluded?: string[]
    recommended?: boolean
    active?: boolean
    busy?: boolean
    onActivate: () => void
    onConfirm: () => void
}) {
    return (
        <div
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-pressed={active}
            aria-disabled={busy}
            onClick={(event) => {
                if (busy) return
                event.currentTarget.focus()
                onActivate()
            }}
            onKeyDown={(event) => {
                if (busy || (event.key !== 'Enter' && event.key !== ' ')) {
                    return
                }
                event.preventDefault()
                onActivate()
            }}
            className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                active
                    ? 'border-brand bg-brand-50/40 shadow-[0_8px_24px_rgba(242,100,124,0.14)]'
                    : recommended
                      ? 'border-brand/50 bg-brand-50/20'
                      : 'border-slate-200 hover:border-brand/50 hover:bg-brand-50/10'
            } ${busy ? 'cursor-not-allowed opacity-50' : ''}`}
        >
            {recommended && (
                <span className="absolute right-4 top-4 rounded-full bg-brand px-2 py-1 text-[10px] font-black text-white">
                    추천
                </span>
            )}
            <h4 className="text-sm font-black text-slate-900">{title}</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
            </p>
            <ul className="mt-3 space-y-1 text-xs font-bold text-slate-600">
                {included.map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                        <span className="text-brand">✓</span> {item}
                    </li>
                ))}
                {excluded?.map((item) => (
                    <li
                        key={item}
                        className="flex items-center gap-1.5 text-slate-300"
                    >
                        <span>✕</span> {item}
                    </li>
                ))}
            </ul>
            <div className="mt-auto pt-4">
                <button
                    type="button"
                    disabled={busy}
                    onClick={(event) => {
                        event.stopPropagation()
                        onConfirm()
                    }}
                    className={`w-full rounded-xl py-2.5 text-center text-sm font-extrabold transition ${
                        active
                            ? 'bg-brand text-white hover:bg-brand-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                    {busy ? '처리 중...' : '이걸로 공개'}
                </button>
            </div>
        </div>
    )
}
