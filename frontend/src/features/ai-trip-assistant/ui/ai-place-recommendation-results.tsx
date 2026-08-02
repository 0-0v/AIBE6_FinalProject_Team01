'use client'

import { useState, type ReactNode } from 'react'
import {
    CheckIcon,
    ExternalLinkIcon,
    LoaderCircleIcon,
    MapPinIcon,
    PhoneIcon,
    RotateCcwIcon,
    StarIcon,
} from 'lucide-react'
import { addTripPlace, type ItineraryItem } from '@/entities/trip'
import {
    getApiErrorMessage,
    resolveGooglePlacePhotoUrl,
} from '@/shared/api/client'
import type { AiPlaceRecommendation } from '../model/types'

type Props = {
    tripId: number
    recommendations: AiPlaceRecommendation[]
    routeContext: {
        dayId: number
        dayNumber: number
        itineraryDate: string
        from: ItineraryItem
        to: ItineraryItem
    }
    renderMap: (
        recommendation: AiPlaceRecommendation,
        routeContext: Props['routeContext'],
    ) => ReactNode
    onReset: () => void
}

function formatDistance(meters: number) {
    return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
}

export function AiPlaceRecommendationResults({
    tripId,
    recommendations,
    routeContext,
    renderMap,
    onReset,
}: Props) {
    const [selectedId, setSelectedId] = useState(
        recommendations[0]?.place.googlePlaceId ?? '',
    )
    const [registeringId, setRegisteringId] = useState<string | null>(null)
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)
    const selected =
        recommendations.find(
            ({ place }) => place.googlePlaceId === selectedId,
        ) ?? recommendations[0]

    async function register(recommendation: AiPlaceRecommendation) {
        const placeId = recommendation.place.googlePlaceId
        setRegisteringId(placeId)
        setError(null)
        try {
            await addTripPlace(tripId, recommendation.place)
            setRegisteredIds((current) => new Set(current).add(placeId))
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

    if (!selected) return null

    const registered = registeredIds.has(selected.place.googlePlaceId)
    const registering = registeringId === selected.place.googlePlaceId

    return (
        <div className="grid gap-5 px-6 pb-6 pt-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
            <div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-slate-900">
                            추천 장소 {recommendations.length}곳
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                            장소를 선택하면 상세 위치와 추천 이유를 확인할 수
                            있어요.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-extrabold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-brand"
                    >
                        <RotateCcwIcon size={13} />
                        조건 변경
                    </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {recommendations.slice(0, 5).map((recommendation) => {
                        const place = recommendation.place
                        const active =
                            place.googlePlaceId === selected.place.googlePlaceId
                        const added = registeredIds.has(place.googlePlaceId)
                        return (
                            <button
                                key={place.googlePlaceId}
                                type="button"
                                onClick={() => {
                                    setSelectedId(place.googlePlaceId)
                                    setError(null)
                                }}
                                className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                    active
                                        ? 'border-brand bg-rose-50 shadow-[0_8px_20px_rgba(225,91,116,0.12)]'
                                        : 'border-slate-200 bg-white hover:border-rose-200'
                                }`}
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                                    {resolveGooglePlacePhotoUrl(
                                        place.photoName,
                                    ) ? (
                                        <img
                                            src={
                                                resolveGooglePlacePhotoUrl(
                                                    place.photoName,
                                                ) ?? ''
                                            }
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <MapPinIcon
                                            size={18}
                                            className="text-slate-400"
                                        />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-xs font-black text-slate-800">
                                            {place.name}
                                        </p>
                                        {added && (
                                            <CheckIcon
                                                size={13}
                                                className="shrink-0 text-emerald-500"
                                            />
                                        )}
                                    </div>
                                    <p className="mt-1 truncate text-[10px] text-slate-400">
                                        {place.address ?? '주소 정보 없음'}
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold text-brand">
                                        동선 이탈 약{' '}
                                        {formatDistance(
                                            recommendation.routeDeviationMeters,
                                        )}
                                    </p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/60">
                <div className="border-b border-slate-200 bg-white px-5 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-brand">
                        Day {routeContext.dayNumber} · {routeContext.itineraryDate}
                    </p>
                    <p className="mt-1 truncate text-xs font-extrabold text-slate-700">
                        {routeContext.from.placeName ?? '이전 일정'} →{' '}
                        {routeContext.to.placeName ?? '다음 일정'} 사이 추천
                    </p>
                </div>
                <div className="h-[280px] w-full overflow-hidden bg-slate-100 sm:h-[320px]">
                    {renderMap(selected, routeContext)}
                </div>

                <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="text-lg font-black text-slate-900">
                                {selected.place.name}
                            </h3>
                            <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                                <MapPinIcon
                                    size={14}
                                    className="mt-0.5 shrink-0 text-brand"
                                />
                                {selected.place.address ?? '주소 정보 없음'}
                            </p>
                        </div>
                        {selected.place.rating != null && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-600">
                                <StarIcon size={12} fill="currentColor" />
                                {selected.place.rating}
                            </span>
                        )}
                    </div>

                    <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-600 shadow-sm">
                        {selected.reason}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                        <span className="rounded-full bg-white px-3 py-1.5">
                            동선 이탈{' '}
                            {formatDistance(selected.routeDeviationMeters)}
                        </span>
                        {selected.place.openNow != null && (
                            <span
                                className={`rounded-full px-3 py-1.5 ${selected.place.openNow ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}
                            >
                                {selected.place.openNow
                                    ? '현재 영업 중'
                                    : '현재 영업 종료'}
                            </span>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {selected.place.phoneNumber && (
                            <a
                                href={`tel:${selected.place.phoneNumber}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600"
                            >
                                <PhoneIcon size={13} /> 전화
                            </a>
                        )}
                        {selected.place.websiteUri && (
                            <a
                                href={selected.place.websiteUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600"
                            >
                                <ExternalLinkIcon size={13} /> 웹사이트
                            </a>
                        )}
                    </div>

                    {error && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        disabled={registered || registering}
                        onClick={() => void register(selected)}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:bg-emerald-50 disabled:text-emerald-600"
                    >
                        {registering ? (
                            <LoaderCircleIcon
                                className="animate-spin"
                                size={16}
                            />
                        ) : registered ? (
                            <CheckIcon size={16} />
                        ) : null}
                        {registering
                            ? '등록 중...'
                            : registered
                              ? '여행방에 등록됨'
                              : '여행방 후보 장소로 등록'}
                    </button>
                </div>
            </article>
        </div>
    )
}
