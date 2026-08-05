'use client'

import {
    ArrowLeftIcon,
    ClockIcon,
    ExternalLinkIcon,
    MapPinIcon,
    NavigationIcon,
} from 'lucide-react'
import type { ItineraryItem, Place } from '@/entities/trip'
import { CategoryIcon } from '@/entities/trip'
import { Avatar } from '@/shared/ui'
import { buildGoogleMapsPlaceUrl } from '../lib/google-maps-place-url'
import { formatTimeRange } from '../lib/itinerary-time'
import { formatTransportSummary } from '../lib/itinerary-transport'
import { useAdderDisplay } from '../model/use-adder-display'
import { LazyPlacePhoto } from './lazy-place-photo'

type ScheduleInfo = {
    dayNumber: number
    order: number
    item: ItineraryItem
    nextItem: ItineraryItem | null
}

type Props = {
    place: Place
    scheduleInfo?: ScheduleInfo | null
    addedByNickname?: string
    onClose: () => void
    onPlacePhotoResolved?: (
        placeId: string,
        photoUrl: string,
        attribution: string | null,
        attributionUrl: string | null,
        sourceUrl: string,
    ) => void
}

// 네이버지도처럼 — 장소를 선택하면 목록 패널 자리를 z-index로 뒤덮으며
// 상세 정보 화면으로 전환된다. 지도 위 팝업은 최소한만 남기고 여기서 다 보여준다.
export function PlaceDetailOverlay({
    place,
    scheduleInfo,
    addedByNickname,
    onClose,
    onPlacePhotoResolved,
}: Props) {
    const hasPhoto = place.googlePlaceId != null || place.image != null
    const { adderName, adderColor } = useAdderDisplay(place, addedByNickname)

    return (
        <div className="itinerary-map-card-enter mp-scroll absolute inset-0 z-30 flex flex-col overflow-y-auto bg-white">
            {hasPhoto ? (
                <div className="relative shrink-0">
                    {place.googlePlaceId ? (
                        <LazyPlacePhoto
                            key={place.googlePlaceId}
                            placeId={place.id}
                            googlePlaceId={place.googlePlaceId}
                            placeName={place.name}
                            onPhotoResolved={onPlacePhotoResolved}
                            variant="panel"
                        />
                    ) : (
                        <img
                            src={place.image}
                            alt={place.name}
                            className="h-48 w-full bg-slate-100 object-cover"
                        />
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="목록으로 돌아가기"
                        className="absolute left-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
                    >
                        <ArrowLeftIcon size={15} aria-hidden />
                    </button>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-3 pt-12">
                        <h3 className="text-lg font-extrabold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.4)]">
                            {place.name}
                        </h3>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onClose}
                    className="sticky top-0 z-10 flex shrink-0 items-center gap-1.5 border-b border-slate-100 bg-white/95 px-3 py-2.5 text-xs font-bold text-slate-600 backdrop-blur transition hover:bg-slate-50 hover:text-slate-800"
                >
                    <ArrowLeftIcon size={15} aria-hidden />
                    목록으로
                </button>
            )}

            <div className="space-y-3 px-4 py-3.5">
                <div>
                    {!hasPhoto && (
                        <h3 className="text-base font-extrabold text-slate-900">
                            {place.name}
                        </h3>
                    )}
                    {place.categoryName && (
                        <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${hasPhoto ? 'mt-2' : 'mt-1.5'}`}
                            style={{
                                backgroundColor: place.categoryColor + '20',
                                color: place.categoryColor,
                            }}
                        >
                            {place.categoryIcon && (
                                <CategoryIcon
                                    icon={place.categoryIcon}
                                    size={13}
                                />
                            )}
                            {place.categoryName}
                        </span>
                    )}
                    {place.address && (
                        <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-slate-500">
                            <MapPinIcon
                                size={15}
                                className="mt-0.5 shrink-0 text-slate-400"
                                aria-hidden
                            />
                            {place.address}
                        </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                        <Avatar name={adderName} color={adderColor} size={22} />
                        <span className="text-sm text-slate-500">
                            {adderName}님이 등록
                        </span>
                    </div>
                </div>

                {scheduleInfo && (
                    <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
                        <p className="font-bold text-brand">
                            Day {scheduleInfo.dayNumber} · {scheduleInfo.order}
                            번째 장소
                        </p>
                        <p className="flex items-center gap-1.5 text-slate-600">
                            <ClockIcon size={13} aria-hidden />
                            {formatTimeRange(
                                scheduleInfo.item.startTime,
                                scheduleInfo.item.endTime,
                            )}
                        </p>
                        {scheduleInfo.nextItem != null && (
                            <p className="flex items-start gap-1.5 text-slate-500">
                                <NavigationIcon
                                    size={13}
                                    className="mt-px shrink-0"
                                    aria-hidden
                                />
                                다음 장소까지{' '}
                                {formatTransportSummary(scheduleInfo.item)}
                            </p>
                        )}
                        {scheduleInfo.item.memo && (
                            <p className="border-t border-slate-200 pt-2 text-slate-500">
                                메모 · {scheduleInfo.item.memo}
                            </p>
                        )}
                    </div>
                )}

                <a
                    href={buildGoogleMapsPlaceUrl(place)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
                >
                    Google Maps에서 최신 정보 확인
                    <ExternalLinkIcon size={12} aria-hidden />
                </a>
            </div>
        </div>
    )
}
