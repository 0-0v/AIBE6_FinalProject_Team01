import React from 'react'
import {
    CalendarDaysIcon,
    ChevronRightIcon,
    MapPinIcon,
    UsersIcon,
} from 'lucide-react'
import { Avatar } from '@/shared/ui'
import { members } from '../model/mock-data'
import type { Room } from '../model/types'

type Props = {
    room: Room
    onOpen: () => void
}

export function RoomCard({ room, onOpen }: Props) {
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
                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                            {members.slice(0, room.members).map((member) => (
                                <Avatar
                                    key={member.id}
                                    name={member.name}
                                    color={member.avatarColor}
                                    size={25}
                                    className="ring-2 ring-white"
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <span>여행 준비도</span>
                            <span>{room.progress}%</span>
                        </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${room.progress}%`,
                                backgroundColor: room.color,
                            }}
                        />
                    </div>
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
