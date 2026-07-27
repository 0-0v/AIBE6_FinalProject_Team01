import { FormEvent, useState } from 'react'
import { CheckCircle2Icon, Trash2Icon, XIcon } from 'lucide-react'
import {
    completeTrip,
    deleteTrip,
    type CompanionType,
    type TravelStyle,
    type TripResponse,
    updateTrip,
    uploadTripCoverImage,
} from '../api/trip-api'
import { TripCoverImageField } from './trip-cover-image-field'

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
    const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE')
    const [tags, setTags] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmComplete, setConfirmComplete] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [coverImage, setCoverImage] = useState<File | null>(null)

    function toggleStyle(style: TravelStyle) {
        setStyles((current) => current.includes(style) ? current.filter((item) => item !== style) : [...current, style])
    }

    async function save(event: FormEvent) {
        event.preventDefault()
        if (!title.trim()) return setError('여행방 이름을 입력해 주세요.')
        if ((startDate && !endDate) || (!startDate && endDate)) return setError('여행 기간을 함께 입력해 주세요.')
        if (startDate && endDate < startDate) return setError('종료일은 시작일보다 빠를 수 없습니다.')
        setBusy(true); setError(null)
        try {
            if (trip.status !== 'COMPLETED') {
                await updateTrip(trip.id, {
                    title: title.trim(), companionType: companionType || null, travelStyles: styles,
                    destination: destination.trim() || null, startDate: startDate || null, endDate: endDate || null,
                })
            }
            if (coverImage) {
                await uploadTripCoverImage(trip.id, coverImage)
            }
            onChanged()
        } catch (caught) { setError(message(caught)) } finally { setBusy(false) }
    }

    async function remove() {
        setBusy(true); setError(null)
        try { await deleteTrip(trip.id); onChanged() }
        catch (caught) { setError(message(caught)); setBusy(false) }
    }

    async function complete() {
        setBusy(true); setError(null)
        try {
            const normalizedTags = tags.split(/[#,]/).map((tag) => tag.trim()).filter(Boolean)
            await completeTrip(trip.id, visibility, normalizedTags)
            onChanged()
        } catch (caught) { setError(message(caught)); setBusy(false) }
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
                {error && <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>}
                <button disabled={busy || (trip.status === 'COMPLETED' && !coverImage)} className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50">변경사항 저장</button>

                {trip.status !== 'COMPLETED' && <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-800"><CheckCircle2Icon size={16} /> 여행 완료</h3><div className="mt-3 flex gap-2"><button type="button" onClick={() => setVisibility('PRIVATE')} className={`rounded-lg px-3 py-2 text-xs font-bold ${visibility === 'PRIVATE' ? 'bg-slate-800 text-white' : 'bg-white'}`}>카드 비공개</button><button type="button" onClick={() => setVisibility('PUBLIC')} className={`rounded-lg px-3 py-2 text-xs font-bold ${visibility === 'PUBLIC' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>카드 공개</button></div><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="#친구와, #액티비티" className="mt-3 w-full rounded-xl border border-emerald-200 px-3 py-2.5 text-sm" />{confirmComplete ? <div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void complete()} className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white">완료 확정</button><button type="button" onClick={() => setConfirmComplete(false)} className="rounded-lg bg-white px-3 text-xs font-bold">취소</button></div> : <button type="button" onClick={() => setConfirmComplete(true)} className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white">여행 완료 처리</button>}</section>}

                <section className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">{confirmDelete ? <div className="flex items-center gap-2"><p className="flex-1 text-xs font-bold text-red-700">삭제하면 목록에서 사라집니다.</p><button type="button" disabled={busy} onClick={() => void remove()} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">삭제 확정</button><button type="button" onClick={() => setConfirmDelete(false)} className="text-xs font-bold">취소</button></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-xs font-bold text-red-600"><Trash2Icon size={14} /> 여행방 삭제</button>}</section>
            </form>
        </div>
    )
}

function message(error: unknown) {
    return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}
