import { useEffect, useMemo, useState } from 'react'
import { PlusIcon, ReceiptTextIcon, XIcon } from 'lucide-react'
import { createExpense, fetchExpenseData } from '../api/expense-api'
import type {
    ExpenseContext,
    ExpenseResponse,
    SettlementSummary,
} from '../api/expense-api'

type Props = { tripId: number; canWrite: boolean }

const EMPTY_SETTLEMENT: SettlementSummary = {
    totalExpense: 0,
    members: [],
    transfers: [],
}
const EMPTY_CONTEXT: ExpenseContext = {
    startDate: null,
    endDate: null,
    members: [],
    scheduleConfirmed: false,
}

export function ExpensePanel({ tripId, canWrite }: Props) {
    const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
    const [context, setContext] = useState(EMPTY_CONTEXT)
    const [settlement, setSettlement] = useState(EMPTY_SETTLEMENT)
    const [composerOpen, setComposerOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [expenseDate, setExpenseDate] = useState('')
    const [payerId, setPayerId] = useState<number | null>(null)
    const [allMembers, setAllMembers] = useState(true)
    const [participantIds, setParticipantIds] = useState<number[]>([])
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const members = context.members
    const scheduleConfirmed = Boolean(context.startDate && context.endDate)
    const dayOptions = useMemo(
        () => createDayOptions(context.startDate, context.endDate),
        [context.endDate, context.startDate],
    )
    const expensesByDay = useMemo(
        () =>
            Object.entries(
                expenses.reduce<Record<number, ExpenseResponse[]>>(
                    (groups, expense) => {
                        if (expense.dayNumber === null) return groups
                        ;(groups[expense.dayNumber] ??= []).push(expense)
                        return groups
                    },
                    {},
                ),
            ).sort(([left], [right]) => Number(left) - Number(right)),
        [expenses],
    )

    async function load() {
        try {
            const data = await fetchExpenseData(tripId)
            setExpenses(data.expenses)
            setContext(data.context)
            setSettlement(data.settlement)
            setPayerId(
                (current) =>
                    current ?? data.context.members[0]?.memberId ?? null,
            )
            setParticipantIds(
                data.context.members.map((member) => member.memberId),
            )
            setError(null)
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : '지출 내역을 불러오지 못했습니다.',
            )
        }
    }

    useEffect(() => {
        let active = true
        fetchExpenseData(tripId)
            .then((data) => {
                if (!active) return
                setExpenses(data.expenses)
                setContext(data.context)
                setSettlement(data.settlement)
                setPayerId(data.context.members[0]?.memberId ?? null)
                setParticipantIds(
                    data.context.members.map((member) => member.memberId),
                )
                setError(null)
            })
            .catch((requestError: unknown) => {
                if (active) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : '지출 내역을 불러오지 못했습니다.',
                    )
                }
            })
        return () => {
            active = false
        }
    }, [tripId])

    async function submit() {
        const totalAmount = Number(amount)
        const selected = allMembers
            ? members.map((member) => member.memberId)
            : participantIds
        if (
            !title.trim() ||
            totalAmount <= 0 ||
            !expenseDate ||
            payerId === null ||
            selected.length === 0
        )
            return
        setSaving(true)
        try {
            await createExpense(tripId, {
                title: title.trim(),
                category: 'ETC',
                totalAmount,
                expenseDate,
                payerId,
                splitType: 'EQUAL',
                participantIds: selected,
                customShares: null,
                memo: null,
            })
            await load()
            setTitle('')
            setAmount('')
            setExpenseDate('')
            setComposerOpen(false)
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : '지출 등록에 실패했습니다.',
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="mp-scroll flex-1 overflow-y-auto p-4 pb-24">
                <section className="rounded-[22px] bg-emerald-50 p-4">
                    <h3 className="text-sm font-extrabold">여행 지출 · 정산</h3>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                        <Summary
                            label="총 지출"
                            value={settlement.totalExpense}
                        />
                        <Summary
                            label="정산 건수"
                            value={settlement.transfers.length}
                            count
                        />
                    </div>
                    {settlement.transfers.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {settlement.transfers.map((transfer) => (
                                <p
                                    key={`${transfer.senderId}-${transfer.receiverId}`}
                                    className="rounded-xl bg-white p-3 text-xs font-bold"
                                >
                                    {transfer.senderNickname} →{' '}
                                    {transfer.receiverNickname}
                                    <b className="float-right text-emerald-600">
                                        {currency(transfer.amount)}
                                    </b>
                                </p>
                            ))}
                        </div>
                    )}
                </section>
                {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
                <section className="mt-6">
                    <h3 className="mb-3 text-sm font-extrabold">
                        Day별 지출 내역
                    </h3>
                    <div className="space-y-4">
                        {expenses.length === 0 && (
                            <p className="rounded-xl border p-6 text-center text-xs text-slate-400">
                                등록된 지출이 없습니다.
                            </p>
                        )}
                        {expensesByDay.map(([dayNumber, dayExpenses]) => (
                            <div key={dayNumber}>
                                <h4 className="mb-2 text-xs font-extrabold text-brand-700">
                                    DAY {dayNumber} 지출
                                </h4>
                                <div className="space-y-2">
                                    {dayExpenses.map((expense) => (
                                        <article
                                            key={expense.id}
                                            className="rounded-xl border border-slate-100 bg-white p-3"
                                        >
                                            <div className="flex justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-extrabold">
                                                        {expense.title}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-slate-400">
                                                        {expense.payerNickname}{' '}
                                                        결제 ·{' '}
                                                        {
                                                            expense.participants
                                                                .length
                                                        }
                                                        명 더치
                                                    </p>
                                                </div>
                                                <b className="text-sm">
                                                    {currency(
                                                        expense.totalAmount,
                                                    )}
                                                </b>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            {canWrite && scheduleConfirmed && (
                <button
                    onClick={() => setComposerOpen(true)}
                    className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white"
                >
                    <PlusIcon size={17} /> 지출 추가
                </button>
            )}
            {canWrite && !scheduleConfirmed && (
                <p className="absolute bottom-4 left-4 right-4 rounded-xl bg-amber-50 p-3 text-center text-xs font-bold text-amber-700">
                    여행 일정을 먼저 정하면 DAY별 지출을 등록할 수 있습니다.
                </p>
            )}
            {composerOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-end bg-slate-950/30 p-3"
                    onClick={() => setComposerOpen(false)}
                >
                    <div
                        className="w-full rounded-[24px] bg-white p-5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex justify-between">
                            <h3 className="font-extrabold">지출 추가</h3>
                            <button onClick={() => setComposerOpen(false)}>
                                <XIcon size={18} />
                            </button>
                        </div>
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="항목명"
                            className="mt-4 w-full rounded-xl border p-3 text-sm"
                        />
                        <input
                            value={amount}
                            onChange={(event) =>
                                setAmount(
                                    event.target.value.replace(/[^0-9]/g, ''),
                                )
                            }
                            placeholder="금액"
                            inputMode="numeric"
                            className="mt-2 w-full rounded-xl border p-3 text-sm"
                        />
                        <select
                            value={expenseDate}
                            onChange={(event) =>
                                setExpenseDate(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border p-3 text-sm"
                        >
                            <option value="">지출 DAY 선택</option>
                            {dayOptions.map((option) => (
                                <option key={option.date} value={option.date}>
                                    DAY {option.dayNumber} · {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={payerId ?? ''}
                            onChange={(event) =>
                                setPayerId(Number(event.target.value))
                            }
                            className="mt-2 w-full rounded-xl border p-3 text-sm"
                        >
                            <option value="">결제자 선택</option>
                            {members.map((member) => (
                                <option
                                    key={member.memberId}
                                    value={member.memberId}
                                >
                                    {member.nickname}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => setAllMembers((value) => !value)}
                            className={`mt-3 w-full rounded-xl border p-3 text-left text-xs font-bold ${allMembers ? 'border-brand bg-brand-50 text-brand-700' : ''}`}
                        >
                            여행방 전체 멤버와 더치페이
                        </button>
                        {!allMembers && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {members.map((member) => (
                                    <label
                                        key={member.memberId}
                                        className="flex gap-2 rounded-lg border p-2 text-xs"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={participantIds.includes(
                                                member.memberId,
                                            )}
                                            onChange={() =>
                                                setParticipantIds((current) =>
                                                    current.includes(
                                                        member.memberId,
                                                    )
                                                        ? current.filter(
                                                              (id) =>
                                                                  id !==
                                                                  member.memberId,
                                                          )
                                                        : [
                                                              ...current,
                                                              member.memberId,
                                                          ],
                                                )
                                            }
                                        />
                                        {member.nickname}
                                    </label>
                                ))}
                            </div>
                        )}
                        <button
                            disabled={saving}
                            onClick={() => void submit()}
                            className="mt-4 flex w-full justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50"
                        >
                            <ReceiptTextIcon size={16} />
                            {saving ? '저장 중...' : '지출 저장'}
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
    count = false,
}: {
    label: string
    value: number
    count?: boolean
}) {
    return (
        <div className="rounded-xl bg-white p-3">
            <p className="text-[10px] text-slate-400">{label}</p>
            <b className="text-sm">{count ? `${value}건` : currency(value)}</b>
        </div>
    )
}
function currency(value: number) {
    return `${Number(value).toLocaleString('ko-KR')}원`
}

function createDayOptions(startDate: string | null, endDate: string | null) {
    if (!startDate || !endDate) return []
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    const options = []
    let dayNumber = 1
    for (
        let current = start;
        current <= end;
        current = new Date(
            current.getFullYear(),
            current.getMonth(),
            current.getDate() + 1,
        )
    ) {
        const date = [
            current.getFullYear(),
            String(current.getMonth() + 1).padStart(2, '0'),
            String(current.getDate()).padStart(2, '0'),
        ].join('-')
        options.push({
            dayNumber,
            date,
            label: `${current.getMonth() + 1}.${current.getDate()}`,
        })
        dayNumber += 1
    }
    return options
}
