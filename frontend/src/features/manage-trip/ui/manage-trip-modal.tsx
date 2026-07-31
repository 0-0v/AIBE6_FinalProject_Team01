import { FormEvent, useState } from 'react'
import { LogOutIcon, Trash2Icon, XIcon } from 'lucide-react'
import {
    deleteTrip,
    leaveTrip,
    confirmTripCompletion,
    type CompanionType,
    type TravelStyle,
    type TravelPace,
    type TripResponse,
    updateTrip,
    updateTripVisibility,
    uploadTripCoverImage,
} from '../api/trip-api'
import { TripCoverImageField } from './trip-cover-image-field'

const PACES: { value: TravelPace; label: string; desc: string }[] = [
    { value: 'FAST', label: '빠르게', desc: '일정을 빽빽하게 채워요' },
    { value: 'NORMAL', label: '보통', desc: '무난한 속도로 즐겨요' },
    { value: 'RELAXED', label: '여유롭게', desc: '여유롭게 충분히 머물러요' },
]

const COMPANIONS: { value: CompanionType; label: string }[] = [
    { value: 'ALONE', label: '혼자' }, { value: 'FRIENDS', label: '친구와' },
    { value: 'COUPLE', label: '연인과' }, { value: 'SPOUSE', label: '배우자와' },
    { value: 'CHILDREN', label: '아이와' }, { value: 'PARENTS', label: '부모님과' },
]
const STYLES: { value: TravelStyle; label: string }[] = [
    { value: 'ACTIVITY', label: '액티비티' }, { value: 'SNS_HOT_PLACE', label: 'SNS 핫플레이스' },
    { value: 'NATURE', label: '자연과 함께' }, { value: 'FAMOUS_ATTRACTIONS', label: '유명관광지 필수' },
    { value: 'RELAXATION', label: '여유롭게 힐링' }, { value: 'CULTURE_ART_HISTORY', label: '문화/예술/역사' },
    { value: 'SHOPPING', label: '쇼핑' }, { value: 'FOOD', label: '맛집 먹거리' },
]

type Props = { trip: TripResponse; onClose: () => void; onChanged: () => void }

