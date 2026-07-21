import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LockIcon } from 'lucide-react'
import { RoomCard } from '../components/common/RoomCard'
import { rooms } from '../data/mockData'

type Props = {
    embedded?: boolean
}

export function TravelRooms({ embedded = false }: Props) {
    const navigate = useNavigate()

    const content = (
        <>
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-brand-700">MY TRIPS</p>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-slate-950">
                        여행방
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        함께 준비 중인 모든 여행을 한눈에 살펴보고, 필요한
                        여행방을 바로 열어보세요.
                    </p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
                    총 {rooms.length}개 여행방
                </span>
            </header>

            <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        onOpen={() => navigate(`/app/room/${room.id}`)}
                    />
                ))}
            </section>

            <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
                <LockIcon className="mx-auto text-slate-400" size={20} />
                <p className="mt-2 text-sm font-bold text-slate-700">
                    초대 코드를 받으셨나요?
                </p>
                <button className="mt-2 text-sm font-bold text-brand-700 hover:underline">
                    초대 코드로 여행방 참여하기
                </button>
            </section>
        </>
    )

    if (embedded) {
        return content
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[1240px]">{content}</div>
        </div>
    )
}
