import React, { useMemo, useState } from 'react'
import { PlusIcon, ReceiptTextIcon, XIcon } from 'lucide-react'
import { Expense } from '@/entities/trip'

type Props = {
    expenses: Expense[]
    canWrite: boolean
    onAdd: (expense: Omit<Expense, 'id'>) => void
}

export function ExpensePanel({ expenses, canWrite, onAdd }: Props) {
    const [composerOpen, setComposerOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [isSplit, setIsSplit] = useState(true)

    const summary = useMemo(() => {
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
        return { total, myShare: Math.round(total / 4), balance: 24000 }
    }, [expenses])

    function addExpense() {
        const numericAmount = Number(amount.replace(/,/g, ''))
        if (
            !title.trim() ||
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        )
            return
        onAdd({
            title: title.trim(),
            amount: numericAmount,
            date: '8월 12일',
            paidBy: 'm1',
            participantCount: isSplit ? 4 : 1,
        })
        setTitle('')
        setAmount('')
        setIsSplit(true)
        setComposerOpen(false)
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="mp-scroll flex-1 overflow-y-auto p-4 pb-24">
                <section className="rounded-[22px] bg-[#ecfdf5] p-3">
                    <div className="rounded-[18px] bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900">
                                제주도 우정여행 · 정산
                            </h3>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-600">
                                진행 중
                            </span>
                        </div>
                        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 text-center">
                            <Summary label="총 지출" value={summary.total} />
                            <Summary label="내 부담" value={summary.myShare} />
                            <Summary
                                label="받을 돈"
                                value={summary.balance}
                                tone="text-emerald-600"
                            />
                        </div>
                        <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-700">
                            민수님에게 {formatCurrency(summary.balance)}을 받을
                            예정이에요.
                        </div>
                    </div>
                </section>

                <section className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-slate-900">
                            지출 내역
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400">
                            {expenses.length}건
                        </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                        {expenses.map((expense) => {
                            return (
                                <article
                                    key={expense.id}
                                    className="flex items-center gap-3 border-b border-slate-100 p-3.5 last:border-0"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-extrabold text-slate-800">
                                            {expense.title}
                                        </p>
                                        <p className="mt-1 text-[10px] text-slate-400">
                                            멤버 #{expense.paidBy} 결제 · {expense.date}{' '}
                                            ·{' '}
                                            {expense.participantCount > 1
                                                ? `${expense.participantCount}명 더치`
                                                : '개인 지출'}
                                        </p>
                                    </div>
                                    <b className="shrink-0 text-sm tracking-tight text-slate-900">
                                        {formatCurrency(expense.amount)}
                                    </b>
                                </article>
                            )
                        })}
                    </div>
                </section>
            </div>

            {canWrite && (
                <button
                    onClick={() => setComposerOpen(true)}
                    className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(231,101,122,0.26)] hover:bg-brand-700"
                >
                    <PlusIcon size={17} /> 지출 추가
                </button>
            )}

            {composerOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-end bg-slate-950/30 p-3 sm:items-center sm:justify-center"
                    onClick={() => setComposerOpen(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="expense-dialog-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-brand-700">
                                    SPLIT EXPENSE
                                </p>
                                <h3
                                    id="expense-dialog-title"
                                    className="mt-0.5 text-lg font-extrabold"
                                >
                                    지출 추가
                                </h3>
                            </div>
                            <button
                                onClick={() => setComposerOpen(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                                aria-label="지출 추가 닫기"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <label className="mt-5 block text-xs font-bold text-slate-600">
                            항목명
                        </label>
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="예: 렌터카 비용"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-100"
                        />
                        <label className="mt-4 block text-xs font-bold text-slate-600">
                            금액
                        </label>
                        <div className="relative mt-1.5">
                            <input
                                value={amount}
                                inputMode="numeric"
                                onChange={(event) =>
                                    setAmount(
                                        event.target.value.replace(
                                            /[^0-9]/g,
                                            '',
                                        ),
                                    )
                                }
                                placeholder="0"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                원
                            </span>
                        </div>
                        <button
                            onClick={() => setIsSplit((value) => !value)}
                            className={`mt-4 flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-bold ${isSplit ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}
                        >
                            <span>멤버 4명과 더치페이</span>
                            <span
                                className={`flex h-5 w-9 items-center rounded-full p-0.5 ${isSplit ? 'justify-end bg-brand' : 'bg-slate-300'}`}
                            >
                                <span className="h-4 w-4 rounded-full bg-white" />
                            </span>
                        </button>
                        <button
                            disabled={!title.trim() || !amount}
                            onClick={addExpense}
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-200"
                        >
                            <ReceiptTextIcon size={16} /> 지출 저장
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function Summary({
    label,
    value,
    tone = 'text-slate-900',
}: {
    label: string
    value: number
    tone?: string
}) {
    return (
        <div className="px-1">
            <p className="text-[10px] font-medium text-slate-400">{label}</p>
            <b className={`mt-1.5 block text-sm tracking-tight ${tone}`}>
                {formatCurrency(value)}
            </b>
        </div>
    )
}

function formatCurrency(value: number) {
    return `${value.toLocaleString('ko-KR')}원`
}
