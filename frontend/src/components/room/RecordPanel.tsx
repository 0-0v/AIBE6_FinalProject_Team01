import React, { useMemo, useState } from 'react'
import {
    ArrowDownUpIcon,
    ImagePlusIcon,
    MapPinIcon,
    PlusIcon,
    XIcon,
} from 'lucide-react'
import { Place, TravelRecord } from '../../data/types'
import { members } from '../../data/mockData'
import { Avatar } from '../common/Avatar'

type Props = {
    records: TravelRecord[]
    places: Place[]
    canWrite: boolean
    onAdd: (record: Omit<TravelRecord, 'id' | 'createdAt' | 'memberId'>) => void
    onPlaceClick: (placeId: string) => void
}

const galleryImages = [
    '/\u1109\u1173\u110F\u1173\u1105\u1175\u11AB\u1109\u1163\u11BA_2026-07-19_\u110B\u1169\u110C\u1165\u11AB_1.15.02.png',
    '/\u1109\u1173\u110F\u1173\u1105\u1175\u11AB\u1109\u1163\u11BA_2026-07-19_\u110B\u1169\u110C\u1165\u11AB_1.14.52.png',
]

const dayDetails: Record<1 | 2 | 3, string> = {
    1: '8월 12일 · 제주 동부',
    2: '8월 13일 · 제주 서부',
    3: '8월 14일 · 제주 시내',
}

