import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarDaysIcon,
    ChevronRightIcon,
    LockIcon,
    MapPinIcon,
    PlusIcon,
    UsersIcon,
} from 'lucide-react'
import { Avatar } from '../components/common/Avatar'
import { members } from '../data/mockData'

const rooms = [
    {
        id: 'jeju-family',
        title: '제주도 가족여행',
        date: '2026. 08. 12 – 08. 15',
        location: '제주도',
        dday: 'D-12',
        members: 4,
        progress: 68,
        cover: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
        status: '진행 중',
        color: '#5b32ea',
    },
    {
        id: 'busan-friends',
        title: '부산 친구 여행',
        date: '2026. 09. 07 – 09. 09',
        location: '부산광역시',
        dday: 'D-38',
        members: 3,
        progress: 24,
        cover: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
        status: '준비 중',
        color: '#f97316',
    },
    {
        id: 'gangneung-weekend',
        title: '강릉 주말 여행',
        date: '2026. 09. 20 – 09. 21',
        location: '강릉시',
        dday: 'D-51',
        members: 2,
        progress: 12,
        cover: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
        status: '준비 중',
        color: '#0ea5e9',
    },
]

export function TravelRooms() {
    const navigate = useNavigate()
    const [creating, setCreating] = useState(false)
    const [title, setTitle] = useState('')
    const [customRooms, setCustomRooms] = useState<typeof rooms>([])
    const allRooms = [...rooms, ...customRooms]

    function createRoom() {
        const trimmed = title.trim()
        if (!trimmed) return
        const newRoom = {
            id: `room-${Date.now()}`,
            title: trimmed,
            date: '날짜 미정',
            location: '여행지 미정',
            dday: 'D-day',
            members: 1,
            progress: 0,
            cover: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
            status: '새 여행',
            color: '#5b32ea',
        }
        setCustomRooms((current) => [newRoom, ...current])
        setTitle('')
        setCreating(false)
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-[1240px]">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-[#5b32ea]">
                            MY TRIPS
                        </p>
                        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-slate-950">
                            여행방
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            함께 준비 중인 여행을 열어 지도와 일정을 관리하세요.
                        </p>
                    </div>
                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 rounded-xl bg-[#5b32ea] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(91,50,234,0.22)] hover:bg-[#4825c7]"
                    >
                        <PlusIcon size={17} /> 여행방 만들기
                    </button>
                </header>

                {creating && (
                    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d9d0ff] bg-[#f4f1ff] p-4">
                        <input
                            autoFocus
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            onKeyDown={(event) =>
                                event.key === 'Enter' && createRoom()
                            }
                            placeholder="여행방 이름을 입력하세요"
                            className="min-w-[220px] flex-1 rounded-xl border border-white bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#bdb0ff]"
                        />
                        <button
                            onClick={createRoom}
                            className="rounded-xl bg-[#5b32ea] px-4 py-2.5 text-sm font-bold text-white"
                        >
                            만들기
                        </button>
                        <button
                            onClick={() => setCreating(false)}
                            className="px-3 py-2.5 text-sm font-bold text-slate-500"
                        >
                            취소
                        </button>
                    </div>
                )}

                <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {allRooms.map((room) => (
                        <article
                            key={room.id}
                            className="group overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(31,41,55,0.1)]"
                        >
                            <div className="relative h-44 overflow-hidden">
                                <img
                                    src={room.cover}
                                    alt=""
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
                                <span
                                    className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-extrabold"
                                    style={{ color: room.color }}
                                >
                                    {room.status}
                                </span>
                                <span className="absolute bottom-4 left-4 rounded-full bg-[#f4f1ff] px-2.5 py-1 text-xs font-extrabold text-[#5b32ea]">
                                    {room.dday}
                                </span>
                            </div>
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                                            {room.title}
                                        </h2>
                                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
                                            <MapPinIcon size={13} />{' '}
                                            {room.location}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            navigate(`/app/room/${room.id}`)
                                        }
                                        aria-label={`${room.title} 열기`}
                                        className="rounded-xl bg-[#f4f1ff] p-2 text-[#5b32ea] hover:bg-[#e8e0ff]"
                                    >
                                        <ChevronRightIcon size={18} />
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <CalendarDaysIcon size={14} />{' '}
                                        {room.date}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <UsersIcon size={14} /> {room.members}명
                                    </span>
                                </div>
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        {members
                                            .slice(0, room.members)
                                            .map((member) => (
                                                <Avatar
                                                    key={member.id}
                                                    name={member.name}
                                                    color={member.avatarColor}
                                                    size={25}
                                                    className="ring-2 ring-white"
                                                />
                                            ))}
                                    </div>
                                    <div className="flex-1">
                                        <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-400">
                                            <span>준비도</span>
                                            <span>{room.progress}%</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${room.progress}%`,
                                                    backgroundColor: room.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() =>
                                        navigate(`/app/room/${room.id}`)
                                    }
                                    className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
                                >
                                    여행방 열기 <ChevronRightIcon size={15} />
                                </button>
                            </div>
                        </article>
                    ))}
                </section>

                <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
                    <LockIcon className="mx-auto text-slate-400" size={20} />
                    <p className="mt-2 text-sm font-bold text-slate-700">
                        초대 코드를 받으셨나요?
                    </p>
                    <button className="mt-2 text-sm font-bold text-[#5b32ea] hover:underline">
                        초대 코드로 여행방 참여하기
                    </button>
                </section>
            </div>
        </div>
    )
}
