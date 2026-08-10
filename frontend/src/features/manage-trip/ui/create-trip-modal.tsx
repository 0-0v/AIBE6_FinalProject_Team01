import { FormEvent, useState } from 'react'
import { XIcon } from 'lucide-react'
import { errorMessage } from '@/shared/lib'
import {
    createTrip,
    setTripCoverImagePreset,
    uploadTripCoverImage,
    type TravelStyle,
} from '../api/trip-api'
import { pickRandomTripCoverPreset } from '../model/trip-cover-presets'
import {
    TripCoverImageField,
    type TripCoverMode,
} from './trip-cover-image-field'
import {
    DestinationAutocomplete,
    type DestinationResult,
} from './destination-autocomplete'
import { TripEmailInvitationStep } from './trip-email-invitation-step'
import { MAX_TRAVEL_STYLE_COUNT } from '../model/travel-style-policy'
import { TravelStyleSelector } from './travel-style-selector'

type Props = {
    onClose: () => void
    onCreated: (tripId: number) => void
    requireDates?: boolean
    inviteAfterCreate?: boolean
}

export function CreateTripModal({
    onClose,
    onCreated,
    requireDates = false,
    inviteAfterCreate = true,
}: Props) {
    const [title, setTitle] = useState('')
    const [travelStyles, setTravelStyles] = useState<TravelStyle[]>([])
    const [destinationText, setDestinationText] = useState('')
    const [destinationResult, setDestinationResult] =
        useState<DestinationResult | null>(null)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [coverMode, setCoverMode] = useState<TripCoverMode>('preset')
    const [coverPreset, setCoverPreset] = useState(() =>
        pickRandomTripCoverPreset(),
    )
    const [coverImage, setCoverImage] = useState<File | null>(null)
    const [createdTripId, setCreatedTripId] = useState<number | null>(null)
    const [showInvitationStep, setShowInvitationStep] = useState(false)
    function toggleStyle(style: TravelStyle) {
        setTravelStyles((current) => {
            if (current.includes(style)) {
                return current.filter((item) => item !== style)
            }
            if (current.length >= MAX_TRAVEL_STYLE_COUNT) return current
            return [...current, style]
        })
    }

    async function submit(event: FormEvent) {
        event.preventDefault()
        const normalizedTitle = title.trim()
        if (!normalizedTitle) {
            setError('여행방 이름을 입력해 주세요.')
            return
        }
        if (travelStyles.length > MAX_TRAVEL_STYLE_COUNT) {
            setError(
                `여행 스타일은 최대 ${MAX_TRAVEL_STYLE_COUNT}개까지 선택할 수 있습니다.`,
            )
            return
        }
        if ((startDate && !endDate) || (!startDate && endDate)) {
            setError('여행 시작일과 종료일을 함께 입력해 주세요.')
            return
        }
        if (requireDates && (!startDate || !endDate)) {
            setError('일정을 담으려면 여행 시작일과 종료일을 입력해 주세요.')
            return
        }
        if (startDate && endDate < startDate) {
            setError('종료일은 시작일보다 빠를 수 없습니다.')
            return
        }
        if (coverMode === 'upload' && !coverImage) {
            setError('이미지를 선택하거나 기본 이미지를 사용해 주세요.')
            return
        }
        setIsSubmitting(true)
        setError(null)
        try {
            const tripId =
                createdTripId ??
                (
                    await createTrip({
                        title: normalizedTitle,
                        travelStyles,
                        destination:
                            destinationResult?.name ??
                            (destinationText.trim() || null),
                        destinationLat: destinationResult?.lat ?? null,
                        destinationLng: destinationResult?.lng ?? null,
                        destinationEnglishName:
                            destinationResult?.englishName ?? null,
                        destinationCountryCode:
                            destinationResult?.countryCode ?? null,
                        startDate: startDate || null,
                        endDate: endDate || null,
                    })
                ).id
            setCreatedTripId(tripId)
            if (coverMode === 'upload' && coverImage) {
                await uploadTripCoverImage(tripId, coverImage)
            } else {
                await setTripCoverImagePreset(tripId, coverPreset.key)
            }
            if (inviteAfterCreate) {
                setShowInvitationStep(true)
            } else {
                onCreated(tripId)
            }
        } catch (caught) {
            setError(errorMessage(caught, '여행방을 생성하지 못했습니다.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (showInvitationStep && createdTripId != null) {
        return (
            <TripEmailInvitationStep
                tripId={createdTripId}
                onComplete={() => onCreated(createdTripId)}
            />
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
            <form
                onSubmit={submit}
                className="mp-scroll max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl md:overflow-visible"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
                    <h2 className="text-xl font-extrabold">새 여행방</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="bg-slate-50 p-5 md:rounded-bl-3xl md:p-6">
                        <TripCoverImageField
                            mode={coverMode}
                            onModeChange={setCoverMode}
                            presetUrl={coverPreset.url}
                            onReroll={() =>
                                setCoverPreset((current) =>
                                    pickRandomTripCoverPreset(current.key),
                                )
                            }
                            file={coverImage}
                            disabled={isSubmitting}
                            compact
                            onFileChange={setCoverImage}
                        />
                    </div>

                    <div className="p-5 md:p-6">
                        <label className="block text-sm font-bold">
                            여행방 이름 <span className="text-brand">*</span>
                            <input
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                maxLength={100}
                                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-brand"
                                placeholder="예: 제주 가족 여행"
                            />
                        </label>

                        <TravelStyleSelector
                            selectedStyles={travelStyles}
                            onToggle={toggleStyle}
                        />

                        <label className="mt-3.5 block text-sm font-bold">
                            어디로 떠나시나요?
                            <DestinationAutocomplete
                                value={destinationText}
                                onChange={(result, text) => {
                                    setDestinationResult(result)
                                    setDestinationText(text)
                                }}
                            />
                            <span className="mt-1 block text-[11px] font-normal text-slate-400">
                                목적지를 선택하면 지도가 해당 위치로 맞춰져요.
                            </span>
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
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
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
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
                                />
                            </label>
                        </div>

                        {error && (
                            <p className="mt-3 text-sm font-semibold text-red-500">
                                {error}
                            </p>
                        )}
                        <button
                            disabled={isSubmitting}
                            className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-60"
                        >
                            {isSubmitting ? '생성 중...' : '여행방 만들기'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
