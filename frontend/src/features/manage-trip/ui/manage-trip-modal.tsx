import { FormEvent, useState } from 'react'
import { LogOutIcon, Trash2Icon, XIcon } from 'lucide-react'
import { errorMessage } from '@/shared/lib'
import {
    deleteTrip,
    leaveTrip,
    type TravelStyle,
    type TripResponse,
    updateTrip,
    uploadTripCoverImage,
} from '../api/trip-api'
import { TripCoverImageField } from './trip-cover-image-field'
import {
    DestinationAutocomplete,
    type DestinationResult,
} from './destination-autocomplete'

const STYLES: { value: TravelStyle; label: string }[] = [
    { value: 'ACTIVITY', label: '액티비티' },
    { value: 'SNS_HOT_PLACE', label: 'SNS 핫플레이스' },
    { value: 'NATURE', label: '자연과 함께' },
    { value: 'FAMOUS_ATTRACTIONS', label: '유명관광지 필수' },
    { value: 'RELAXATION', label: '여유롭게 힐링' },
    { value: 'CULTURE_ART_HISTORY', label: '문화/예술/역사' },
    { value: 'SHOPPING', label: '쇼핑' },
    { value: 'FOOD', label: '맛집 먹거리' },
]

type Props = {
    trip: TripResponse
    onClose: () => void
    onChanged: () => void | Promise<void>
}

