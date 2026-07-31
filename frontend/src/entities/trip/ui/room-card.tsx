import React from 'react'
import {
    CalendarDaysIcon,
    ChevronRightIcon,
    MapPinIcon,
    UsersIcon,
} from 'lucide-react'
import type { Room } from '../model/types'

type Props = {
    room: Room
    onOpen: () => void
    compact?: boolean
}

export function RoomCard({ room, onOpen, compact = false }: Props) {
    if (compact) {
        return (
            <article
                onClick={onOpen}
                className="group min-w-0 cursor-pointer overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-[0_14px_30px_rgba(31,41,55,0.09)]"
            >
                <div className="relative aspect-[16/8] overflow-hidden">
                    <img
                        src={room.cover}
                        alt={`${room.title} 여행방`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-extrabold text-white backdrop-blur-sm">
                        {room.status}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-1 text-[10px] font-extrabold text-slate-800">
                        {room.dday}
                    </span>
                </div>
                <div className="flex min-w-0 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h2 className="truncate font-extrabold tracking-tight text-slate-900">
                                {room.title}
                            </h2>
                            <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-slate-400">
                                <MapPinIcon size={12} className="shrink-0" />
                                {room.location}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-500">
                        <p className="flex items-center gap-1.5">
                            <CalendarDaysIcon size={12} />
                            <span className="truncate">{room.date}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                            <UsersIcon size={12} />
                            {room.members}명
                        </p>
                    </div>
                </div>
            </article>
        )
    }

    return (
        <article className="group overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(31,41,55,0.1)]">
            <div className="relative h-44 overflow-hidden">
                <img
                    src={room.cover}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-extrabold text-white">
                    {room.status}
                </span>
                <span className="absolute right-4 top-4 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-slate-900">
                    {room.dday}
                </span>
            </div>
            <div className="p-5">
                <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                        {room.title}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
                        <MapPinIcon size={13} /> {room.location}
                    </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <CalendarDaysIcon size={14} /> {room.date}
                    </span>
                    <span className="flex items-center gap-1">
                        <UsersIcon size={14} /> {room.members}명
                    </span>
                </div>
                <button
                    onClick={onOpen}
                    className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
                >
                    여행방 열기 <ChevronRightIcon size={15} />
                </button>
            </div>
        </article>
    )
}
