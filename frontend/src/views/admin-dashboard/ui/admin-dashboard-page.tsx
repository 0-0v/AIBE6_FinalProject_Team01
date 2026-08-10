'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import {
    BarChart3Icon,
    ImageIcon,
    SearchIcon,
    ShieldAlertIcon,
    UsersIcon,
    XIcon,
} from 'lucide-react'
import {
    getAdminActionLogs,
    getAdminCoverPresets,
    getAdminDashboard,
    getAdminMemberApiUsages,
    getAdminMembers,
    getAdminMemberTrips,
    releaseMember,
    setAdminCoverPresetActive,
    suspendMember,
    uploadAdminCoverPreset,
    type AdminActionLog,
    type AdminDashboard,
    type AdminMember,
    type AdminTrip,
    type ExternalApiUsage,
    type TripCoverPreset,
} from '@/features/admin'
import { getApiErrorMessage, resolveMediaUrl } from '@/shared/api/client'

type Tab = 'members' | 'covers' | 'logs'

export function AdminDashboardPage() {
    const [tab, setTab] = useState<Tab>('members')
    const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
    const [members, setMembers] = useState<AdminMember[]>([])
    const [covers, setCovers] = useState<TripCoverPreset[]>([])
    const [logs, setLogs] = useState<AdminActionLog[]>([])
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState<AdminMember | null>(null)
    const [message, setMessage] = useState('')

    const loadMembers = useCallback(async (search = '') => {
        const response = await getAdminMembers(search)
        setMembers(response.data.content)
    }, [])

    const refresh = useCallback(async () => {
        setMessage('')
        try {
            const [summary, memberPage, coverList, logPage] = await Promise.all(
                [
                    getAdminDashboard(),
                    getAdminMembers(),
                    getAdminCoverPresets(),
                    getAdminActionLogs(),
                ],
            )
            setDashboard(summary.data)
            setMembers(memberPage.data.content)
            setCovers(coverList.data)
            setLogs(logPage.data.content)
        } catch (error) {
            setMessage(
                getApiErrorMessage(error, '관리자 정보를 불러오지 못했습니다.'),
            )
        }
    }, [])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => void refresh(), 0)
        return () => window.clearTimeout(timeoutId)
    }, [refresh])

    async function handleSearch(event: FormEvent) {
        event.preventDefault()
        try {
            await loadMembers(query)
        } catch (error) {
            setMessage(getApiErrorMessage(error, '회원 검색에 실패했습니다.'))
        }
    }

    return (
        <div className="min-h-full bg-slate-50 px-10 py-9 text-slate-900">
            <header className="flex items-end justify-between gap-5">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">
                        Admin Console
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold">
                        서비스 관리
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        회원 개인정보를 최소 범위로 조회하고 운영 조치를
                        관리합니다.
                    </p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">
                    모든 관리 조치는 감사 로그에 기록됩니다
                </span>
            </header>

            {message && (
                <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {message}
                </p>
            )}
            <section className="mt-7 grid grid-cols-5 gap-4">
                <Metric label="전체 회원" value={dashboard?.totalMembers} />
                <Metric label="활성 회원" value={dashboard?.activeMembers} />
                <Metric label="정지 회원" value={dashboard?.suspendedMembers} />
                <Metric label="전체 여행방" value={dashboard?.totalTrips} />
                <Metric
                    label="오늘 외부 API"
                    value={dashboard?.externalApiCallsToday}
                />
            </section>

            <nav
                className="mt-8 flex gap-2 rounded-2xl bg-white p-2 shadow-sm"
                aria-label="관리자 기능"
            >
                <TabButton
                    active={tab === 'members'}
                    onClick={() => setTab('members')}
                    icon={<UsersIcon size={17} />}
                    label="회원 관리"
                />
                <TabButton
                    active={tab === 'covers'}
                    onClick={() => setTab('covers')}
                    icon={<ImageIcon size={17} />}
                    label="커버 이미지"
                />
                <TabButton
                    active={tab === 'logs'}
                    onClick={() => setTab('logs')}
                    icon={<BarChart3Icon size={17} />}
                    label="감사 로그"
                />
            </nav>

            {tab === 'members' && (
                <MembersPanel
                    members={members}
                    query={query}
                    setQuery={setQuery}
                    onSearch={handleSearch}
                    onSelect={setSelected}
                />
            )}
            {tab === 'covers' && (
                <CoversPanel
                    covers={covers}
                    onChanged={refresh}
                    setMessage={setMessage}
                />
            )}
            {tab === 'logs' && <LogsPanel logs={logs} />}
            {selected && (
                <MemberDetailModal
                    member={selected}
                    onClose={() => setSelected(null)}
                    onChanged={async () => {
                        await refresh()
                        setSelected(null)
                    }}
                />
            )}
        </div>
    )
}

function Metric({ label, value }: { label: string; value?: number }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <strong className="mt-2 block text-2xl font-extrabold">
                {value ?? '—'}
            </strong>
        </div>
    )
}

function TabButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${active ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
            {icon}
            {label}
        </button>
    )
}

function MembersPanel({
    members,
    query,
    setQuery,
    onSearch,
    onSelect,
}: {
    members: AdminMember[]
    query: string
    setQuery: (value: string) => void
    onSearch: (event: FormEvent) => void
    onSelect: (member: AdminMember) => void
}) {
    return (
        <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
            <form className="flex max-w-lg gap-2" onSubmit={onSearch}>
                <label className="relative flex-1">
                    <SearchIcon
                        className="absolute left-3 top-3 text-slate-400"
                        size={18}
                    />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="이메일 또는 닉네임 검색"
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
                    />
                </label>
                <button className="rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">
                    검색
                </button>
            </form>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                            <th className="p-4">회원</th>
                            <th>제공자</th>
                            <th>상태</th>
                            <th>최근 로그인</th>
                            <th className="pr-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => (
                            <tr
                                key={member.id}
                                className="border-t border-slate-100"
                            >
                                <td className="p-4">
                                    <strong className="block">
                                        {member.nickname}
                                    </strong>
                                    <span className="text-xs text-slate-400">
                                        {member.email}
                                    </span>
                                </td>
                                <td>{member.provider}</td>
                                <td>
                                    <StatusBadge status={member.status} />
                                </td>
                                <td>{formatDate(member.lastLoginAt)}</td>
                                <td className="pr-4 text-right">
                                    <button
                                        type="button"
                                        onClick={() => onSelect(member)}
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                                    >
                                        계정 정보
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {members.length === 0 && (
                    <p className="p-10 text-center text-sm text-slate-400">
                        조건에 맞는 회원이 없습니다.
                    </p>
                )}
            </div>
        </section>
    )
}

