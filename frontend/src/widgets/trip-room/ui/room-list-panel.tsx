import React from 'react'
import { LockIcon } from 'lucide-react'
import { RoomCard, rooms } from '@/entities/trip'

type Props = {
    onSelectRoom: (roomId: string) => void
}

export function RoomListPanel({ onSelectRoom }: Props) {
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
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-extrabold text-brand-700">
                    총 {rooms.length}개
                </span>
            </header>

            <div className="mt-5 space-y-4">
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
        </div>
    )
}