export function RecordPanel({
    records,
    places,
    canWrite,
    onAdd,
    onPlaceClick,
}: Props) {
    const [day, setDay] = useState<1 | 2 | 3>(1)
    const [isNewestFirst, setIsNewestFirst] = useState(true)
    const [composerOpen, setComposerOpen] = useState(false)
    const [memo, setMemo] = useState('')
    const [placeId, setPlaceId] = useState('')
    const [selectedImages, setSelectedImages] = useState<string[]>([])

    const dayRecords = useMemo(() => {
        const filtered = records.filter((record) => record.day === day)
        return [...filtered].sort((a, b) =>
            isNewestFirst
                ? b.time.localeCompare(a.time)
                : a.time.localeCompare(b.time),
        )
    }, [day, isNewestFirst, records])

    function addRecord() {
        if (!memo.trim() && selectedImages.length === 0) return
        onAdd({
            day,
            time: '방금',
            memo: memo.trim() || undefined,
            placeId: placeId || undefined,
            images: selectedImages,
        })
        setMemo('')
        setPlaceId('')
        setSelectedImages([])
        setComposerOpen(false)
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col bg-[#fcfcfd]">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
                <div
                    className="mp-scroll flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto"
                    role="tablist"
                    aria-label="여행 날짜"
                >
                    {([1, 2, 3] as const).map((item) => (
                        <button
                            key={item}
                            onClick={() => setDay(item)}
                            role="tab"
                            aria-selected={day === item}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${day === item ? 'bg-[#5b32ea] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            DAY {item}
                        </button>
                    ))}
                    <span className="shrink-0 pl-1 text-[11px] font-bold text-slate-500">
                        {dayDetails[day]}
                    </span>
                </div>
                <button
                    onClick={() => setIsNewestFirst((value) => !value)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="기록 정렬 순서 변경"
                >
                    <ArrowDownUpIcon size={13} />{' '}
                    {isNewestFirst ? '최신순' : '시간순'}
                </button>
            </div>

            <div className="mp-scroll flex-1 overflow-y-auto px-4 py-5">
                {dayRecords.length === 0 ? (
                    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                        <div
                            className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#f4f1ff] text-3xl"
                            aria-hidden="true"
                        >
                            📷
                            <span className="absolute -right-1 -top-1 text-lg">
                                ✦
                            </span>
                        </div>
                        <h4 className="mt-5 text-sm font-extrabold text-slate-800">
                            아직 기록이 없어요
                        </h4>
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                            여행하며 사진을 남겨보세요.
                            <br />
                            나중에 가장 선명한 추억이 될 거예요.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-3">
                        {dayRecords.map((record) => {
                            const author = members.find(
                                (member) => member.id === record.memberId,
                            )
                            const place = places.find(
                                (item) => item.id === record.placeId,
                            )
                            return (
                                <article
                                    key={record.id}
                                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.035)]"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2.5">
                                            {author && (
                                                <Avatar
                                                    name={author.name}
                                                    color={author.avatarColor}
                                                    size={29}
                                                />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-extrabold text-slate-800">
                                                    {author?.name}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                    {record.time}
                                                </p>
                                            </div>
                                        </div>
                                        {record.images.length > 0 && (
                                            <PhotoGrid images={record.images} />
                                        )}
                                        {record.memo && (
                                            <p className="text-sm leading-6 text-slate-600">
                                                {record.memo}
                                            </p>
                                        )}
                                        {place && (
                                            <button
                                                onClick={() =>
                                                    onPlaceClick(place.id)
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f1ff] px-2.5 py-1.5 text-[11px] font-bold text-[#5b32ea] hover:bg-[#e8e0ff]"
                                            >
                                                <MapPinIcon size={12} />{' '}
                                                {place.name}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>

            {canWrite && (
                <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-5">
                    <button
                        onClick={() => setComposerOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5b32ea] py-3 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(91,50,234,0.26)] hover:bg-[#4825c7]"
                    >
                        <PlusIcon size={17} /> 기록 추가
                    </button>
                </div>
            )}

            {composerOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-end bg-slate-950/30 p-3 sm:items-center sm:justify-center"
                    onClick={() => setComposerOpen(false)}
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
                                <p className="text-xs font-bold text-[#5b32ea]">
                                    DAY {day}
                                </p>
                                <h3
                                    id="record-dialog-title"
                                    className="mt-0.5 text-lg font-extrabold"
                                >
                                    기록 추가
                                </h3>
                            </div>
                            <button
                                onClick={() => setComposerOpen(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                                aria-label="기록 추가 닫기"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <textarea
                            value={memo}
                            onChange={(event) => setMemo(event.target.value)}
                            placeholder="오늘의 순간을 남겨보세요"
                            className="mt-5 min-h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-[#5b32ea] focus:bg-white focus:ring-2 focus:ring-[#e8e0ff]"
                        />
                        <label className="mt-3 block text-xs font-bold text-slate-600">
                            연결할 장소
                        </label>
                        <select
                            value={placeId}
                            onChange={(event) => setPlaceId(event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[#5b32ea]"
                        >
                            <option value="">장소 선택 안 함</option>
                            {places
                                .filter((place) => place.status === 'saved')
                                .map((place) => (
                                    <option key={place.id} value={place.id}>
                                        {place.name}
                                    </option>
                                ))}
                        </select>
                        <div className="mt-4">
                            <p className="text-xs font-bold text-slate-600">
                                사진 첨부
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {galleryImages.map((image) => (
                                    <button
                                        key={image}
                                        onClick={() =>
                                            setSelectedImages((current) =>
                                                current.includes(image)
                                                    ? current.filter(
                                                          (item) =>
                                                              item !== image,
                                                      )
                                                    : [...current, image],
                                            )
                                        }
                                        className={`relative h-20 overflow-hidden rounded-xl border-2 ${selectedImages.includes(image) ? 'border-[#5b32ea]' : 'border-transparent'}`}
                                        aria-label="사진 선택"
                                    >
                                        <img
                                            src={image}
                                            alt="여행 기록에 첨부할 사진"
                                            className="h-full w-full object-cover"
                                        />
                                        {selectedImages.includes(image) && (
                                            <span className="absolute inset-0 bg-[#5b32ea]/20" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            disabled={
                                !memo.trim() && selectedImages.length === 0
                            }
                            onClick={addRecord}
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5b32ea] py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-200"
                        >
                            <ImagePlusIcon size={16} /> 기록 남기기
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function PhotoGrid({ images }: { images: string[] }) {
    const visibleImages = images.slice(0, 4)
    const extraCount = images.length - visibleImages.length
    const gridClass = visibleImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'

    return (
        <div
            className={`grid w-[84%] overflow-hidden rounded-xl ${gridClass} gap-1 bg-slate-100`}
        >
            {visibleImages.map((image, index) => (
                <div
                    key={`${image}-${index}`}
                    className="relative h-24 overflow-hidden"
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
                </div>
            ))}
        </div>
    )
}
