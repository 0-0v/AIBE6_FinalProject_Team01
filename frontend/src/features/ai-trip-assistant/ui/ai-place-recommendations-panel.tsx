'use client'

import { useState } from 'react'
import { CheckIcon, LoaderCircleIcon, MapPinIcon, XIcon } from 'lucide-react'
import { addTripPlace, fromApiToPlace, type Place } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import type { AiPlaceRecommendation } from '../model/types'
import { AiBrandMark } from './ai-brand-mark'

type Props = {
    tripId: number
    roomId: string
    recommendations: AiPlaceRecommendation[]
    onClose: () => void
    onRegistered: (place: Place) => void
}

export function AiPlaceRecommendationsPanel({
    tripId,
    roomId,
    recommendations,
    onClose,
    onRegistered,
}: Props) {
    const [registeringId, setRegisteringId] = useState<string | null>(null)
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)

    async function register(recommendation: AiPlaceRecommendation) {
        setRegisteringId(recommendation.place.googlePlaceId)
        setError(null)
        try {
            const response = await addTripPlace(tripId, recommendation.place)
            onRegistered(fromApiToPlace(response, roomId))
            setRegisteredIds((current) => {
                const next = new Set(current)
                next.add(recommendation.place.googlePlaceId)
                return next
            })
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    '추천 장소를 여행방에 등록하지 못했습니다.',
                ),
            )
        } finally {
            setRegisteringId(null)
        }
    }

    return (
        <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-rose-100 bg-gradient-to-r from-[#fff8fa] to-white px-4 py-3.5">
                <div className="flex items-center gap-3">
                    <AiBrandMark size="sm" />
                    <div>
                        <p className="text-sm font-extrabold">AI 추천 장소</p>
                        <p className="text-[10px] text-slate-400">
                            원하는 장소만 여행방에 등록하세요
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    aria-label="AI 추천 장소 패널 닫기"
                >
                    <XIcon size={18} />
                </button>
            </header>

            <div className="mp-scroll flex-1 space-y-3 overflow-y-auto p-4">
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500">
                    장소 정보 제공:{' '}
                    <a
                        href="https://maps.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black text-blue-600 hover:underline"
                    >
                        Google Maps
                    </a>
                </p>
                {recommendations.length === 0 && (
                    <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400">
                        조건에 맞는 장소를 찾지 못했습니다.
                    </p>
                )}
                {recommendations.map((recommendation) => {
                    const registered = registeredIds.has(
                        recommendation.place.googlePlaceId,
                    )
                    const loading =
                        registeringId === recommendation.place.googlePlaceId
                    return (
                        <article
                            key={recommendation.place.googlePlaceId}
                            className="rounded-2xl border border-slate-200 p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-black text-slate-900">
                                        {recommendation.place.name}
                                    </h3>
                                    <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-400">
                                        <MapPinIcon size={11} />
                                        {recommendation.place.address}
                                    </p>
                                </div>
                                {recommendation.place.rating != null && (
                                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-600">
                                        ★ {recommendation.place.rating}
                                    </span>
                                )}
                            </div>
                            <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold leading-5 text-brand-700">
                                {recommendation.reason}
                            </p>
                            <p className="mt-2 text-[10px] font-bold text-slate-400">
                                기존 동선에서 약{' '}
                                {recommendation.routeDeviationMeters < 1000
                                    ? `${recommendation.routeDeviationMeters}m`
                                    : `${(
                                          recommendation.routeDeviationMeters /
                                          1000
                                      ).toFixed(1)}km`}
                            </p>
                            <button
                                type="button"
                                disabled={registered || loading}
                                onClick={() => void register(recommendation)}
                                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:bg-emerald-50 disabled:text-emerald-600"
                            >
                                {loading ? (
                                    <LoaderCircleIcon
                                        className="animate-spin"
                                        size={14}
                                    />
                                ) : registered ? (
                                    <CheckIcon size={14} />
                                ) : null}
                                {loading
                                    ? '등록 중...'
                                    : registered
                                      ? '여행방에 등록됨'
                                      : '여행방 장소로 등록'}
                            </button>
                        </article>
                    )
                })}
                {error && (
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                        {error}
                    </p>
                )}
            </div>
        </aside>
    )
}
