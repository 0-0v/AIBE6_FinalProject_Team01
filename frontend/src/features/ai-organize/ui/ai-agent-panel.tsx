import React, { useState } from 'react'
import {
    SparklesIcon,
    XIcon,
    CheckIcon,
    RotateCcwIcon,
    AlertTriangleIcon,
    LayersIcon,
    CalendarIcon,
} from 'lucide-react'
import { Place } from '@/entities/trip'

type Suggestion = {
    id: string
    type: 'duplicate' | 'category' | 'schedule'
    icon: React.ComponentType<{ size?: number; className?: string }>
    title: string
    detail: string
}

type Props = {
    places: Place[]
    onClose: () => void
    onApply: (s: Suggestion) => void
}

export function AiAgentPanel({ places, onClose, onApply }: Props) {
    const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle')
    const [applied, setApplied] = useState<string[]>([])

    const dup = places.find((p) => p.duplicateOf)
    const uncategorized = places.filter((p) => p.status === 'candidate').length

    const suggestions: Suggestion[] = [
        ...(dup
            ? [
                  {
                      id: 's1',
                      type: 'duplicate' as const,
                      icon: AlertTriangleIcon,
                      title: '중복 장소 발견',
                      detail: `"${dup.name}"은(는) 이미 등록된 장소와 같은 곳으로 보여요. 하나로 합칠까요?`,
                  },
              ]
            : []),
        {
            id: 's2',
            type: 'category',
            icon: LayersIcon,
            title: `미분류 장소 ${uncategorized}곳 정리`,
            detail: '카테고리와 색상을 자동으로 지정하고 지도를 깔끔하게 정리해요.',
        },
        {
            id: 's3',
            type: 'schedule',
            icon: CalendarIcon,
            title: '2박 3일 일정 초안 생성',
            detail: '확정된 장소로 동선을 최적화한 날짜별 일정 초안을 만들어요. (이동시간·영업시간 충돌 확인 포함)',
        },
    ]

    function runOrganize() {
        setPhase('thinking')
        setTimeout(() => setPhase('done'), 1400)
    }

    return (
        <div className="flex h-full w-[340px] shrink-0 flex-col border-l border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                        <SparklesIcon size={15} />
                    </div>
                    <span className="font-bold">AI 에이전트</span>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                    <XIcon size={18} />
                </button>
            </div>

            <div className="mp-scroll flex-1 space-y-3 overflow-y-auto p-4">
                {phase === 'idle' && (
                    <div className="rounded-xl bg-brand-50 p-4 text-center">
                        <p className="text-sm text-brand-700">
                            등록된 장소들을 분석해 <b>중복·미분류·일정 충돌</b>
                            을 찾아 정리안을 제안해 드릴게요.
                        </p>
                        <button
                            onClick={runOrganize}
                            className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                        >
                            지도 정리해줘
                        </button>
                    </div>
                )}

                {phase === 'thinking' && (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <div className="flex gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="h-2.5 w-2.5 animate-bounce rounded-full bg-brand"
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                />
                            ))}
                        </div>
                        <p className="text-sm text-slate-500">
                            장소를 분석하고 있어요…
                        </p>
                    </div>
                )}

                {phase === 'done' && (
                    <>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            제안 {suggestions.length}건 · 승인해야 반영돼요
                        </p>
                        {suggestions.map((s) => {
                            const isApplied = applied.includes(s.id)
                            return (
                                <div
                                    key={s.id}
                                    className="rounded-xl border border-slate-200 p-3"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                                s.type === 'duplicate'
                                                    ? 'bg-amber-50 text-amber-600'
                                                    : 'bg-brand-50 text-brand-700'
                                            }`}
                                        >
                                            <s.icon size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold">
                                                {s.title}
                                            </h4>
                                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                                {s.detail}
                                            </p>
                                        </div>
                                    </div>
                                    {isApplied ? (
                                        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-brand-50 py-1.5 text-center text-xs font-semibold text-brand-700">
                                            <CheckIcon
                                                size={13}
                                                className="ml-auto"
                                            />{' '}
                                            반영됨 <span className="mr-auto" />
                                        </div>
                                    ) : (
                                        <div className="mt-2.5 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    onApply(s)
                                                    setApplied((p) => [
                                                        ...p,
                                                        s.id,
                                                    ])
                                                }}
                                                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                                            >
                                                <CheckIcon size={13} /> 승인
                                            </button>
                                            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                                                무시
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        <button
                            onClick={() => {
                                setPhase('idle')
                                setApplied([])
                            }}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-slate-400 hover:bg-slate-50"
                        >
                            <RotateCcwIcon size={13} /> 다시 분석하기
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
