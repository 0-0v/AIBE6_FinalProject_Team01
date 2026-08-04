import React, { useEffect, useMemo, useState } from 'react'
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ImagePlusIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react'
import {
    completeExpenseParticipant,
    ExpenseSettlementCard,
    fetchExpenseData,
    isExpenseSettled,
    type ExpenseResponse,
} from '@/features/manage-expense'
import type { ItineraryDay, ItineraryItem, Place } from '@/entities/trip'
import {
    createTravelRecord,
    deleteTravelRecord,
    getTravelRecords,
    uploadTravelPhoto,
    type TravelRecord,
    updateTravelRecord,
} from '@/entities/travel-record'
import { getApiErrorMessage, resolveMediaUrl } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import {
    mergeTravelRecordPhotoUrls,
    uploadTravelRecordPhotos,
} from '../lib/travel-record-photos'
import { MapCanvas } from './map-canvas'

type Props = {
    tripId: number
    places: Place[]
    itineraryDays: ItineraryDay[]
    canWrite: boolean
    startDate: string | null
    endDate: string | null
    onPlaceClick: (placeId: string) => void
    onChanged?: () => void
    onOpenExpenses?: () => void
    onEditExpense?: (expense: ExpenseResponse) => void
    expenseRevision?: number
}

type LocalPhoto = {
    id: string
    file: File
    previewUrl: string
}
type ImageGallery = { images: string[]; index: number }

