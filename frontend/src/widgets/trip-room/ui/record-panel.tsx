import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ArrowDownUpIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ImagePlusIcon,
    PlusIcon,
    XIcon,
} from 'lucide-react'
import type { Place } from '@/entities/trip'
import {
    createTravelRecord,
    getTravelRecords,
    uploadTravelPhoto,
    type TravelRecord,
} from '@/entities/travel-record'
import { getApiErrorMessage, resolveMediaUrl } from '@/shared/api/client'
import {
    mergeTravelRecordPhotoUrls,
    uploadTravelRecordPhotos,
} from '../lib/travel-record-photos'

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
type LocalPhoto = {
    id: string
    file: File
    previewUrl: string
}

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
    const [selectedDay, setSelectedDay] = useState(1)
    const [isNewestFirst, setIsNewestFirst] = useState(true)
    const [composerOpen, setComposerOpen] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [memo, setMemo] = useState('')
    const [tripPlaceId, setTripPlaceId] = useState('')
    const [selectedImages, setSelectedImages] = useState<string[]>([])
    const [selectedLocalPhotos, setSelectedLocalPhotos] = useState<
        LocalPhoto[]
    >([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const days = useMemo(
        () => createDays(startDate, endDate),
        [startDate, endDate],
    )
    const effectiveSelectedDay = selectedDay <= days.length ? selectedDay : 1
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
    const placeRecordGroups = useMemo(
        () => groupRecordsByPlace(dayRecords, places),
        [dayRecords, places],
    )

    useEffect(() => {
        let active = true
        getTravelRecords(tripId)
            .then((nextRecords) => {
                if (!active) return
                setRecords(nextRecords)
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
        if (
            !tripPlaceId ||
            (!memo.trim() &&
                selectedImages.length === 0 &&
                selectedLocalPhotos.length === 0)
        ) {
            return
        }
        const selectedDate = days[effectiveSelectedDay - 1]?.date
        if (!selectedDate) return

        setIsSaving(true)
        setIsUploading(selectedLocalPhotos.length > 0)
        setError(null)
        try {
            const now = new Date()
            const time = `${String(now.getHours()).padStart(2, '0')}:${String(
                now.getMinutes(),
            ).padStart(2, '0')}:00`
            const uploadedImageUrls = await uploadTravelRecordPhotos(
                selectedLocalPhotos.map((photo) => photo.file),
                (file) => uploadTravelPhoto(tripId, file),
            )
            if (uploadedImageUrls.length > 0) {
                selectedLocalPhotos.forEach((photo) =>
                    URL.revokeObjectURL(photo.previewUrl),
                )
                setSelectedLocalPhotos([])
                setSelectedImages((current) => [
                    ...current,
                    ...uploadedImageUrls,
                ])
            }
            const recordImageUrls = mergeTravelRecordPhotoUrls(
                selectedImages,
                uploadedImageUrls,
            )
            const created = await createTravelRecord(tripId, {
                tripPlaceId: Number(tripPlaceId),
                itineraryItemId: null,
                visitedAt: `${selectedDate}T${time}`,
                memo: memo.trim() || null,
                imageUrls: recordImageUrls,
            })
            setRecords((current) => [created, ...current])
            setMemo('')
            setTripPlaceId('')
            setSelectedImages([])
            setSelectedLocalPhotos([])
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
            setIsUploading(false)
        }
    }

    function addLocalPhoto(file: File) {
        if (selectedImages.length + selectedLocalPhotos.length >= 10) {
            setError('사진은 기록 하나에 최대 10장까지 등록할 수 있습니다.')
            return
        }
        setError(null)
        setSelectedLocalPhotos((current) => [
            ...current,
            {
                id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
                file,
                previewUrl: URL.createObjectURL(file),
            },
        ])
    }

    function removeLocalPhoto(photoId: string) {
        setSelectedLocalPhotos((current) => {
            const removed = current.find((photo) => photo.id === photoId)
            if (removed) URL.revokeObjectURL(removed.previewUrl)
            return current.filter((photo) => photo.id !== photoId)
        })
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
            {error && (
                <p
                    role="alert"
                    className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                >
                    {error}
                </p>
            )}

            <DayNavigation
                days={days}
                selectedDay={effectiveSelectedDay}
                onSelect={setSelectedDay}
                isNewestFirst={isNewestFirst}
                onToggleOrder={() => setIsNewestFirst((current) => !current)}
            />
            <div className="mp-scroll flex-1 overflow-y-auto px-4 py-5">
                {isLoading ? (
                    <p className="py-16 text-center text-sm text-slate-400">
                        여행 기록을 불러오는 중입니다.
                    </p>
                ) : placeRecordGroups.length === 0 ? (
                    <EmptyState
                        title={`DAY ${effectiveSelectedDay} 기록이 아직 없어요`}
                        description="여행 중 사진과 메모를 일정별로 남겨보세요."
                    />
                ) : (
                    <div className="pb-3">
                        {placeRecordGroups.map((group, groupIndex) => (
                            <section
                                key={group.tripPlaceId}
                                className="relative pb-7 pl-10 last:pb-0"
                            >
                                {groupIndex < placeRecordGroups.length - 1 && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute bottom-0 left-[15px] top-7 border-l-2 border-dashed border-[#213C51]/35"
                                    />
                                )}
                                <span
                                    aria-hidden="true"
                                    className="absolute left-1 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#213C51]/20 ring-4 ring-[#213C51]/8"
                                >
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#213C51]" />
                                </span>

                                <div className="mb-3 flex items-start justify-between gap-3">
                                    {group.place ? (
                                        <button
                                            onClick={() =>
                                                onPlaceClick(group.place!.id)
                                            }
                                            className="min-w-0 text-left hover:text-brand-700"
                                        >
                                            <strong className="block truncate text-sm font-extrabold text-slate-900">
                                                {group.place.name}
                                            </strong>
                                            <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                                                {group.place.address}
                                            </span>
                                        </button>
                                    ) : (
                                        <strong className="text-sm font-extrabold text-slate-900">
                                            기타 기록
                                        </strong>
                                    )}
                                    <span className="shrink-0 text-[11px] font-bold text-slate-400">
                                        기록 {group.records.length}개
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {group.records.map((record) => (
                                        <article
                                            key={record.id}
                                            className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm transition hover:border-brand-100 hover:bg-slate-50"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-500">
                                                        {record.memberNickname
                                                            .trim()
                                                            .slice(0, 1)}
                                                    </span>
                                                    <p className="truncate text-xs font-extrabold text-slate-800">
                                                        {record.memberNickname}
                                                    </p>
                                                </div>
                                                <time className="shrink-0 text-[10px] font-medium text-slate-400">
                                                    {formatDateTime(
                                                        record.visitedAt,
                                                    )}
                                                </time>
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
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
            {canWrite && (
                <div className="border-t border-slate-100 bg-white p-4">
                    <button
                        onClick={() => setComposerOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white hover:bg-brand-700"
                    >
                        <PlusIcon size={17} /> DAY {effectiveSelectedDay} 기록
                        추가
                    </button>
                </div>
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
                    selectedLocalPhotos={selectedLocalPhotos}
                    onImageToggle={(image) =>
                        setSelectedImages((current) =>
                            current.includes(image)
                                ? current.filter((item) => item !== image)
                                : [...current, image],
                        )
                    }
                    isSaving={isSaving}
                    isUploading={isUploading}
                    onFileSelect={addLocalPhoto}
                    onLocalPhotoRemove={removeLocalPhoto}
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
                        src={displayImageUrl(previewImage)}
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
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const updateScrollButtons = useCallback(() => {
        const element = scrollRef.current
        if (!element) return
        const maxScrollLeft = element.scrollWidth - element.clientWidth
        setCanScrollLeft(element.scrollLeft > 1)
        setCanScrollRight(element.scrollLeft < maxScrollLeft - 1)
    }, [])

    useEffect(() => {
        const element = scrollRef.current
        if (!element) return
        updateScrollButtons()
        const observer = new ResizeObserver(updateScrollButtons)
        observer.observe(element)
        return () => observer.disconnect()
    }, [days.length, updateScrollButtons])

    function scrollDays(direction: -1 | 1) {
        scrollRef.current?.scrollBy({
            left: direction * 180,
            behavior: 'smooth',
        })
    }

    return (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-1">
                {canScrollLeft && (
                    <button
                        type="button"
                        onClick={() => scrollDays(-1)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                        aria-label="이전 DAY 보기"
                    >
                        <ChevronLeftIcon size={15} />
                    </button>
                )}
                <div
                    ref={scrollRef}
                    onScroll={updateScrollButtons}
                    onWheel={(event) => {
                        const element = scrollRef.current
                        if (
                            !element ||
                            element.scrollWidth <= element.clientWidth
                        ) {
                            return
                        }
                        event.preventDefault()
                        element.scrollBy({
                            left:
                                Math.abs(event.deltaY) > Math.abs(event.deltaX)
                                    ? event.deltaY
                                    : event.deltaX,
                        })
                    }}
                    className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
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
                {canScrollRight && (
                    <button
                        type="button"
                        onClick={() => scrollDays(1)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                        aria-label="다음 DAY 보기"
                    >
                        <ChevronRightIcon size={15} />
                    </button>
                )}
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
    selectedLocalPhotos,
    onImageToggle,
    isSaving,
    isUploading,
    onFileSelect,
    onLocalPhotoRemove,
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
    selectedLocalPhotos: LocalPhoto[]
    onImageToggle: (image: string) => void
    isSaving: boolean
    isUploading: boolean
    onFileSelect: (file: File) => void
    onLocalPhotoRemove: (photoId: string) => void
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
                    onChange={(event) => onTripPlaceChange(event.target.value)}
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
                                src={displayImageUrl(image)}
                                alt="여행 기록에 사용할 테스트 사진"
                                className="h-full w-full object-cover"
                            />
                            {selectedImages.includes(image) && (
                                <span className="absolute inset-0 bg-brand/20" />
                            )}
                        </button>
                    ))}
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50 py-3 text-xs font-extrabold text-brand-700 hover:bg-brand-100">
                    <ImagePlusIcon size={15} />
                    {isUploading ? '사진 업로드 중...' : '내 사진 업로드'}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isUploading}
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) onFileSelect(file)
                            event.target.value = ''
                        }}
                    />
                </label>
                {selectedLocalPhotos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        {selectedLocalPhotos.map((photo) => (
                            <button
                                key={photo.id}
                                onClick={() => onLocalPhotoRemove(photo.id)}
                                className="relative h-20 overflow-hidden rounded-xl"
                                aria-label="업로드한 사진 선택 해제"
                            >
                                <img
                                    src={photo.previewUrl}
                                    alt="업로드한 여행 기록 사진"
                                    className="h-full w-full object-cover"
                                />
                                <span className="absolute right-1 top-1 rounded-full bg-slate-950/60 p-1 text-white">
                                    <XIcon size={11} />
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {selectedImages.some(
                    (image) => !SAMPLE_IMAGES.includes(image),
                ) && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        {selectedImages
                            .filter((image) => !SAMPLE_IMAGES.includes(image))
                            .map((image) => (
                                <button
                                    key={image}
                                    onClick={() => onImageToggle(image)}
                                    className="relative h-20 overflow-hidden rounded-xl"
                                    aria-label="업로드한 사진 선택 해제"
                                >
                                    <img
                                        src={displayImageUrl(image)}
                                        alt="업로드한 여행 기록 사진"
                                        className="h-full w-full object-cover"
                                    />
                                    <span className="absolute right-1 top-1 rounded-full bg-slate-950/60 p-1 text-white">
                                        <XIcon size={11} />
                                    </span>
                                </button>
                            ))}
                    </div>
                )}
                <button
                    disabled={
                        isSaving ||
                        isUploading ||
                        !tripPlaceId ||
                        (!memo.trim() &&
                            selectedImages.length === 0 &&
                            selectedLocalPhotos.length === 0)
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
                        src={displayImageUrl(image)}
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

function displayImageUrl(imageUrl: string) {
    return imageUrl.startsWith('/uploads/')
        ? (resolveMediaUrl(imageUrl) ?? imageUrl)
        : imageUrl
}

function groupRecordsByPlace(records: TravelRecord[], places: Place[]) {
    const placeById = new Map(
        places.map((place) => [Number(place.id), place] as const),
    )
    const groups = new Map<
        number,
        {
            tripPlaceId: number
            place: Place | null
            records: TravelRecord[]
        }
    >()

    records.forEach((record) => {
        const current = groups.get(record.tripPlaceId)
        if (current) {
            current.records.push(record)
            return
        }
        groups.set(record.tripPlaceId, {
            tripPlaceId: record.tripPlaceId,
            place: placeById.get(record.tripPlaceId) ?? null,
            records: [record],
        })
    })

    return Array.from(groups.values())
}