export function ManageTripModal({ trip, onClose, onChanged }: Props) {
    const [title, setTitle] = useState(trip.title)
    const [styles, setStyles] = useState<TravelStyle[]>(trip.travelStyles)
    const [destinationText, setDestinationText] = useState(
        trip.destination ?? '',
    )
    const [destinationResult, setDestinationResult] =
        useState<DestinationResult | null>(null)
    const [startDate, setStartDate] = useState(trip.startDate ?? '')
    const [endDate, setEndDate] = useState(trip.endDate ?? '')
    const [confirmExit, setConfirmExit] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [coverImage, setCoverImage] = useState<File | null>(null)
    function toggleStyle(style: TravelStyle) {
        setStyles((current) =>
            current.includes(style)
                ? current.filter((item) => item !== style)
                : [...current, style],
        )
    }

    function validateForm(): boolean {
        if (!title.trim()) {
            setError('여행방 이름을 입력해 주세요.')
            return false
        }
        if ((startDate && !endDate) || (!startDate && endDate)) {
            setError('여행 기간을 함께 입력해 주세요.')
            return false
        }
        if (startDate && endDate < startDate) {
            setError('종료일은 시작일보다 빠를 수 없습니다.')
            return false
        }
        return true
    }

    async function persistChanges() {
        setBusy(true)
        setError(null)
        try {
            if (trip.status !== 'COMPLETED') {
                await updateTrip(trip.id, {
                    title: title.trim(),
                    travelStyles: styles,
                    destination:
                        destinationResult?.name ??
                        (destinationText.trim() || null),
                    destinationLat:
                        destinationResult?.lat ??
                        (destinationText === trip.destination
                            ? trip.destinationLat
                            : null),
                    destinationLng:
                        destinationResult?.lng ??
                        (destinationText === trip.destination
                            ? trip.destinationLng
                            : null),
                    destinationEnglishName:
                        destinationResult?.englishName ??
                        (destinationText === trip.destination
                            ? trip.destinationEnglishName
                            : null),
                    destinationCountryCode:
                        destinationResult?.countryCode ??
                        (destinationText === trip.destination
                            ? trip.destinationCountryCode
                            : null),
                    startDate: startDate || null,
                    endDate: endDate || null,
                })
            }
            if (coverImage) {
                await uploadTripCoverImage(trip.id, coverImage)
            }
            await onChanged()
        } catch (caught) {
            setError(errorMessage(caught))
        } finally {
            setBusy(false)
        }
    }

    function save(event: FormEvent) {
        event.preventDefault()
        if (!validateForm()) return

        void persistChanges()
    }

    const isOnlyMember = trip.memberCount === 1

    async function exitTrip() {
        setBusy(true)
        setError(null)
        try {
            if (isOnlyMember) {
                await deleteTrip(trip.id)
            } else {
                await leaveTrip(trip.id)
            }
            onChanged()
        } catch (caught) {
            setError(errorMessage(caught))
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
            <form
                onSubmit={save}
                className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl md:overflow-visible"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
                    <h2 className="text-xl font-extrabold">여행방 관리</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <XIcon size={19} />
                    </button>
                </div>
                <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="flex flex-col bg-slate-50 p-5 md:rounded-bl-3xl md:p-6">
                        <TripCoverImageField
                            file={coverImage}
                            currentImageUrl={trip.coverImageUrl}
                            disabled={busy}
                            compact
                            onFileChange={setCoverImage}
                        />

                        <section className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3.5 md:mt-auto">
                            {confirmExit ? (
                                <div>
                                    <p className="break-keep text-xs font-bold leading-5 text-red-700">
                                        {isOnlyMember
                                            ? '여행방을 삭제하면 장소와 여행 기록을 더 이상 볼 수 없습니다.'
                                            : '여행방을 나가면 장소와 여행 기록을 더 이상 볼 수 없습니다.'}
                                    </p>
                                    <div className="mt-2.5 flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfirmExit(false)
                                            }
                                            disabled={busy}
                                            className="px-2 text-xs font-bold text-slate-600"
                                        >
                                            취소
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void exitTrip()}
                                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                            {busy
                                                ? '처리 중...'
                                                : isOnlyMember
                                                  ? '여행 삭제'
                                                  : '여행 나가기'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmExit(true)}
                                    className="flex items-center gap-2 text-xs font-bold text-red-600"
                                >
                                    {isOnlyMember ? (
                                        <Trash2Icon size={14} />
                                    ) : (
                                        <LogOutIcon size={14} />
                                    )}
                                    {isOnlyMember ? '여행 삭제' : '여행 나가기'}
                                </button>
                            )}
                        </section>
                    </div>

                    <div className="p-5 md:p-6">
                        <label className="block text-sm font-bold">
                            여행방 이름
                            <input
                                value={title}
                                maxLength={100}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                            />
                        </label>
                        <fieldset className="mt-3.5">
                            <legend className="text-sm font-bold">
                                여행 스타일
                            </legend>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {STYLES.map((style) => (
                                    <button
                                        key={style.value}
                                        type="button"
                                        onClick={() => toggleStyle(style.value)}
                                        className={`rounded-full px-2.5 py-1.5 text-xs font-bold ${styles.includes(style.value) ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}
                                    >
                                        {style.label}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        <label className="mt-3.5 block text-sm font-bold">
                            여행 장소
                            <DestinationAutocomplete
                                value={destinationText}
                                onChange={(result, text) => {
                                    setDestinationResult(result)
                                    setDestinationText(text)
                                }}
                                placeholder="예: 오사카, 제주도, 파리"
                            />
                        </label>
                        <div className="mt-3.5 grid grid-cols-2 gap-3">
                            <label className="text-sm font-bold">
                                시작일
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(event) =>
                                        setStartDate(event.target.value)
                                    }
                                    className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                                />
                            </label>
                            <label className="text-sm font-bold">
                                종료일
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate || undefined}
                                    onChange={(event) =>
                                        setEndDate(event.target.value)
                                    }
                                    className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                                />
                            </label>
                        </div>
                        {error && (
                            <p className="mt-3 text-sm font-semibold text-red-500">
                                {error}
                            </p>
                        )}
                        <button
                            disabled={
                                busy ||
                                (trip.status === 'COMPLETED' && !coverImage)
                            }
                            className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50"
                        >
                            변경사항 저장
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