export function RecordPanel({
    tripId,
    places,
    itineraryDays,
    canWrite,
    startDate,
    endDate,
    onPlaceClick,
    onChanged,
    onOpenExpenses,
    onEditExpense,
    expenseRevision = 0,
}: Props) {
    const currentMemberId = useCurrentUserStore(
        (state) => state.currentUser?.id ?? null,
    )
    const [records, setRecords] = useState<TravelRecord[]>([])
    const [selectedDay, setSelectedDay] = useState(1)
    const [composerOpen, setComposerOpen] = useState(false)
    const [editingRecordId, setEditingRecordId] = useState<number | null>(null)
    const [previewGallery, setPreviewGallery] = useState<ImageGallery | null>(
        null,
    )
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
    const [mapSelectedPlaceId, setMapSelectedPlaceId] = useState<string | null>(
        null,
    )
    const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
    const [completingKey, setCompletingKey] = useState<string | null>(null)

    const days = useMemo(
        () =>
            [...itineraryDays]
                .sort((left, right) => left.dayNumber - right.dayNumber)
                .map((day) => ({ day: day.dayNumber, date: day.itineraryDate })),
        [itineraryDays],
    )
    const effectiveSelectedDay =
        selectedDay === 0
            ? 0
            : days.some((day) => day.day === selectedDay)
              ? selectedDay
              : (days[0]?.day ?? 1)
    const dayRecords = useMemo(() => {
        const filtered =
            effectiveSelectedDay === 0
                ? records
                : records.filter(
                      (record) => record.dayNumber === effectiveSelectedDay,
                  )
        return [...filtered].sort((a, b) =>
            a.visitedAt.localeCompare(b.visitedAt),
        )
    }, [effectiveSelectedDay, records])
    const selectedItineraryDay = useMemo(
        () =>
            itineraryDays.find(
                (day) => day.dayNumber === effectiveSelectedDay,
            ) ?? null,
        [effectiveSelectedDay, itineraryDays],
    )
    const scheduledItems = useMemo(() => {
        if (effectiveSelectedDay === 0) {
            return [...itineraryDays]
                .sort((left, right) => left.dayNumber - right.dayNumber)
                .flatMap((day) =>
                    [...day.items].sort(
                        (left, right) => left.sortOrder - right.sortOrder,
                    ),
                )
        }

        return [...(selectedItineraryDay?.items ?? [])].sort(
            (left, right) => left.sortOrder - right.sortOrder,
        )
    }, [effectiveSelectedDay, itineraryDays, selectedItineraryDay])
    const unrecordedPlaceIds = useMemo(() => {
        const recordedPlaceIds = new Set(
            dayRecords.map((record) => String(record.tripPlaceId)),
        )
        return scheduledItems
            .map((item) => item.tripPlaceId)
            .filter(
                (placeId): placeId is string =>
                    placeId != null && !recordedPlaceIds.has(String(placeId)),
            )
            .map(String)
    }, [dayRecords, scheduledItems])

    function openComposer(placeId?: string | null) {
        setEditingRecordId(null)
        setMemo('')
        setSelectedImages([])
        setTripPlaceId(placeId ?? '')
        setComposerOpen(true)
    }

    function openRecordEditor(record: TravelRecord) {
        setEditingRecordId(record.id)
        setTripPlaceId(String(record.tripPlaceId))
        setMemo(record.memo ?? '')
        setSelectedImages(record.imageUrls)
        setSelectedLocalPhotos([])
        setComposerOpen(true)
    }

    useEffect(() => {
        let active = true
        getTravelRecords(tripId)
            .then((nextRecords) => {
                if (!active) return
                setRecords(nextRecords)
            })
            .catch((loadError: unknown) => {
                if (!active) return
                const message = getApiErrorMessage(
                    loadError,
                    '여행 기록을 불러오지 못했습니다.',
                )
                setError(isVisitedAtRangeMessage(message) ? null : message)
            })
            .finally(() => {
                if (active) setIsLoading(false)
            })
        return () => {
            active = false
        }
    }, [tripId])

    useEffect(() => {
        let active = true
        fetchExpenseData(tripId)
            .then((data) => {
                if (!active) return
                setExpenses(data.expenses)
            })
            .catch(() => {
                if (!active) return
                setExpenses([])
            })
        return () => {
            active = false
        }
    }, [expenseRevision, tripId])

    async function completeParticipant(expenseId: number, memberId: number) {
        setCompletingKey(`${expenseId}:${memberId}`)
        setError(null)
        try {
            await completeExpenseParticipant(tripId, expenseId, memberId)
            const data = await fetchExpenseData(tripId)
            setExpenses(data.expenses)
            onChanged?.()
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    '정산 완료 처리에 실패했습니다.',
                ),
            )
        } finally {
            setCompletingKey(null)
        }
    }

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
        if (editingRecordId == null && !selectedDate) return

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
            if (editingRecordId != null) {
                const updated = await updateTravelRecord(
                    tripId,
                    editingRecordId,
                    {
                        memo: memo.trim() || null,
                        imageUrls: recordImageUrls,
                    },
                )
                setRecords((current) =>
                    current.map((record) =>
                        record.id === updated.id ? updated : record,
                    ),
                )
            } else {
                const created = await createTravelRecord(tripId, {
                    tripPlaceId: Number(tripPlaceId),
                    itineraryItemId: null,
                    visitedAt: `${selectedDate!}T${time}`,
                    memo: memo.trim() || null,
                    imageUrls: recordImageUrls,
                })
                setRecords((current) => [created, ...current])
            }
            setMemo('')
            setTripPlaceId('')
            setSelectedImages([])
            setSelectedLocalPhotos([])
            setComposerOpen(false)
            setEditingRecordId(null)
            onChanged?.()
        } catch (saveError) {
            const message = getApiErrorMessage(
                saveError,
                '여행 기록을 저장하지 못했습니다.',
            )
            setError(isVisitedAtRangeMessage(message) ? null : message)
        } finally {
            setIsSaving(false)
            setIsUploading(false)
        }
    }

    async function removeRecord(recordId: number) {
        if (!window.confirm('이 장소의 공동 기록을 삭제할까요?')) return
        setError(null)
        try {
            await deleteTravelRecord(tripId, recordId)
            setRecords((current) =>
                current.filter((record) => record.id !== recordId),
            )
            onChanged?.()
        } catch (deleteError) {
            setError(
                getApiErrorMessage(
                    deleteError,
                    '여행 기록을 삭제하지 못했습니다.',
                ),
            )
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
        <div className="relative flex min-h-0 flex-1 flex-col">
            {error && (
                <p
                    role="alert"
                    className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                >
                    {error}
                </p>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="mp-scroll min-h-0 overflow-y-auto rounded-[22px] bg-white shadow-[0_6px_16px_rgba(33,60,81,0.10)]">
                    <div className="flex items-center justify-between gap-4 px-10 pt-7 pb-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <strong className="text-xl font-black text-slate-900">
                                Day {effectiveSelectedDay}
                            </strong>
                            <span className="h-6 w-px bg-slate-200" />
                            <span className="truncate text-base font-extrabold text-slate-400">
                                {days
                                    .find(
                                        (day) =>
                                            day.day === effectiveSelectedDay,
                                    )
                                    ?.date.replaceAll('-', '.') ?? ''}
                            </span>
                        </div>
                        <span className="shrink-0 text-xs font-extrabold text-slate-400">
                            {scheduledItems.length}곳 중{' '}
                            {
                                new Set(
                                    dayRecords.map((record) =>
                                        String(record.tripPlaceId),
                                    ),
                                ).size
                            }
                            곳 기록
                        </span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto px-10 pb-2">
                        {days.map((day) => (
                            <button
                                key={day.day}
                                type="button"
                                onClick={() => setSelectedDay(day.day)}
                                className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                                    day.day === effectiveSelectedDay
                                        ? 'bg-brand text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                Day {day.day}
                            </button>
                        ))}
                    </div>
                    <div className="mx-10 mt-3 h-44 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                        <MapCanvas
                            key={`record-route-${effectiveSelectedDay}`}
                            places={places.filter(
                                (place) => place.status === 'saved',
                            )}
                            selectedId={mapSelectedPlaceId}
                            onSelect={setMapSelectedPlaceId}
                            onDeselect={() => setMapSelectedPlaceId(null)}
                            days={
                                effectiveSelectedDay === 0
                                    ? itineraryDays
                                    : selectedItineraryDay
                                      ? [selectedItineraryDay]
                                      : []
                            }
                            initialRouteDay={
                                effectiveSelectedDay === 0
                                    ? null
                                    : effectiveSelectedDay
                            }
                            routeOverview
                            outlinedPlaceIds={unrecordedPlaceIds}
                        />
                    </div>
                    <div className="px-10 py-5">
                        {isLoading ? (
                            <p className="py-16 text-center text-sm text-slate-400">
                                여행 기록을 불러오는 중입니다.
                            </p>
                        ) : scheduledItems.length === 0 &&
                          dayRecords.length === 0 ? (
                            <EmptyState
                                title={
                                    effectiveSelectedDay === 0
                                        ? '등록된 일정과 기록이 아직 없어요'
                                        : `DAY ${effectiveSelectedDay} 기록이 아직 없어요`
                                }
                                description="여행 중 사진과 메모를 일정별로 남겨보세요."
                            />
                        ) : (
                            <ScheduleRecordTimeline
                                items={scheduledItems}
                                records={dayRecords}
                                places={places}
                                canWrite={canWrite && effectiveSelectedDay > 0}
                                onPlaceClick={onPlaceClick}
                                onRecordAdd={openComposer}
                                onRecordEdit={openRecordEditor}
                                onRecordDelete={(recordId) =>
                                    void removeRecord(recordId)
                                }
                                onImageOpen={(images, index) =>
                                    setPreviewGallery({ images, index })
                                }
                            />
                        )}
                    </div>
                </div>
                <RecordSummary
                    days={days}
                    expenses={expenses}
                    currentMemberId={currentMemberId}
                    canWrite={canWrite}
                    completingKey={completingKey}
                    onOpenExpenses={onOpenExpenses}
                    onEditExpense={onEditExpense}
                    onCompleteParticipant={(expenseId, memberId) =>
                        void completeParticipant(expenseId, memberId)
                    }
                />
            </div>
            {composerOpen && (
                <RecordComposer
                    day={effectiveSelectedDay}
                    editing={editingRecordId != null}
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
                    onImagePreview={(images, index) =>
                        setPreviewGallery({ images, index })
                    }
                    onClose={() => {
                        setComposerOpen(false)
                        setEditingRecordId(null)
                    }}
                    onSave={() => void addRecord()}
                />
            )}

            {previewGallery && (
                <ImageGalleryModal
                    gallery={previewGallery}
                    onChange={setPreviewGallery}
                    onClose={() => setPreviewGallery(null)}
                />
            )}
        </div>
    )
}

function ScheduleRecordTimeline({
    items,
    records,
    places,
    canWrite,
    onPlaceClick,
    onRecordAdd,
    onRecordEdit,
    onRecordDelete,
    onImageOpen,
}: {
    items: ItineraryItem[]
    records: TravelRecord[]
    places: Place[]
    canWrite: boolean
    onPlaceClick: (placeId: string) => void
    onRecordAdd: (placeId?: string | null) => void
    onRecordEdit: (record: TravelRecord) => void
    onRecordDelete: (recordId: number) => void
    onImageOpen: (images: string[], index: number) => void
}) {
    const scheduledPlaceIds = new Set(
        items
            .map((item) => item.tripPlaceId)
            .filter((id): id is string => id != null)
            .map(String),
    )
    const unscheduledRecords = records.filter(
        (record) => !scheduledPlaceIds.has(String(record.tripPlaceId)),
    )

    return (
        <div className="pb-2">
            {items.map((item, index) => {
                const itemRecords = records.filter(
                    (record) =>
                        String(record.tripPlaceId) === String(item.tripPlaceId),
                )
                const record = itemRecords[0]
                const place = places.find(
                    (candidate) =>
                        String(candidate.id) === String(item.tripPlaceId),
                )
                const isLast =
                    index === items.length - 1 &&
                    unscheduledRecords.length === 0

                return (
                    <section
                        key={item.id}
                        className="relative pb-5 pl-10 last:pb-0"
                    >
                        {!isLast && (
                            <span className="absolute bottom-0 left-[15px] top-7 border-l-2 border-dashed border-brand-100" />
                        )}
                        <span
                            className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                                record
                                    ? 'border-brand bg-brand text-white'
                                    : 'border-dashed border-slate-300 bg-white text-slate-400'
                            }`}
                        >
                            {index + 1}
                        </span>
                        {!record ? (
                            <article className="flex min-h-24 items-center gap-3 rounded-[20px] border-2 border-dashed border-slate-300 bg-white px-5 py-4 transition hover:border-brand-200 hover:bg-brand-50/20 hover:shadow-sm">
                                <button
                                    type="button"
                                    onClick={() =>
                                        item.tripPlaceId &&
                                        onPlaceClick(item.tripPlaceId)
                                    }
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <strong className="block truncate text-base font-extrabold text-slate-900">
                                        {item.placeName ?? '일정 장소'}
                                    </strong>
                                    <span className="mt-2 block truncate text-sm text-slate-400">
                                        {item.categoryName ??
                                            place?.categoryName ??
                                            '기타'}{' '}
                                        ·{' '}
                                        {compactAddress(
                                            item.placeAddress ?? place?.address,
                                        )}
                                    </span>
                                </button>
                                <div className="flex shrink-0 items-center">
                                    {canWrite && item.tripPlaceId && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onRecordAdd(item.tripPlaceId)
                                            }
                                            className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-[11px] font-extrabold text-brand-700 transition hover:bg-brand hover:text-white"
                                        >
                                            기록 남기기
                                        </button>
                                    )}
                                </div>
                            </article>
                        ) : (
                            <article className="overflow-hidden rounded-[20px] border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(33,60,81,0.07)] transition hover:border-brand-100 hover:shadow-[0_6px_16px_rgba(33,60,81,0.11)]">
                                <div className="flex items-start justify-between gap-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            place && onPlaceClick(place.id)
                                        }
                                        className="min-w-0 text-left"
                                    >
                                        <strong className="block truncate text-lg font-extrabold text-slate-900">
                                            {item.placeName ??
                                                place?.name ??
                                                '일정 장소'}
                                        </strong>
                                        <span className="mt-1 block truncate text-xs text-slate-400">
                                            {item.categoryName ??
                                                place?.categoryName ??
                                                '기타'}{' '}
                                            ·{' '}
                                            {compactAddress(
                                                item.placeAddress ??
                                                    place?.address,
                                            )}
                                        </span>
                                    </button>
                                    {canWrite && (
                                        <div className="flex shrink-0 gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRecordEdit(record)
                                                }
                                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                aria-label="공동 기록 수정"
                                            >
                                                <PencilIcon size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRecordDelete(record.id)
                                                }
                                                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                                aria-label="공동 기록 삭제"
                                            >
                                                <Trash2Icon size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {record.memo && (
                                    <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                        {record.memo}
                                    </p>
                                )}
                                {record.imageUrls.length > 0 && (
                                    <PhotoGrid
                                        images={record.imageUrls}
                                        onOpen={onImageOpen}
                                    />
                                )}
                            </article>
                        )}
                    </section>
                )
            })}
            {unscheduledRecords.map((record, index) => (
                <section
                    key={record.id}
                    className="relative pb-5 pl-10 last:pb-0"
                >
                    <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-extrabold text-slate-500">
                        {items.length + index + 1}
                    </span>
                    <article className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_4px_12px_rgba(33,60,81,0.07)]">
                        <p className="text-xs font-extrabold text-slate-800">
                            {record.memberNickname}
                        </p>
                        {record.imageUrls.length > 0 && (
                            <PhotoGrid
                                images={record.imageUrls}
                                onOpen={onImageOpen}
                            />
                        )}
                        {record.memo && (
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {record.memo}
                            </p>
                        )}
                    </article>
                </section>
            ))}
        </div>
    )
}

function RecordSummary({
    days,
    expenses,
    currentMemberId,
    canWrite,
    completingKey,
    onOpenExpenses,
    onEditExpense,
    onCompleteParticipant,
}: {
    days: Array<{ day: number; date: string }>
    expenses: ExpenseResponse[]
    currentMemberId: number | null
    canWrite: boolean
    completingKey: string | null
    onOpenExpenses?: () => void
    onEditExpense?: (expense: ExpenseResponse) => void
    onCompleteParticipant: (expenseId: number, memberId: number) => void
}) {
    const [scopeMode, setScopeMode] = useState<'all' | 'byDay'>('all')
    const [selectedScopeDay, setSelectedScopeDay] = useState(
        () => days[0]?.day ?? 1,
    )
    const [statusView, setStatusView] = useState<'pending' | 'completed'>(
        'pending',
    )

    const scopedExpenses = useMemo(() => {
        if (scopeMode === 'all') return expenses
        return expenses.filter(
            (expense) => expense.dayNumber === selectedScopeDay,
        )
    }, [expenses, scopeMode, selectedScopeDay])
    const pendingExpenses = scopedExpenses.filter(
        (expense) => !isExpenseSettled(expense),
    )
    const completedExpenses = scopedExpenses.filter(isExpenseSettled)
    const visibleExpenses =
        scopeMode === 'byDay'
            ? scopedExpenses
            : statusView === 'pending'
              ? pendingExpenses
              : completedExpenses
    const { totalExpense, myReceivable, myPayable } = useMemo(
        () => summarizeExpenses(scopedExpenses, currentMemberId),
        [currentMemberId, scopedExpenses],
    )

    return (
        <aside className="hidden min-h-0 flex-col gap-3 overflow-hidden lg:flex">
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-white p-4 shadow-[0_6px_16px_rgba(33,60,81,0.10)]">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                        정산
                    </h3>
                    <div className="flex items-center rounded-full bg-slate-100 p-0.5 text-[10px] font-extrabold">
                        <button
                            type="button"
                            onClick={() => setScopeMode('all')}
                            className={`rounded-full px-2.5 py-1 transition ${scopeMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                        >
                            전체
                        </button>
                        <button
                            type="button"
                            onClick={() => setScopeMode('byDay')}
                            className={`rounded-full px-2.5 py-1 transition ${scopeMode === 'byDay' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                        >
                            Day별
                        </button>
                    </div>
                </div>
                {scopeMode === 'byDay' && (
                    <div className="mp-scroll mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                        {days.map((day) => (
                            <button
                                key={day.day}
                                type="button"
                                onClick={() => setSelectedScopeDay(day.day)}
                                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${selectedScopeDay === day.day ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                Day {day.day}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-[#213C51] p-3">
                        <p className="text-[10px] font-bold text-white/60">
                            총 지출
                        </p>
                        <strong className="mt-1 block text-lg font-black text-white">
                            {totalExpense.toLocaleString('ko-KR')}
                            <span className="ml-0.5 text-[10px] text-white/60">
                                원
                            </span>
                        </strong>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="rounded-xl bg-brand-50 px-3 py-2">
                            <p className="text-[9px] font-bold text-brand-500">
                                내가 받을 돈
                            </p>
                            <b className="mt-0.5 block text-sm text-brand-700">
                                +{myReceivable.toLocaleString('ko-KR')}
                            </b>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-[9px] font-bold text-slate-400">
                                내가 보낼 돈
                            </p>
                            <b className="mt-0.5 block text-sm text-slate-700">
                                {myPayable.toLocaleString('ko-KR')}
                            </b>
                        </div>
                    </div>
                </div>

                {scopeMode === 'all' && (
                    <div className="mt-3 flex items-center gap-4 border-b border-slate-100 text-xs font-extrabold">
                        <button
                            type="button"
                            onClick={() => setStatusView('pending')}
                            className={`relative pb-2 ${statusView === 'pending' ? 'text-slate-900' : 'text-slate-400'}`}
                        >
                            정산 대기 {pendingExpenses.length}
                            {statusView === 'pending' && (
                                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusView('completed')}
                            className={`relative pb-2 ${statusView === 'completed' ? 'text-slate-900' : 'text-slate-400'}`}
                        >
                            정산 완료 {completedExpenses.length}
                            {statusView === 'completed' && (
                                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />
                            )}
                        </button>
                    </div>
                )}

                <div className="mp-scroll mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {visibleExpenses.length === 0 && (
                        <p className="py-6 text-center text-[10px] font-bold text-slate-400">
                            {scopeMode === 'byDay'
                                ? '등록된 지출이 없습니다.'
                                : statusView === 'pending'
                                  ? '정산 대기 중인 지출이 없습니다.'
                                  : '정산 완료된 지출이 없습니다.'}
                        </p>
                    )}
                    {visibleExpenses.map((expense) => (
                        <ExpenseSettlementCard
                            key={expense.id}
                            expense={expense}
                            currentMemberId={currentMemberId}
                            canWrite={canWrite}
                            completingKey={completingKey}
                            onComplete={(memberId) =>
                                onCompleteParticipant(expense.id, memberId)
                            }
                            onEdit={() => onEditExpense?.(expense)}
                        />
                    ))}
                </div>
            </section>
            {onOpenExpenses && (
                <button
                    type="button"
                    onClick={onOpenExpenses}
                    className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-700"
                >
                    <PlusIcon size={15} /> 지출 추가
                </button>
            )}
        </aside>
    )
}

function RecordComposer({
    day,
    editing,
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
    onImagePreview,
    onClose,
    onSave,
}: {
    day: number
    editing: boolean
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
    onImagePreview: (images: string[], index: number) => void
    onClose: () => void
    onSave: () => void
}) {
    const [placeMenuOpen, setPlaceMenuOpen] = useState(false)
    const selectedPlace = places.find(
        (place) => String(place.id) === String(tripPlaceId),
    )
    const previewableImages = [
        ...selectedImages,
        ...selectedLocalPhotos.map((photo) => photo.previewUrl),
    ]
    const photoItems = [
        ...selectedImages.map((image) => ({
            key: image,
            image,
            localPhotoId: null as string | null,
        })),
        ...selectedLocalPhotos.map((photo) => ({
            key: photo.id,
            image: photo.previewUrl,
            localPhotoId: photo.id,
        })),
    ]

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="mp-scroll max-h-[calc(100dvh-32px)] w-full max-w-[560px] overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="record-dialog-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black tracking-[0.14em] text-brand-700">
                            {editing ? 'EDIT RECORD' : 'NEW RECORD'}
                        </p>
                        <h3
                            id="record-dialog-title"
                            className="mt-1 text-xl font-black"
                        >
                            DAY {day} 기록 {editing ? '수정' : '추가'}
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
                <label className="mt-7 block text-xs font-extrabold text-slate-800">
                    1. 어디였나요?
                </label>
                <div className="relative mt-2">
                    <button
                        type="button"
                        disabled={editing}
                        onClick={() => setPlaceMenuOpen((open) => !open)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left text-sm font-bold transition ${placeMenuOpen ? 'border-brand ring-4 ring-brand-50' : 'border-slate-200 hover:border-brand-200'} disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-500`}
                    >
                        <span className="truncate">
                            {selectedPlace?.name ??
                                '기록할 장소를 선택해 주세요'}
                        </span>
                        <ChevronDownIcon
                            size={17}
                            className={`shrink-0 text-slate-400 transition ${placeMenuOpen ? 'rotate-180' : ''}`}
                        />
                    </button>
                    {placeMenuOpen && !editing && (
                        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_12px_32px_rgba(33,60,81,0.16)]">
                            {places
                                .filter((place) => place.status === 'saved')
                                .map((place) => {
                                    const selected =
                                        String(place.id) === String(tripPlaceId)
                                    return (
                                        <button
                                            key={place.id}
                                            type="button"
                                            onClick={() => {
                                                onTripPlaceChange(
                                                    String(place.id),
                                                )
                                                setPlaceMenuOpen(false)
                                            }}
                                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${selected ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <span className="truncate">
                                                {place.name}
                                            </span>
                                            {selected && (
                                                <CheckIcon size={16} />
                                            )}
                                        </button>
                                    )
                                })}
                        </div>
                    )}
                </div>
                <p className="mt-6 text-xs font-extrabold text-slate-800">
                    2. 사진
                    <span className="float-right font-bold text-slate-400">
                        {selectedImages.length + selectedLocalPhotos.length} /
                        10
                    </span>
                </p>
                <div className="mp-scroll mt-2 flex snap-x gap-2 overflow-x-auto pb-2">
                    {photoItems.map((photo, index) => (
                        <div
                            key={photo.key}
                            className="group relative h-28 w-28 shrink-0 snap-start overflow-hidden rounded-xl bg-slate-100"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    onImagePreview(previewableImages, index)
                                }
                                className="h-full w-full"
                                aria-label={`${index + 1}번째 사진 미리보기`}
                            >
                                <img
                                    src={displayImageUrl(photo.image)}
                                    alt="추가한 여행 기록 사진"
                                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    photo.localPhotoId
                                        ? onLocalPhotoRemove(photo.localPhotoId)
                                        : onImageToggle(photo.image)
                                }
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/60 text-white transition hover:bg-slate-950/80"
                                aria-label="추가한 사진 삭제"
                            >
                                <XIcon size={12} />
                            </button>
                        </div>
                    ))}
                    <label className="flex h-28 w-28 shrink-0 cursor-pointer snap-start flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-brand-200 bg-brand-50 text-[11px] font-extrabold text-brand-700 transition hover:bg-brand-100">
                        <ImagePlusIcon size={17} />
                        {isUploading ? '업로드 중' : '사진 추가'}
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
                </div>
                <p className="mt-6 text-xs font-extrabold text-slate-800">
                    3. 메모
                </p>
                <textarea
                    value={memo}
                    onChange={(event) => onMemoChange(event.target.value)}
                    placeholder="이 일정에서 기억하고 싶은 내용을 남겨보세요."
                    maxLength={5000}
                    className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand-50"
                />
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
                    {isSaving
                        ? '저장 중...'
                        : editing
                          ? '수정 내용 저장'
                          : '기록 저장'}
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
    onOpen: (images: string[], index: number) => void
}) {
    const visibleImages = images.slice(0, 3)
    const extraCount = images.length - visibleImages.length
    return (
        <div
            className={`mt-4 grid overflow-hidden rounded-xl bg-slate-100 ${
                visibleImages.length === 1
                    ? 'grid-cols-1'
                    : visibleImages.length === 2
                      ? 'grid-cols-2 gap-1'
                      : 'h-64 grid-cols-[2fr_1fr] grid-rows-2 gap-0.5'
            }`}
        >
            {visibleImages.map((image, index) => (
                <button
                    key={`${image}-${index}`}
                    onClick={() => onOpen(images, index)}
                    className={`relative overflow-hidden ${
                        visibleImages.length === 1
                            ? 'h-64'
                            : visibleImages.length === 2
                              ? 'h-52'
                              : index === 0
                                ? 'row-span-2 h-64'
                                : 'h-[127px]'
                    }`}
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

function ImageGalleryModal({
    gallery,
    onChange,
    onClose,
}: {
    gallery: ImageGallery
    onChange: (gallery: ImageGallery) => void
    onClose: () => void
}) {
    const currentIndex = Math.min(gallery.index, gallery.images.length - 1)
    const move = (offset: number) => {
        const nextIndex =
            (currentIndex + offset + gallery.images.length) %
            gallery.images.length
        onChange({ ...gallery, index: nextIndex })
    }

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="여행 기록 사진 미리보기"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute right-5 top-5 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
                aria-label="사진 미리보기 닫기"
            >
                <XIcon size={22} />
            </button>
            {gallery.images.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            move(-1)
                        }}
                        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:left-8"
                        aria-label="이전 사진"
                    >
                        <ChevronLeftIcon size={26} />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            move(1)
                        }}
                        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-8"
                        aria-label="다음 사진"
                    >
                        <ChevronRightIcon size={26} />
                    </button>
                </>
            )}
            <div
                className="flex max-h-[88dvh] max-w-[calc(100vw-120px)] flex-col items-center"
                onClick={(event) => event.stopPropagation()}
            >
                <img
                    src={displayImageUrl(gallery.images[currentIndex])}
                    alt={`${currentIndex + 1}번째 여행 기록 사진`}
                    className="max-h-[78dvh] max-w-full rounded-2xl object-contain shadow-2xl"
                />
                <div className="mt-4 flex max-w-full snap-x gap-2 overflow-x-auto rounded-2xl bg-slate-950/35 p-2">
                    {gallery.images.map((image, index) => (
                        <button
                            key={`${image}-${index}`}
                            type="button"
                            onClick={() => onChange({ ...gallery, index })}
                            className={`h-14 w-14 shrink-0 snap-center overflow-hidden rounded-xl border-2 transition ${index === currentIndex ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            aria-label={`${index + 1}번째 사진 보기`}
                        >
                            <img
                                src={displayImageUrl(image)}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
                <span className="mt-2 text-xs font-bold text-white/75">
                    {currentIndex + 1} / {gallery.images.length}
                </span>
            </div>
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

function compactAddress(value: string | null | undefined) {
    if (!value) return '주소 미정'
    const parts = value
        .split(/\s+/)
        .filter(Boolean)
        .filter((part) => part !== '대한민국')
    return parts.slice(0, 2).join(' ') || value
}

function displayImageUrl(imageUrl: string) {
    return imageUrl.startsWith('/uploads/')
        ? (resolveMediaUrl(imageUrl) ?? imageUrl)
        : imageUrl
}

function isVisitedAtRangeMessage(message: string) {
    return message === '방문 일시는 여행 기간 안이어야 합니다.'
}

function summarizeExpenses(
    expenses: ExpenseResponse[],
    currentMemberId: number | null,
) {
    let totalExpense = 0
    let myReceivable = 0
    let myPayable = 0
    for (const expense of expenses) {
        totalExpense += expense.totalAmount
        if (expense.payerId === currentMemberId) {
            myReceivable += expense.participants
                .filter(
                    (participant) =>
                        participant.memberId !== expense.payerId &&
                        participant.status === 'PENDING',
                )
                .reduce((sum, participant) => sum + participant.shareAmount, 0)
        } else {
            const mine = expense.participants.find(
                (participant) => participant.memberId === currentMemberId,
            )
            if (mine && mine.status === 'PENDING') myPayable += mine.shareAmount
        }
    }
    return { totalExpense, myReceivable, myPayable }
}