function MemberDetailModal({
    member,
    onClose,
    onChanged,
}: {
    member: AdminMember
    onClose: () => void
    onChanged: () => Promise<void>
}) {
    const [trips, setTrips] = useState<AdminTrip[]>([])
    const [usages, setUsages] = useState<ExternalApiUsage[]>([])
    const [reason, setReason] = useState('')
    const [until, setUntil] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    useEffect(() => {
        Promise.all([
            getAdminMemberTrips(member.id),
            getAdminMemberApiUsages(member.id),
        ])
            .then(([tripPage, usagePage]) => {
                setTrips(tripPage.data.content)
                setUsages(usagePage.data.content)
            })
            .catch((error) =>
                setMessage(
                    getApiErrorMessage(
                        error,
                        '계정 로그를 불러오지 못했습니다.',
                    ),
                ),
            )
    }, [member.id])
    async function changeStatus() {
        if (!reason.trim()) {
            setMessage('운영 조치 사유를 입력해 주세요.')
            return
        }
        setBusy(true)
        try {
            if (member.status === 'SUSPENDED')
                await releaseMember(member.id, reason.trim())
            else
                await suspendMember(
                    member.id,
                    reason.trim(),
                    until ? new Date(until).toISOString() : null,
                )
            await onChanged()
        } catch (error) {
            setMessage(
                getApiErrorMessage(error, '회원 상태를 변경하지 못했습니다.'),
            )
        } finally {
            setBusy(false)
        }
    }
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-5">
            <section
                role="dialog"
                aria-modal="true"
                className="mp-scroll max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            >
                <div className="flex justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400">
                            회원 #{member.id}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold">
                            {member.nickname}
                        </h2>
                        <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="닫기">
                        <XIcon />
                    </button>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-5">
                    <section className="rounded-2xl border border-slate-100 p-5">
                        <h3 className="font-extrabold">여행방 요약</h3>
                        <p className="mt-1 text-xs text-slate-400">
                            장소·메모 등 상세 내용은 관리자에게 노출하지
                            않습니다.
                        </p>
                        <div className="mt-4 space-y-2">
                            {trips.map((trip) => (
                                <div
                                    key={trip.id}
                                    className="rounded-xl bg-slate-50 p-3 text-sm"
                                >
                                    <strong>{trip.title}</strong>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {trip.status} ·{' '}
                                        {trip.startDate ?? '날짜 미정'} ~{' '}
                                        {trip.endDate ?? '날짜 미정'}
                                    </p>
                                </div>
                            ))}
                            {trips.length === 0 && (
                                <p className="text-sm text-slate-400">
                                    참여한 여행방이 없습니다.
                                </p>
                            )}
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-100 p-5">
                        <h3 className="font-extrabold">
                            AI·지도 API 사용 로그
                        </h3>
                        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                            {usages.map((usage) => (
                                <div
                                    key={usage.id}
                                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs"
                                >
                                    <span>
                                        <strong>{usage.provider}</strong>
                                        <br />
                                        {usage.operation}
                                    </span>
                                    <span className="text-right text-slate-500">
                                        {formatDate(usage.createdAt)}
                                        <br />
                                        {usage.inputTokens != null
                                            ? `${usage.inputTokens + (usage.outputTokens ?? 0)} tokens`
                                            : usage.success
                                              ? '성공'
                                              : '실패'}
                                    </span>
                                </div>
                            ))}
                            {usages.length === 0 && (
                                <p className="text-sm text-slate-400">
                                    기록된 외부 API 호출이 없습니다.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
                {member.role !== 'ADMIN' && (
                    <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <div className="flex items-center gap-2 font-extrabold text-amber-800">
                            <ShieldAlertIcon size={18} />
                            운영 조치
                        </div>
                        <p className="mt-2 text-xs leading-5 text-amber-700">
                            사이트의 비정상적 이용에 한해서만 조치하며, 개인
                            여행 내용이나 표현은 정지 판단에 사용하지 않습니다.
                        </p>
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            maxLength={500}
                            placeholder={
                                member.status === 'SUSPENDED'
                                    ? '정지 해제 사유'
                                    : '정지 사유'
                            }
                            className="mt-4 h-20 w-full resize-none rounded-xl border border-amber-200 bg-white p-3 text-sm"
                        />
                        {member.status !== 'SUSPENDED' && (
                            <input
                                type="datetime-local"
                                value={until}
                                onChange={(event) =>
                                    setUntil(event.target.value)
                                }
                                className="mt-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                            />
                        )}
                        {message && (
                            <p className="mt-2 text-sm text-red-600">
                                {message}
                            </p>
                        )}
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void changeStatus()}
                                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white ${member.status === 'SUSPENDED' ? 'bg-emerald-600' : 'bg-red-600'}`}
                            >
                                {member.status === 'SUSPENDED'
                                    ? '정지 해제'
                                    : '회원 정지'}
                            </button>
                        </div>
                    </section>
                )}
            </section>
        </div>
    )
}

function CoversPanel({
    covers,
    onChanged,
    setMessage,
}: {
    covers: TripCoverPreset[]
    onChanged: () => Promise<void>
    setMessage: (value: string) => void
}) {
    async function upload(file?: File) {
        if (!file) return
        try {
            await uploadAdminCoverPreset(file)
            await onChanged()
        } catch (error) {
            setMessage(
                getApiErrorMessage(error, '이미지를 추가하지 못했습니다.'),
            )
        }
    }
    async function toggle(preset: TripCoverPreset) {
        try {
            await setAdminCoverPresetActive(preset.id, !preset.active)
            await onChanged()
        } catch (error) {
            setMessage(
                getApiErrorMessage(error, '이미지 상태를 변경하지 못했습니다.'),
            )
        }
    }
    return (
        <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-extrabold">랜덤 커버 이미지</h2>
                    <p className="mt-1 text-xs text-slate-400">
                        비활성화해도 기존 여행방 이미지는 유지됩니다.
                    </p>
                </div>
                <label className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
                    이미지 추가
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) =>
                            void upload(event.target.files?.[0])
                        }
                    />
                </label>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-4">
                {covers.map((preset) => (
                    <article
                        key={preset.id}
                        className={`overflow-hidden rounded-2xl border ${preset.active ? 'border-slate-100' : 'border-slate-200 opacity-55'}`}
                    >
                        <img
                            src={coverUrl(preset.imageUrl)}
                            alt="여행방 기본 커버"
                            className="h-32 w-full object-cover"
                        />
                        <div className="flex items-center justify-between p-3">
                            <span className="truncate text-xs font-bold">
                                {preset.presetKey}
                            </span>
                            <button
                                type="button"
                                onClick={() => void toggle(preset)}
                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${preset.active ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}
                            >
                                {preset.active ? '비활성화' : '활성화'}
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}

function LogsPanel({ logs }: { logs: AdminActionLog[] }) {
    return (
        <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold">관리자 감사 로그</h2>
            <div className="mt-5 space-y-2">
                {logs.map((log) => (
                    <div
                        key={log.id}
                        className="grid grid-cols-[180px_220px_1fr] rounded-xl border border-slate-100 p-4 text-sm"
                    >
                        <span className="text-slate-400">
                            {formatDate(log.createdAt)}
                        </span>
                        <strong>
                            {log.actionType} · #{log.targetId}
                        </strong>
                        <span>{log.reason}</span>
                    </div>
                ))}
            </div>
        </section>
    )
}
function StatusBadge({ status }: { status: AdminMember['status'] }) {
    const color =
        status === 'ACTIVE'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'SUSPENDED'
              ? 'bg-red-50 text-red-700'
              : 'bg-slate-100 text-slate-500'
    return (
        <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${color}`}
        >
            {status}
        </span>
    )
}
function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('ko-KR', {
              dateStyle: 'short',
              timeStyle: 'short',
          }).format(new Date(value))
        : '—'
}
function coverUrl(url: string) {
    return url.startsWith('/assets/') ? url : (resolveMediaUrl(url) ?? url)
}
