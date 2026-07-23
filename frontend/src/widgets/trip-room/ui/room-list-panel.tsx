import React, { useState } from 'react'
import { LockIcon, PlusIcon } from 'lucide-react'
import { Room, RoomCard } from '@/entities/trip'
import { CreateTripModal } from '@/features/manage-trip'

type Props = {
    rooms: Room[]
    isLoading: boolean
    error: string | null
    onRetry: () => void
    onSelectRoom: (roomId: string) => void
}

export function RoomListPanel({
    rooms,
    isLoading,
    error,
    onRetry,
    onSelectRoom,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false)
    return (
        <div className="mp-scroll flex-1 overflow-y-auto px-4 py-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold text-brand-700">MY TRIPS</p>
                    <h1 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-slate-950">
                        여행방
                    </h1>
                    <p className="mt-1.5 text-xs text-slate-500">
                        함께 준비 중인 모든 여행을 한눈에 살펴보고, 필요한
                        여행방을 바로 열어보세요.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-extrabold text-brand-700">총 {rooms.length}개</span>
                    <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white"><PlusIcon size={13} /> 만들기</button>
                </div>
            </header>

            <div className="mt-5 space-y-4">
                {isLoading && (
                    <p className="py-12 text-center text-sm text-slate-400">
                        여행방을 불러오는 중입니다.
                    </p>
                )}
                {error && (
                    <div className="py-12 text-center text-sm text-red-500">
                        <p>{error}</p>
                        <button
                            onClick={onRetry}
                            className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                        >
                            다시 시도
                        </button>
                    </div>
                )}
                {!isLoading && !error && rooms.length === 0 && (
                    <p className="py-12 text-center text-sm text-slate-400">
                        아직 생성된 여행방이 없습니다.
                    </p>
                )}
                {rooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        onOpen={() => onSelectRoom(room.id)}
                    />
                ))}
            </div>

            <section className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center">
                <LockIcon className="mx-auto text-slate-400" size={18} />
                <p className="mt-2 text-xs font-bold text-slate-700">
                    초대 코드를 받으셨나요?
                </p>
                <button className="mt-1.5 text-xs font-bold text-brand-700 hover:underline">
                    초대 코드로 여행방 참여하기
                </button>
            </section>
            {createOpen && (
                <CreateTripModal
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => {
                        setCreateOpen(false)
                        onRetry()
                    }}
                />
            )}
        </div>
    )
}
