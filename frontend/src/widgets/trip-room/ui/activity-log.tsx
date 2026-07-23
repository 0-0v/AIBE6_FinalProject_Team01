import { useEffect } from 'react'
import {
    BotIcon,
    HistoryIcon,
    LoaderCircleIcon,
    UserRoundIcon,
    RefreshCwIcon,
} from 'lucide-react'
import type { ActivityLog } from '@/entities/activity-log'
import { useActivityLogStore } from '@/features/view-activity-log'
import { useCurrentUserStore } from '@/shared/model'

type Props = {
    tripId?: number
}

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
})

function actorLabel(log: ActivityLog) {
    if (log.agentRunId !== null) return 'AI 에이전트'
    if (log.memberId !== null) return `멤버 #${log.memberId}`
    return '시스템'
}

function targetLabel(log: ActivityLog) {
    if (!log.metadata) return null

    for (const key of ['placeName', 'title', 'targetName']) {
        const value = log.metadata[key]
        if (typeof value === 'string' && value.trim()) return value
    }
    return null
}

export function ActivityLogPanel({ tripId }: Props) {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const {
        logs,
        hasNext,
        isLoading,
        error,
        loadActivityLogs,
        loadMoreActivityLogs,
        resetActivityLogs,
    } = useActivityLogStore()

    useEffect(() => {
        if (currentUser && tripId !== undefined) {
            void loadActivityLogs(tripId)
        } else {
            resetActivityLogs()
        }

        return resetActivityLogs
    }, [currentUser, loadActivityLogs, resetActivityLogs, tripId])

    if (tripId === undefined) {
        return <EmptyMessage message="연결된 여행 정보가 없습니다." />
    }
    if (!currentUser) {
        return <EmptyMessage message="활동 로그를 보려면 로그인해 주세요." />
    }
    if (isLoading && logs.length === 0) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                <LoaderCircleIcon className="animate-spin" size={16} />
                활동 로그를 불러오는 중입니다.
            </div>
        )
    }
    if (error && logs.length === 0) {
        return (
            <div className="px-4 py-12 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button
                    type="button"
                    onClick={() => void loadActivityLogs(tripId)}
                    className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                    다시 시도
                </button>
            </div>
        )
    }
    if (logs.length === 0) {
        return <EmptyMessage message="아직 기록된 활동이 없습니다." />
    }

    return (
        <div className="p-3">
            <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <HistoryIcon size={13} /> 활동 로그
                <button
                    type="button"
                    onClick={() => void loadActivityLogs(tripId)}
                    disabled={isLoading}
                    className="ml-auto rounded-md p-1 hover:bg-slate-100 disabled:opacity-50"
                    aria-label="활동 로그 새로고침"
                >
                    <RefreshCwIcon size={12} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="space-y-1">
                {logs.map((log) => {
                    const target = targetLabel(log)
                    const isAgent = log.agentRunId !== null

                    return (
                        <div
                            key={log.id}
                            className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50"
                        >
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                {isAgent ? (
                                    <BotIcon size={13} />
                                ) : (
                                    <UserRoundIcon size={13} />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs leading-snug text-slate-600">
                                    <b className="font-semibold text-slate-800">
                                        {actorLabel(log)}
                                    </b>{' '}
                                    {log.description}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                    {target && `${target} · `}
                                    {DATE_FORMATTER.format(
                                        new Date(log.createdAt),
                                    )}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
            {error && (
                <p className="mt-3 text-center text-xs text-red-500">{error}</p>
            )}
            {hasNext && (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void loadMoreActivityLogs()}
                    className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoading ? '불러오는 중...' : '더 보기'}
                </button>
            )}
        </div>
    )
}

function EmptyMessage({ message }: { message: string }) {
    return (
        <div className="px-4 py-16 text-center">
            <HistoryIcon className="mx-auto mb-2 text-slate-300" size={24} />
            <p className="text-sm text-slate-400">{message}</p>
        </div>
    )
}