export function ManageTripModal({ trip, onClose, onChanged }: Props) {
    const [title, setTitle] = useState(trip.title)
    const [companionType, setCompanionType] = useState<CompanionType | ''>(trip.companionType ?? '')
    const [styles, setStyles] = useState<TravelStyle[]>(trip.travelStyles)
    const [destination, setDestination] = useState(trip.destination ?? '')
    const [startDate, setStartDate] = useState(trip.startDate ?? '')
    const [endDate, setEndDate] = useState(trip.endDate ?? '')
    const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>(
        trip.visibility,
    )
    const [confirmExit, setConfirmExit] = useState(false)
    const [tags, setTags] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [coverImage, setCoverImage] = useState<File | null>(null)
    const [dayStartTime, setDayStartTime] = useState(trip.dayStartTime ?? '09:00')
    const [dayEndTime, setDayEndTime] = useState(trip.dayEndTime ?? '21:00')
    const [travelPace, setTravelPace] = useState<TravelPace>(trip.travelPace ?? 'NORMAL')

    function toggleStyle(style: TravelStyle) {
        setStyles((current) => current.includes(style) ? current.filter((item) => item !== style) : [...current, style])
    }

    async function save(event: FormEvent) {
        event.preventDefault()
        if (!title.trim()) return setError('여행방 이름을 입력해 주세요.')
        if ((startDate && !endDate) || (!startDate && endDate)) return setError('여행 기간을 함께 입력해 주세요.')
        if (startDate && endDate < startDate) return setError('종료일은 시작일보다 빠를 수 없습니다.')
        const normalizedTags = tags
            .split(/[#,]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        if (
            trip.status === 'COMPLETED' &&
            visibility === 'PUBLIC' &&
            trip.visibility === 'PRIVATE' &&
            normalizedTags.length === 0
        ) {
            return setError('공개할 여행방의 태그를 한 개 이상 입력해 주세요.')
        }
        setBusy(true); setError(null)
        try {
            if (trip.status !== 'COMPLETED') {
                await updateTrip(trip.id, {
                    title: title.trim(), companionType: companionType || null, travelStyles: styles,
                    destination: destination.trim() || null, startDate: startDate || null, endDate: endDate || null,
                    dayStartTime, dayEndTime, travelPace,
                })
            }
            if (visibility !== trip.visibility) {
                if (trip.status === 'COMPLETED' && visibility === 'PUBLIC') {
                    await confirmTripCompletion(
                        trip.id,
                        visibility,
                        normalizedTags,
                    )
                } else {
                    await updateTripVisibility(trip.id, visibility)
                }
            }
            if (coverImage) {
                await uploadTripCoverImage(trip.id, coverImage)
            }
            onChanged()
        } catch (caught) { setError(message(caught)) } finally { setBusy(false) }
    }

    const isOnlyMember = trip.memberCount === 1

    async function exitTrip() {
        setBusy(true); setError(null)
        try {
            if (isOnlyMember) {
                await deleteTrip(trip.id)
            } else {
                await leaveTrip(trip.id)
            }
            onChanged()
        }
        catch (caught) { setError(message(caught)); setBusy(false) }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
            <form onSubmit={save} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">여행방 관리</h2><button type="button" onClick={onClose} aria-label="닫기"><XIcon size={19} /></button></div>
                <TripCoverImageField
                    file={coverImage}
                    currentImageUrl={trip.coverImageUrl}
                    disabled={busy}
                    onFileChange={setCoverImage}
                />
                <label className="mt-5 block text-sm font-bold">여행방 이름<input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
                <label className="mt-4 block text-sm font-bold">누구와<select value={companionType} onChange={(event) => setCompanionType(event.target.value as CompanionType | '')} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"><option value="">선택 안 함</option>{COMPANIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <fieldset className="mt-4"><legend className="text-sm font-bold">여행 스타일</legend><div className="mt-2 flex flex-wrap gap-2">{STYLES.map((style) => <button key={style.value} type="button" onClick={() => toggleStyle(style.value)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${styles.includes(style.value) ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>{style.label}</button>)}</div></fieldset>
                <label className="mt-4 block text-sm font-bold">여행 장소<input value={destination} maxLength={100} onChange={(event) => setDestination(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
                <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-bold">시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label><label className="text-sm font-bold">종료일<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label></div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-sm font-bold">하루 시작 시간<input type="time" value={dayStartTime} onChange={(e) => setDayStartTime(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
                    <label className="text-sm font-bold">하루 종료 시간<input type="time" value={dayEndTime} onChange={(e) => setDayEndTime(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
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
                {trip.status === 'COMPLETED' && (
                    <fieldset className="mt-4">
                        <legend className="text-sm font-bold">여행방 공개 설정</legend>
                        <p className="mt-1 text-xs text-slate-400">
                            완료된 여행방의 공개 여부를 변경할 수 있습니다.
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setVisibility('PRIVATE')}
                                className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${
                                    visibility === 'PRIVATE'
                                        ? 'border-slate-700 bg-slate-800 text-white'
                                        : 'border-slate-200 bg-white text-slate-500'
                                }`}
                            >
                                비공개
                            </button>
                            <button
                                type="button"
                                onClick={() => setVisibility('PUBLIC')}
                                className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${
                                    visibility === 'PUBLIC'
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-slate-200 bg-white text-slate-500'
                                }`}
                            >
                                공개
                            </button>
                        </div>
                    </fieldset>
                )}
                {trip.status === 'COMPLETED' &&
                    visibility === 'PUBLIC' &&
                    trip.visibility === 'PRIVATE' && (
                        <label className="mt-4 block text-sm font-bold">
                            여행방 태그
                            <input
                                value={tags}
                                onChange={(event) => setTags(event.target.value)}
                                placeholder="#둘이서, #힐링여행"
                                className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                            />
                        </label>
                    )}
                <button disabled={busy || (trip.status === 'COMPLETED' && !coverImage && visibility === trip.visibility)} className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50">변경사항 저장</button>

                <section className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
                    {confirmExit ? (
                        <div>
                            <p className="text-xs font-bold leading-5 text-red-700">
                                {isOnlyMember
                                    ? '여행방을 삭제하면 장소와 여행 기록을 더 이상 볼 수 없습니다. 삭제하시겠습니까?'
                                    : '여행방을 나가면 장소와 여행 기록을 더 이상 볼 수 없습니다. 나가시겠습니까?'}
                            </p>
                            <div className="mt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmExit(false)}
                                    disabled={busy}
                                    className="text-xs font-bold text-slate-600"
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
            </form>
        </div>
    )
}

function message(error: unknown) {
    return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}
