import React, { useMemo, useState } from 'react'
import {
    CalendarDaysIcon,
    Clock3Icon,
    GripVerticalIcon,
    PlusIcon,
    RouteIcon,
    SparklesIcon,
} from 'lucide-react'
import { Place } from '@/entities/trip'

type Props = { places: Place[] }

type ScheduleItem = { id: string; time: string; place: Place }

export function ItineraryPanel({ places }: Props) {
    const saved = useMemo(
        () => places.filter((place) => place.status === 'saved'),
        [places],
    )
    const [items, setItems] = useState<ScheduleItem[]>(() =>
        saved.slice(0, 2).map((place, index) => ({
            id: `${place.id}-${index}`,
            time: index === 0 ? '09:00' : '13:30',
            place,
        })),
    )
    const [draftId, setDraftId] = useState('')
    const [route, setRoute] = useState<'none' | 'first' | 'second'>('none')

    function addPlace() {
        const place = saved.find((item) => item.id === draftId)
        if (!place || items.some((item) => item.place.id === place.id)) return
        setItems((current) => [
            ...current,
            { id: `${place.id}-${Date.now()}`, time: '16:00', place },
        ])
        setDraftId('')
    }

    return (
        <div className="mp-scroll flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-brand-700">DAY 1</p>
                    <h3 className="mt-0.5 text-sm font-extrabold">
                        8월 12일 · 제주 동부
                    </h3>
                </div>
                <button className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700">
                    <CalendarDaysIcon className="mr-1 inline" size={13} /> 날짜
                    선택
                </button>
            </div>

            <div className="mt-5 space-y-0">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="relative flex gap-3 pb-5 last:pb-0"
                    >
                        <div className="w-11 pt-3 text-xs font-extrabold text-brand-700">
                            {item.time}
                        </div>
                        <div className="relative">
                            <span className="mt-4 block h-3 w-3 rounded-full bg-brand ring-4 ring-brand-50" />
                            {index < items.length - 1 && (
                                <span className="absolute left-[5px] top-7 h-14 border-l-2 border-dashed border-brand-200" />
                            )}
                        </div>
                        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
                            <GripVerticalIcon
                                size={15}
                                className="text-slate-300"
                            />
                            <img
                                src={item.place.image}
                                alt=""
                                className="h-10 w-10 rounded-lg object-cover"
                            />
                            <span className="min-w-0 flex-1">
                                <b className="block truncate text-xs text-slate-800">
                                    {item.place.name}
                                </b>
                                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                                    <Clock3Icon size={11} /> 약 1시간 30분
                                </span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-brand-200 bg-brand-50 p-3">
                <label className="mb-2 block text-xs font-bold text-slate-600">
                    확정 장소 일정에 배치
                </label>
                <div className="flex gap-2">
                    <select
                        value={draftId}
                        onChange={(event) => setDraftId(event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium outline-none focus:border-brand"
                    >
                        <option value="">장소 선택</option>
                        {saved.map((place) => (
                            <option key={place.id} value={place.id}>
                                {place.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={addPlace}
                        className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white"
                    >
                        <PlusIcon size={13} /> 배치
                    </button>
                </div>
            </div>

            <div className="mt-5 rounded-xl bg-[#25213f] p-4 text-white">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                        <SparklesIcon size={14} />
                    </span>
                    <b className="text-sm">AI 경로 제안</b>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/70">
                    확정된 장소를 기준으로 이동 시간과 영업시간을 고려한 두 가지
                    동선을 만들었어요.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setRoute('first')}
                        className={`rounded-lg border p-2 text-left text-[11px] ${route === 'first' ? 'border-[#a896ff] bg-white/15' : 'border-white/10 bg-white/5'}`}
                    >
                        <b>1번 · 해안 우선</b>
                        <span className="mt-1 block text-white/60">
                            이동 42분 · 충돌 없음
                        </span>
                    </button>
                    <button
                        onClick={() => setRoute('second')}
                        className={`rounded-lg border p-2 text-left text-[11px] ${route === 'second' ? 'border-[#a896ff] bg-white/15' : 'border-white/10 bg-white/5'}`}
                    >
                        <b>2번 · 카페 우선</b>
                        <span className="mt-1 block text-white/60">
                            이동 35분 · 혼잡 주의
                        </span>
                    </button>
                </div>
                {route !== 'none' && (
                    <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-[#a896ff] py-2 text-xs font-extrabold text-[#25213f]">
                        <RouteIcon size={13} />{' '}
                        {route === 'first'
                            ? '1번 경로 승인하기'
                            : '2번 경로 승인하기'}
                    </button>
                )}
            </div>
        </div>
    )
}
