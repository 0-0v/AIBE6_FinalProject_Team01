import { FormEvent, useState } from 'react'
import { XIcon } from 'lucide-react'
import {
    createTrip,
    uploadTripCoverImage,
    type CompanionType,
    type TravelStyle,
    type TravelPace,
} from '../api/trip-api'
import { TripCoverImageField } from './trip-cover-image-field'

const PACES: { value: TravelPace; label: string; desc: string }[] = [
    { value: 'FAST', label: '빠르게', desc: '일정을 빽빽하게 채워요' },
    { value: 'NORMAL', label: '보통', desc: '무난한 속도로 즐겨요' },
    { value: 'RELAXED', label: '여유롭게', desc: '여유롭게 충분히 머물러요' },
]

const COMPANIONS: { value: CompanionType; label: string }[] = [
    { value: 'ALONE', label: '혼자' },
    { value: 'FRIENDS', label: '친구와' },
    { value: 'COUPLE', label: '연인과' },
    { value: 'SPOUSE', label: '배우자와' },
    { value: 'CHILDREN', label: '아이와' },
    { value: 'PARENTS', label: '부모님과' },
]

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
    onClose: () => void
    onCreated: (tripId: number) => void
    requireDates?: boolean
}

export function CreateTripModal({
    onClose,
    onCreated,
    requireDates = false,
}: Props) {
    const [title, setTitle] = useState('')
    const [companionType, setCompanionType] = useState<CompanionType | ''>('')
    const [travelStyles, setTravelStyles] = useState<TravelStyle[]>([])
    const [destination, setDestination] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [coverImage, setCoverImage] = useState<File | null>(null)
    const [createdTripId, setCreatedTripId] = useState<number | null>(null)
    const [dayStartTime, setDayStartTime] = useState('09:00')
    const [dayEndTime, setDayEndTime] = useState('21:00')
    const [travelPace, setTravelPace] = useState<TravelPace>('NORMAL')

    function toggleStyle(style: TravelStyle) {
        setTravelStyles((current) =>
            current.includes(style)
                ? current.filter((item) => item !== style)
                : [...current, style],
        )
    }

    async function submit(event: FormEvent) {
        event.preventDefault()
        const normalizedTitle = title.trim()
        if (!normalizedTitle) {
            setError('여행방 이름을 입력해 주세요.')
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

        setIsSubmitting(true)
        setError(null)
        try {
            const tripId =
                createdTripId ??
                (
                    await createTrip({
                        title: normalizedTitle,
                        companionType: companionType || null,
                        travelStyles,
                        destination: destination.trim() || null,
                        startDate: startDate || null,
                        endDate: endDate || null,
                        dayStartTime,
                        dayEndTime,
                        travelPace,
                    })
                ).id
            setCreatedTripId(tripId)
            if (coverImage) {
                await uploadTripCoverImage(tripId, coverImage)
            }
            onCreated(tripId)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '여행방을 생성하지 못했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
            <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold">새 여행방</h2>
                    <button type="button" onClick={onClose} aria-label="닫기" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                        <XIcon size={18} />
                    </button>
                </div>

                <TripCoverImageField
                    file={coverImage}
                    disabled={isSubmitting}
                    onFileChange={setCoverImage}
                />

                <label className="mt-5 block text-sm font-bold">
                    여행방 이름 <span className="text-brand">*</span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-brand" placeholder="예: 제주 가족 여행" />
                </label>

                <label className="mt-4 block text-sm font-bold">
                    누구와
                    <select value={companionType} onChange={(event) => setCompanionType(event.target.value as CompanionType | '')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal">
                        <option value="">선택 안 함</option>
                        {COMPANIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>

                <fieldset className="mt-4">
                    <legend className="text-sm font-bold">여행 스타일</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {STYLES.map((style) => (
                            <button key={style.value} type="button" onClick={() => toggleStyle(style.value)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${travelStyles.includes(style.value) ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {style.label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <label className="mt-4 block text-sm font-bold">
                    어디로 떠나시나요?
                    <input value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" placeholder="예: 오사카, 제주도, 부산 해운대" />
                    <span className="mt-1.5 block text-xs font-normal text-slate-400">
                        입력한 지역 주변으로 여행 지도를 준비해 드릴게요.
                    </span>
                </label>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-sm font-bold">시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
                    <label className="text-sm font-bold">종료일<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-sm font-bold">하루 시작 시간<input type="time" value={dayStartTime} onChange={(e) => setDayStartTime(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
                    <label className="text-sm font-bold">하루 종료 시간<input type="time" value={dayEndTime} onChange={(e) => setDayEndTime(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
                </div>

                <fieldset className="mt-4">
                    <legend className="text-sm font-bold">여행 페이스</legend>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                        {PACES.map((p) => (
                            <button key={p.value} type="button" onClick={() => setTravelPace(p.value)}
                                className={`rounded-xl border px-2 py-2 text-center text-xs font-bold transition-colors ${travelPace === p.value ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500'}`}>
                                <div>{p.label}</div>
                                <div className={`mt-0.5 text-[10px] font-normal ${travelPace === p.value ? 'text-white/80' : 'text-slate-400'}`}>{p.desc}</div>
                            </button>
                        ))}
                    </div>
                </fieldset>

                {error && <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>}
                <button disabled={isSubmitting} className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-60">
                    {isSubmitting ? '생성 중...' : '여행방 만들기'}
                </button>
            </form>
        </div>
    )
}
