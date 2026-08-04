import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import type { ExpenseResponse } from '../api/expense-api'

export function isExpenseSettled(expense: ExpenseResponse) {
    return expense.participants
        .filter((participant) => participant.memberId !== expense.payerId)
        .every((participant) => participant.status === 'COMPLETED')
}

export function formatSettledAt(value: string) {
    const [datePart, timePart] = value.split('T')
    const segments = datePart.split('-')
    const month = segments[1] ?? '00'
    const day = segments[2] ?? '00'
    const [hour, minute] = (timePart ?? '00:00').split(':')
    return `${month}.${day} ${hour}:${minute}`
}

export function ExpenseSettlementCard({
    expense,
    currentMemberId,
    canWrite,
    completingKey,
    onComplete,
    onEdit,
}: {
    expense: ExpenseResponse
    currentMemberId: number | null
    canWrite: boolean
    completingKey: string | null
    onComplete: (memberId: number) => void
    onEdit?: () => void
}) {
    const settled = isExpenseSettled(expense)
    const [expanded, setExpanded] = useState(!settled)
    const totalCount = expense.participants.length
    const completedCount = expense.participants.filter(
        (participant) =>
            participant.memberId === expense.payerId ||
            participant.status === 'COMPLETED',
    ).length

    return (
        <article
            className={`rounded-2xl border p-3 ${settled ? 'border-slate-100' : 'border-brand-100'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-900">
                        {expense.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                        {expense.payerNickname} 결제 ·{' '}
                        {expense.expenseDate.replaceAll('-', '.')}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <b className="block text-sm text-[#213C51]">
                        {expense.totalAmount.toLocaleString('ko-KR')}원
                    </b>
                    <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${settled ? 'bg-slate-100 text-slate-500' : 'bg-brand-50 text-brand-700'}`}
                    >
                        {settled ? '정산 완료' : '정산 대기'}
                    </span>
                </div>
            </div>

            {!settled && (
                <div className="mt-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-brand transition-all"
                            style={{
                                width: `${(completedCount / totalCount) * 100}%`,
                            }}
                        />
                    </div>
                    <p className="mt-1 text-[9px] font-bold text-slate-400">
                        {completedCount}/{totalCount}명 완료
                    </p>
                </div>
            )}

            {expanded ? (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                    {expense.participants.map((participant) => {
                        const isPayer =
                            participant.memberId === expense.payerId
                        const canSettle =
                            !isPayer &&
                            participant.status === 'PENDING' &&
                            participant.memberId === currentMemberId
                        const key = `${expense.id}:${participant.memberId}`
                        return (
                            <div
                                key={participant.memberId}
                                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50/70 px-2.5 py-2"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="truncate text-[11px] font-extrabold text-slate-700">
                                            {participant.nickname}
                                        </span>
                                        {isPayer && (
                                            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[8px] font-extrabold text-slate-500">
                                                결제자
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                        {participant.shareAmount.toLocaleString(
                                            'ko-KR',
                                        )}
                                        원
                                        {!isPayer &&
                                            participant.status ===
                                                'COMPLETED' &&
                                            participant.settledAt &&
                                            ` · ${formatSettledAt(participant.settledAt)} 송금`}
                                    </p>
                                </div>
                                {isPayer ? (
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-500">
                                        본인 부담
                                    </span>
                                ) : participant.status === 'COMPLETED' ? (
                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600">
                                        완료
                                    </span>
                                ) : canSettle ? (
                                    <button
                                        type="button"
                                        disabled={completingKey === key}
                                        onClick={() =>
                                            onComplete(participant.memberId)
                                        }
                                        className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-[9px] font-extrabold text-white transition hover:bg-brand-700 disabled:opacity-50"
                                    >
                                        {completingKey === key
                                            ? '처리 중'
                                            : '보냈어요 ✓'}
                                    </button>
                                ) : (
                                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-extrabold text-red-500">
                                        미정산
                                    </span>
                                )}
                            </div>
                        )
                    })}
                    {canWrite && onEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="mt-1 w-full rounded-lg bg-slate-50 py-1.5 text-[10px] font-extrabold text-slate-500 transition hover:bg-slate-100"
                        >
                            내역 수정
                        </button>
                    )}
                    {settled && (
                        <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="flex w-full items-center justify-center gap-1 pt-1 text-[9px] font-bold text-slate-300"
                        >
                            접기{' '}
                            <ChevronDownIcon
                                size={11}
                                className="rotate-180"
                            />
                        </button>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="mt-2.5 flex w-full items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[10px] font-bold text-slate-400"
                >
                    <span>{totalCount}명 참여 · 정산 완료</span>
                    <span className="flex items-center gap-0.5">
                        상세 <ChevronDownIcon size={11} />
                    </span>
                </button>
            )}
        </article>
    )
}
