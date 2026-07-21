import React, { useState } from 'react'
import {
    LockIcon,
    UnlockIcon,
    PencilIcon,
    AlertTriangleIcon,
} from 'lucide-react'
import { Avatar } from '../components/common/Avatar'
import { members, currentUserId } from '../data/mockData'

const myTrips = [
    { id: 't1', title: '제주도 우정여행 🌊', role: 'OWNER', isPublic: true },
    { id: 't2', title: '부산 먹방 투어', role: 'EDITOR', isPublic: false },
    { id: 't3', title: '강릉 카페 여행', role: 'VIEWER', isPublic: false },
]

export function MyPage() {
    const me = members.find((m) => m.id === currentUserId)!
    const [nickname, setNickname] = useState(me.name)
    const [draft, setDraft] = useState(me.name)
    const [editing, setEditing] = useState(false)
    const [error, setError] = useState('')
    const [trips, setTrips] = useState(myTrips)

    function saveNickname() {
        const v = draft.trim()
        if (v.length < 2 || v.length > 12) {
            setError('닉네임은 2~12자로 입력해주세요')
            return
        }
        if (!/^[가-힣a-zA-Z0-9_]+$/.test(v)) {
            setError('한글, 영문, 숫자, _만 사용할 수 있어요')
            return
        }
        setError('')
        setNickname(v)
        setEditing(false)
    }

    return (
        <div className="min-h-full bg-[#f8fafb] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-3xl">
                <p className="text-xs font-extrabold tracking-[0.12em] text-brand-700">
                    ACCOUNT
                </p>
                <h1 className="mb-8 mt-1 text-3xl font-extrabold tracking-[-0.05em] text-slate-950">
                    마이페이지
                </h1>

                {/* Profile */}
                <section className="mb-8 rounded-[22px] border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Avatar
                            name={nickname}
                            color={me.avatarColor}
                            size={64}
                        />
                        <div className="flex-1">
                            {editing ? (
                                <div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            value={draft}
                                            onChange={(e) =>
                                                setDraft(e.target.value)
                                            }
                                            className={`w-48 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                                                error
                                                    ? 'border-red-400 focus:ring-red-100'
                                                    : 'border-slate-300 focus:ring-brand-100'
                                            }`}
                                        />

                                        <button
                                            onClick={saveNickname}
                                            className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditing(false)
                                                setDraft(nickname)
                                                setError('')
                                            }}
                                            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                                        >
                                            취소
                                        </button>
                                    </div>
                                    {error && (
                                        <p className="mt-1.5 text-xs font-medium text-red-500">
                                            {error}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold">
                                        {nickname}
                                    </span>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                                    >
                                        <PencilIcon size={13} /> 닉네임 변경
                                    </button>
                                </div>
                            )}
                            <p className="mt-0.5 text-sm text-slate-500">
                                Google 계정으로 로그인됨
                            </p>
                        </div>
                    </div>
                </section>

                {/* Trips with public toggle */}
                <section className="mb-8">
                    <h2 className="mb-3 text-lg font-bold">
                        내가 참여 중인 여행방
                    </h2>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm">
                        {trips.map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center gap-3 px-5 py-4"
                            >
                                <div className="flex-1">
                                    <div className="font-medium">{t.title}</div>
                                    <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                        {t.role}
                                    </span>
                                </div>
                                {t.role === 'OWNER' ? (
                                    <button
                                        onClick={() =>
                                            setTrips((prev) =>
                                                prev.map((x) =>
                                                    x.id === t.id
                                                        ? {
                                                              ...x,
                                                              isPublic:
                                                                  !x.isPublic,
                                                          }
                                                        : x,
                                                ),
                                            )
                                        }
                                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                            t.isPublic
                                                ? 'bg-brand-50 text-brand-700'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        {t.isPublic ? (
                                            <UnlockIcon size={13} />
                                        ) : (
                                            <LockIcon size={13} />
                                        )}
                                        {t.isPublic ? '공개' : '비공개'}
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400">
                                        <LockIcon size={13} /> 방장만 설정
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Danger zone */}
                <section className="rounded-[22px] border border-red-100 bg-red-50/50 p-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangleIcon
                            size={20}
                            className="mt-0.5 text-red-500"
                        />
                        <div>
                            <h2 className="font-bold text-red-700">
                                회원 탈퇴
                            </h2>
                            <p className="mt-1 text-sm text-red-600/80">
                                탈퇴 후 1년이 지나면 모든 정보가 자동
                                삭제됩니다. 여러 멤버가 있는 여행방은 방장
                                기준으로 삭제 여부가 결정돼요.
                            </p>
                            <button className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                                탈퇴하기
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
