import React, { useEffect, useMemo, useState } from 'react'
import {
    ArrowDownUpIcon,
    BookHeartIcon,
    ImagePlusIcon,
    MapPinIcon,
    PlusIcon,
    StarIcon,
    XIcon,
} from 'lucide-react'
import type { Place } from '@/entities/trip'
import {
    createTravelRecord,
    getMyRetrospective,
    getTravelRecords,
    saveMyRetrospective,
    type Retrospective,
    type TravelRecord,
} from '@/entities/travel-record'
import { getApiErrorMessage } from '@/shared/api/client'

type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
    startDate: string | null
    endDate: string | null
    onPlaceClick: (placeId: string) => void
    onChanged?: () => void
}

const SAMPLE_IMAGES = ['/trip-record-2.png', '/trip-record-1.png']

export function RecordPanel({
    tripId,
    places,
    canWrite,
    startDate,
    endDate,
    onPlaceClick,
    onChanged,
}: Props) {
    const [records, setRecords] = useState<TravelRecord[]>([])
    const [retrospective, setRetrospective] = useState<Retrospective | null>(
        null,
    )
    const [selectedDay, setSelectedDay] = useState(1)
    const [isNewestFirst, setIsNewestFirst] = useState(true)
    const [view, setView] = useState<'records' | 'retrospective'>('records')
    const [composerOpen, setComposerOpen] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [memo, setMemo] = useState('')
    const [tripPlaceId, setTripPlaceId] = useState('')
    const [selectedImages, setSelectedImages] = useState<string[]>([])
    const [rating, setRating] = useState(5)
    const [goodPoints, setGoodPoints] = useState('')
    const [improvements, setImprovements] = useState('')
    const [summary, setSummary] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const days = useMemo(() => createDays(startDate, endDate), [
        startDate,
        endDate,
    ])
    const effectiveSelectedDay =
        selectedDay <= days.length ? selectedDay : 1
    const dayRecords = useMemo(() => {
        const filtered = records.filter(
            (record) => record.dayNumber === effectiveSelectedDay,
        )
        return [...filtered].sort((a, b) =>
            isNewestFirst
                ? b.visitedAt.localeCompare(a.visitedAt)
                : a.visitedAt.localeCompare(b.visitedAt),
        )
    }, [effectiveSelectedDay, isNewestFirst, records])

    useEffect(() => {
        let active = true
        Promise.all([getTravelRecords(tripId), getMyRetrospective(tripId)])
            .then(([nextRecords, nextRetrospective]) => {
                if (!active) return
                setRecords(nextRecords)
                setRetrospective(nextRetrospective)
                if (nextRetrospective) {
                    setRating(nextRetrospective.rating)
                    setGoodPoints(nextRetrospective.goodPoints ?? '')
                    setImprovements(nextRetrospective.improvements ?? '')
                    setSummary(nextRetrospective.summary ?? '')
                }
            })
            .catch((loadError: unknown) => {
                if (!active) return
                setError(
                    getApiErrorMessage(
                        loadError,
                        '여행 기록을 불러오지 못했습니다.',
                    ),
                )
            })
            .finally(() => {
                if (active) setIsLoading(false)
            })
        return () => {
            active = false
        }
    }, [tripId])

    async function addRecord() {
        if (!tripPlaceId || (!memo.trim() && selectedImages.length === 0)) {
            return
        }
        const selectedDate = days[effectiveSelectedDay - 1]?.date
        if (!selectedDate) return

        setIsSaving(true)
        setError(null)
        try {
            const now = new Date()
            const time = `${String(now.getHours()).padStart(2, '0')}:${String(
                now.getMinutes(),
            ).padStart(2, '0')}:00`
            const created = await createTravelRecord(tripId, {
                tripPlaceId: Number(tripPlaceId),
                itineraryItemId: null,
                visitedAt: `${selectedDate}T${time}`,
                memo: memo.trim() || null,
                imageUrls: selectedImages,
            })
            setRecords((current) => [created, ...current])
            setMemo('')
            setTripPlaceId('')
            setSelectedImages([])
            setComposerOpen(false)
            onChanged?.()
        } catch (saveError) {
            setError(
                getApiErrorMessage(
                    saveError,
                    '여행 기록을 저장하지 못했습니다.',
                ),
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function saveRetrospective() {
        setIsSaving(true)
        setError(null)
        try {
            const saved = await saveMyRetrospective(tripId, {
                rating,
                goodPoints: goodPoints.trim() || null,
                improvements: improvements.trim() || null,
                summary: summary.trim() || null,
            })
            setRetrospective(saved)
            onChanged?.()
        } catch (saveError) {
            setError(
                getApiErrorMessage(saveError, '회고를 저장하지 못했습니다.'),
            )
        } finally {
            setIsSaving(false)
        }
    }

    if (!startDate || !endDate) {
        return (
            <EmptyState
                title="여행 기간을 먼저 정해 주세요"
                description="여행 기간이 확정되면 DAY별 사진과 메모를 남길 수 있어요."
            />
        )
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col bg-[#fcfcfd]">
            <div className="flex border-b border-slate-100 bg-white p-2">
                <button
                    onClick={() => setView('records')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-extrabold ${
                        view === 'records'
                            ? 'bg-brand text-white'
                            : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    DAY별 여행 기록
                </button>
                <button
                    onClick={() => setView('retrospective')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold ${
                        view === 'retrospective'
                            ? 'bg-brand text-white'
                            : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <BookHeartIcon size={14} /> 여행 회고
                </button>
            </div>

            {error && (
                <p
                    role="alert"
                    className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                >
                    {error}
                </p>
            )}

            {view === 'records' ? (
                <>
                    <DayNavigation
                        days={days}
                        selectedDay={effectiveSelectedDay}
                        onSelect={setSelectedDay}
                        isNewestFirst={isNewestFirst}
                        onToggleOrder={() =>
                            setIsNewestFirst((current) => !current)
                        }
                    />
                    <div className="mp-scroll flex-1 overflow-y-auto px-4 py-5">
                        {isLoading ? (
                            <p className="py-16 text-center text-sm text-slate-400">
                                여행 기록을 불러오는 중입니다.
                            </p>
                        ) : dayRecords.length === 0 ? (
                            <EmptyState
                                title={`DAY ${effectiveSelectedDay} 기록이 아직 없어요`}
                                description="여행 중 사진과 메모를 일정별로 남겨보세요."
                            />
                        ) : (
                            <div className="space-y-4 pb-3">
                                {dayRecords.map((record) => {
                                    const place = places.find(
                                        (item) =>
                                            Number(item.id) ===
                                            record.tripPlaceId,
                                    )
                                    return (
                                        <article
                                            key={record.id}
                                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-extrabold text-slate-800">
                                                        {record.memberNickname}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                                        {formatDateTime(
                                                            record.visitedAt,
                                                        )}
                                                    </p>
                                                </div>
                                                <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-extrabold text-brand-700">
                                                    DAY {record.dayNumber}
                                                </span>
                                            </div>
                                            {record.imageUrls.length > 0 && (
                                                <PhotoGrid
                                                    images={record.imageUrls}
                                                    onOpen={setPreviewImage}
                                                />
                                            )}
                                            {record.memo && (
                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                    {record.memo}
                                                </p>
                                            )}
                                            {place && (
                                                <button
                                                    onClick={() =>
                                                        onPlaceClick(place.id)
                                                    }
                                                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-700 hover:bg-brand-100"
                                                >
                                                    <MapPinIcon size={12} />
                                                    {place.name}
                                                </button>
                                            )}
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    {canWrite && (
                        <div className="border-t border-slate-100 bg-white p-4">
                            <button
                                onClick={() => setComposerOpen(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white hover:bg-brand-700"
                            >
                                <PlusIcon size={17} /> DAY{' '}
                                {effectiveSelectedDay} 기록
                                추가
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <RetrospectiveForm
                    rating={rating}
                    onRatingChange={setRating}
                    goodPoints={goodPoints}
                    onGoodPointsChange={setGoodPoints}
                    improvements={improvements}
                    onImprovementsChange={setImprovements}
                    summary={summary}
                    onSummaryChange={setSummary}
                    canWrite={canWrite}
                    isSaving={isSaving}
                    saved={retrospective !== null}
                    onSave={() => void saveRetrospective()}
                />
            )}

            {composerOpen && (
                <RecordComposer
                    day={effectiveSelectedDay}
                    places={places}
                    memo={memo}
                    onMemoChange={setMemo}
                    tripPlaceId={tripPlaceId}
                    onTripPlaceChange={setTripPlaceId}
                    selectedImages={selectedImages}
                    onImageToggle={(image) =>
                        setSelectedImages((current) =>
                            current.includes(image)
                                ? current.filter((item) => item !== image)
                                : [...current, image],
                        )
                    }
                    isSaving={isSaving}
                    onClose={() => setComposerOpen(false)}
                    onSave={() => void addRecord()}
                />
            )}

            {previewImage && (
                <div
                    className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="여행 기록 사진 크게 보기"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"
                        aria-label="사진 닫기"
                    >
                        <XIcon size={20} />
                    </button>
                    <img
                        src={previewImage}
                        alt="확대된 여행 기록"
                        className="max-h-full max-w-full rounded-2xl object-contain"
                    />
                </div>
            )}
        </div>
    )
}

function DayNavigation({
    days,
    selectedDay,
    onSelect,
    isNewestFirst,
    onToggleOrder,
}: {
    days: Array<{ day: number; date: string }>
    selectedDay: number
    onSelect: (day: number) => void
    isNewestFirst: boolean
    onToggleOrder: () => void
}) {
    return (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
            <div className="mp-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {days.map((item) => (
                    <button
                        key={item.day}
                        onClick={() => onSelect(item.day)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                            selectedDay === item.day
                                ? 'bg-brand text-white'
                                : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                        DAY {item.day}
                        <span className="ml-1 opacity-75">
                            {item.date.slice(5).replace('-', '.')}
                        </span>
                    </button>
                ))}
            </div>
            <button
                onClick={onToggleOrder}
                className="flex shrink-0 items-center gap-1 rounded-lg p-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
                aria-label="기록 정렬 순서 변경"
            >
                <ArrowDownUpIcon size={13} />
                {isNewestFirst ? '최신순' : '시간순'}
            </button>
        </div>
    )
}

function RecordComposer({
    day,
    places,
    memo,
    onMemoChange,
    tripPlaceId,
    onTripPlaceChange,
    selectedImages,
    onImageToggle,
    isSaving,
    onClose,
    onSave,
}: {
    day: number
    places: Place[]
    memo: string
    onMemoChange: (value: string) => void
    tripPlaceId: string
    onTripPlaceChange: (value: string) => void
    selectedImages: string[]
    onImageToggle: (image: string) => void
    isSaving: boolean
    onClose: () => void
    onSave: () => void
}) {
    return (
        <div
            className="absolute inset-0 z-50 flex items-end bg-slate-950/30 p-3 sm:items-center sm:justify-center"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="record-dialog-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-brand-700">
                            DAY {day}
                        </p>
                        <h3
                            id="record-dialog-title"
                            className="mt-0.5 text-lg font-extrabold"
                        >
                            여행 기록 추가
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                        aria-label="기록 추가 닫기"
                    >
                        <XIcon size={18} />
                    </button>
                </div>
                <label className="mt-5 block text-xs font-bold text-slate-600">
                    일정 장소
                </label>
                <select
                    value={tripPlaceId}
                    onChange={(event) =>
                        onTripPlaceChange(event.target.value)
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                >
                    <option value="">기록할 장소를 선택해 주세요</option>
                    {places
                        .filter((place) => place.status === 'saved')
                        .map((place) => (
                            <option key={place.id} value={place.id}>
                                {place.name}
                            </option>
                        ))}
                </select>
                <textarea
                    value={memo}
                    onChange={(event) => onMemoChange(event.target.value)}
                    placeholder="이 일정에서 기억하고 싶은 내용을 남겨보세요."
                    maxLength={5000}
                    className="mt-3 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-brand focus:bg-white"
                />
                <p className="mt-4 text-xs font-bold text-slate-600">
                    테스트 사진 선택
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    {SAMPLE_IMAGES.map((image) => (
                        <button
                            key={image}
                            onClick={() => onImageToggle(image)}
                            className={`relative h-24 overflow-hidden rounded-xl border-2 ${
                                selectedImages.includes(image)
                                    ? 'border-brand'
                                    : 'border-transparent'
                            }`}
                            aria-label="여행 기록 사진 선택"
                        >
                            <img
                                src={image}
                                alt="여행 기록에 사용할 테스트 사진"
                                className="h-full w-full object-cover"
                            />
                            {selectedImages.includes(image) && (
                                <span className="absolute inset-0 bg-brand/20" />
                            )}
                        </button>
                    ))}
                </div>
                <button
                    disabled={
                        isSaving ||
                        !tripPlaceId ||
                        (!memo.trim() && selectedImages.length === 0)
                    }
                    onClick={onSave}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-200"
                >
                    <ImagePlusIcon size={16} />
                    {isSaving ? '저장 중...' : '기록 저장'}
                </button>
            </div>
        </div>
    )
}

function RetrospectiveForm({
    rating,
    onRatingChange,
    goodPoints,
    onGoodPointsChange,
    improvements,
    onImprovementsChange,
    summary,
    onSummaryChange,
    canWrite,
    isSaving,
    saved,
    onSave,
}: {
    rating: number
    onRatingChange: (value: number) => void
    goodPoints: string
    onGoodPointsChange: (value: string) => void
    improvements: string
    onImprovementsChange: (value: string) => void
    summary: string
    onSummaryChange: (value: string) => void
    canWrite: boolean
    isSaving: boolean
    saved: boolean
    onSave: () => void
}) {
    return (
        <div className="mp-scroll flex-1 overflow-y-auto p-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-extrabold text-slate-800">
                    이번 여행은 어땠나요?
                </p>
                <div className="mt-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                        <button
                            key={value}
                            type="button"
                            disabled={!canWrite}
                            onClick={() => onRatingChange(value)}
                            aria-label={`${value}점`}
                            className={
                                value <= rating
                                    ? 'text-amber-400'
                                    : 'text-slate-200'
                            }
                        >
                            <StarIcon
                                size={26}
                                fill={value <= rating ? 'currentColor' : 'none'}
                            />
                        </button>
                    ))}
                </div>
                <RetrospectiveField
                    label="좋았던 점"
                    value={goodPoints}
                    onChange={onGoodPointsChange}
                    placeholder="가장 기억에 남는 순간을 적어보세요."
                    disabled={!canWrite}
                />
                <RetrospectiveField
                    label="아쉬웠던 점"
                    value={improvements}
                    onChange={onImprovementsChange}
                    placeholder="다음 여행에서 바꾸고 싶은 점을 적어보세요."
                    disabled={!canWrite}
                />
                <RetrospectiveField
                    label="한 줄 회고"
                    value={summary}
                    onChange={onSummaryChange}
                    placeholder="이번 여행을 한 문장으로 남겨보세요."
                    disabled={!canWrite}
                />
                {canWrite && (
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:bg-slate-300"
                    >
                        {isSaving
                            ? '저장 중...'
                            : saved
                              ? '회고 수정'
                              : '회고 저장'}
                    </button>
                )}
            </div>
        </div>
    )
}

function RetrospectiveField({
    label,
    value,
    onChange,
    placeholder,
    disabled,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder: string
    disabled: boolean
}) {
    return (
        <label className="mt-5 block text-xs font-bold text-slate-600">
            {label}
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={5000}
                className="mt-2 min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal outline-none focus:border-brand disabled:text-slate-500"
            />
        </label>
    )
}

function PhotoGrid({
    images,
    onOpen,
}: {
    images: string[]
    onOpen: (image: string) => void
}) {
    const visibleImages = images.slice(0, 4)
    const extraCount = images.length - visibleImages.length
    return (
        <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-xl bg-slate-100">
            {visibleImages.map((image, index) => (
                <button
                    key={`${image}-${index}`}
                    onClick={() => onOpen(image)}
                    className="relative h-28 overflow-hidden"
                    aria-label="여행 기록 사진 크게 보기"
                >
                    <img
                        src={image}
                        alt="여행 기록 사진"
                        className="h-full w-full object-cover"
                    />
                    {index === visibleImages.length - 1 && extraCount > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-lg font-extrabold text-white">
                            +{extraCount}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )
}

function EmptyState({
    title,
    description,
}: {
    title: string
    description: string
}) {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-3xl">
                📸
            </div>
            <h4 className="mt-5 text-sm font-extrabold text-slate-800">
                {title}
            </h4>
            <p className="mt-2 text-xs leading-5 text-slate-400">
                {description}
            </p>
        </div>
    )
}

function createDays(startDate: string | null, endDate: string | null) {
    if (!startDate || !endDate) return []
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []
    const days: Array<{ day: number; date: string }> = []
    const current = new Date(start)
    while (current <= end) {
        days.push({
            day: days.length + 1,
            date: `${current.getFullYear()}-${String(
                current.getMonth() + 1,
            ).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
        })
        current.setDate(current.getDate() + 1)
    }
    return days
}

function formatDateTime(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('ko-KR', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}
