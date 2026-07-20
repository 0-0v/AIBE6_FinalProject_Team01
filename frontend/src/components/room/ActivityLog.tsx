import React from 'react'
import { RotateCcwIcon, HistoryIcon } from 'lucide-react'
import { ActivityLog as Log } from '../../data/types'
import { members } from '../../data/mockData'
import { Avatar } from '../common/Avatar'

type Props = {
    logs: Log[]
    onUndo: (id: string) => void
}

export function ActivityLogPanel({ logs, onUndo }: Props) {
    return (
        <div className="p-3">
            <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <HistoryIcon size={13} /> 활동 로그
            </div>
            <div className="space-y-1">
                {logs.map((log) => {
                    const who = members.find((m) => m.id === log.memberId)
                    return (
                        <div
                            key={log.id}
                            className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50"
                        >
                            {who && (
                                <Avatar
                                    name={who.name}
                                    color={who.avatarColor}
                                    size={24}
                                />
                            )}
                            <p className="flex-1 text-xs leading-snug text-slate-600">
                                <b className="font-semibold text-slate-800">
                                    {who?.name}
                                </b>
                                님이 {log.action}
                                <span className="text-slate-400">
                                    {' '}
                                    · {log.createdAt}
                                </span>
                                <br />
                                <span className="text-slate-400">
                                    {log.target}
                                </span>
                            </p>
                            {log.undoable && (
                                <button
                                    onClick={() => onUndo(log.id)}
                                    title="되돌리기"
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                >
                                    <RotateCcwIcon size={13} />
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
