import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
    CalendarDaysIcon,
    CircleDollarSignIcon,
    FileTextIcon,
    PencilIcon,
    PlusIcon,
    ReceiptTextIcon,
    XIcon,
} from 'lucide-react'
import { resolveMediaUrl } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { Avatar, DEFAULT_AVATAR_COLOR, Select } from '@/shared/ui'
import {
    completeExpenseParticipant,
    createExpense,
    fetchExpenseData,
    updateExpense,
} from '../api/expense-api'
import type {
    ExpenseContext,
    ExpenseResponse,
    SettlementSummary,
} from '../api/expense-api'
import {
    ExpenseSettlementCard,
    isExpenseSettled,
} from './expense-settlement-card'

type Props = {
    tripId: number
    canWrite: boolean
    composerOnly?: boolean
    initialComposerOpen?: boolean
    initialEditingExpense?: ExpenseResponse | null
    onComposerClose?: () => void
    onChanged?: () => void
}

const EMPTY_SETTLEMENT: SettlementSummary = {
    totalExpense: 0,
    myReceivable: 0,
    myPayable: 0,
    pendingExpenseCount: 0,
    completedExpenseCount: 0,
}
const EMPTY_CONTEXT: ExpenseContext = {
    startDate: null,
    endDate: null,
    members: [],
    scheduleConfirmed: false,
}

export function ExpensePanel({
    tripId,
    canWrite,
    composerOnly = false,
    initialComposerOpen = false,
    initialEditingExpense = null,
    onComposerClose,
    onChanged,
}: Props) {
    const currentMemberId = useCurrentUserStore(
        (state) => state.currentUser?.id ?? null,
    )
    const isEditingRef = useRef(initialEditingExpense != null)
    const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
    const [context, setContext] = useState(EMPTY_CONTEXT)
    const [settlement, setSettlement] = useState(EMPTY_SETTLEMENT)
    const [composerOpen, setComposerOpen] = useState(initialComposerOpen)
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(
        initialEditingExpense?.id ?? null,
    )
    const [title, setTitle] = useState(initialEditingExpense?.title ?? '')
    const [category, setCategory] = useState(
        initialEditingExpense?.category ?? 'ETC',
    )
    const [amount, setAmount] = useState(
        initialEditingExpense ? String(initialEditingExpense.totalAmount) : '',
    )
    const [expenseDate, setExpenseDate] = useState(
        initialEditingExpense?.expenseDate ?? '',
    )
    const [payerId, setPayerId] = useState<number | null>(
        initialEditingExpense?.payerId ?? null,
    )
    const [participantIds, setParticipantIds] = useState<number[]>(
        initialEditingExpense?.participants.map(
            (participant) => participant.memberId,
        ) ?? [],
    )
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [scopeView, setScopeView] = useState<'all' | 'mine'>('all')
    const [statusView, setStatusView] = useState<'pending' | 'completed'>(
        'pending',
    )
    const [completingKey, setCompletingKey] = useState<string | null>(null)
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
    const scopedExpenses = useMemo(() => {
        if (scopeView === 'all') return expenses
        return expenses.filter(
            (expense) =>
                expense.payerId === currentMemberId ||
                expense.participants.some(
                    (participant) => participant.memberId === currentMemberId,
                ),
        )
    }, [currentMemberId, expenses, scopeView])
    const pendingExpenses = scopedExpenses.filter(
        (expense) => !isExpenseSettled(expense),
    )
    const completedExpenses = scopedExpenses.filter(isExpenseSettled)
    const visibleExpenses =
        statusView === 'pending' ? pendingExpenses : completedExpenses

    async function load() {
        try {
            const data = await fetchExpenseData(tripId)
            setExpenses(data.expenses)
            setContext(data.context)
            setSettlement(data.settlement)
            if (editingExpenseId == null) {
                setPayerId(
                    (current) =>
                        current ?? data.context.members[0]?.memberId ?? null,
                )
                setParticipantIds(
                    data.context.members.map((member) => member.memberId),
                )
            }
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
                if (!isEditingRef.current) {
                    setPayerId(data.context.members[0]?.memberId ?? null)
                    setParticipantIds(
                        data.context.members.map((member) => member.memberId),
                    )
                }
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

    function startEditing(expense: ExpenseResponse) {
        setEditingExpenseId(expense.id)
        setTitle(expense.title)
        setCategory(expense.category)
        setAmount(String(expense.totalAmount))
        setExpenseDate(expense.expenseDate)
        setPayerId(expense.payerId)
        setParticipantIds(
            expense.participants.map((participant) => participant.memberId),
        )
        setComposerOpen(true)
    }

    async function submit() {
        const totalAmount = Number(amount)
        const selected = participantIds
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
            const body = {
                title: title.trim(),
                category,
                totalAmount,
                expenseDate,
                payerId,
                splitType: 'EQUAL' as const,
                participantIds: selected,
                customShares: null,
                memo: null,
            }
            if (editingExpenseId != null) {
                await updateExpense(tripId, editingExpenseId, body)
            } else {
                await createExpense(tripId, body)
            }
            await load()
            onChanged?.()
            setTitle('')
            setAmount('')
            setExpenseDate('')
            setCategory('ETC')
            setEditingExpenseId(null)
            setComposerOpen(false)
            onComposerClose?.()
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : editingExpenseId != null
                      ? '지출 수정에 실패했습니다.'
                      : '지출 등록에 실패했습니다.',
            )
        } finally {
            setSaving(false)
        }
    }

    function closeComposer() {
        setComposerOpen(false)
        setEditingExpenseId(null)
        onComposerClose?.()
    }

    async function completeParticipant(expenseId: number, memberId: number) {
        setCompletingKey(`${expenseId}:${memberId}`)
        setError(null)
        try {
            await completeExpenseParticipant(tripId, expenseId, memberId)
            await load()
            onChanged?.()
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : '정산 완료 처리에 실패했습니다.',
            )
        } finally {
            setCompletingKey(null)
        }
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <div
                className={`mp-scroll flex-1 overflow-y-auto p-4 pb-24 ${composerOnly ? 'invisible' : ''}`}
            >
                <section className="rounded-[22px] bg-[var(--color-app-navy)]/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-extrabold text-[var(--color-app-navy)]">
                            더치페이 현황
                        </h3>
                        <div className="flex items-center rounded-full bg-white p-0.5 text-[10px] font-extrabold">
                            <button
                                type="button"
                                onClick={() => setScopeView('all')}
                                className={`rounded-full px-2.5 py-1 transition ${scopeView === 'all' ? 'bg-[var(--color-app-navy)] text-white' : 'text-slate-400'}`}
                            >
                                전체
                            </button>
                            <button
                                type="button"
                                onClick={() => setScopeView('mine')}
                                className={`rounded-full px-2.5 py-1 transition ${scopeView === 'mine' ? 'bg-[var(--color-app-navy)] text-white' : 'text-slate-400'}`}
                            >
                                내 몫
                            </button>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] text-slate-400">
                                총 지출
                            </p>
                            <b className="text-sm">
                                {currency(settlement.totalExpense)}
                            </b>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] text-slate-400">
                                내가 받을 돈 · 보낼 돈
                            </p>
                            <b className="text-sm text-brand-700">
                                +{currency(settlement.myReceivable)}
                            </b>
                            <span className="mx-1 text-slate-300">/</span>
                            <b className="text-sm text-slate-700">
                                {currency(settlement.myPayable)}
                            </b>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 border-b border-white text-xs font-extrabold text-[var(--color-app-navy)]">
                        <button
                            type="button"
                            onClick={() => setStatusView('pending')}
                            className={`relative pb-2 ${statusView === 'pending' ? '' : 'opacity-40'}`}
                        >
                            정산 대기 {pendingExpenses.length}
                            {statusView === 'pending' && (
                                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--color-app-navy)]" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusView('completed')}
                            className={`relative pb-2 ${statusView === 'completed' ? '' : 'opacity-40'}`}
                        >
                            정산 완료 {completedExpenses.length}
                            {statusView === 'completed' && (
                                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--color-app-navy)]" />
                            )}
                        </button>
                    </div>
                    <div className="mt-3 space-y-2">
                        {visibleExpenses.length === 0 && (
                            <p className="rounded-xl bg-white py-5 text-center text-[10px] font-bold text-slate-400">
                                {statusView === 'pending'
                                    ? '정산 대기 중인 지출이 없습니다.'
                                    : '정산 완료된 지출이 없습니다.'}
                            </p>
                        )}
                        {visibleExpenses.map((expense) => (
                            <ExpenseSettlementCard
                                key={expense.id}
                                expense={expense}
                                currentMemberId={currentMemberId}
                                canWrite={canWrite}
                                completingKey={completingKey}
                                onComplete={(memberId) =>
                                    void completeParticipant(
                                        expense.id,
                                        memberId,
                                    )
                                }
                                onEdit={() => startEditing(expense)}
                            />
                        ))}
                    </div>
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
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <b className="text-sm">
                                                        {currency(
                                                            expense.totalAmount,
                                                        )}
                                                    </b>
                                                    {canWrite && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                startEditing(
                                                                    expense,
                                                                )
                                                            }
                                                            aria-label="지출 내역 수정"
                                                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                        >
                                                            <PencilIcon
                                                                size={13}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            {!composerOnly && canWrite && scheduleConfirmed && (
                <button
                    onClick={() => setComposerOpen(true)}
                    className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-extrabold text-white"
                >
                    <PlusIcon size={17} /> 지출 추가
                </button>
            )}
            {!composerOnly && canWrite && !scheduleConfirmed && (
                <p className="absolute bottom-4 left-4 right-4 rounded-xl bg-amber-50 p-3 text-center text-xs font-bold text-amber-700">
                    여행 일정을 먼저 정하면 DAY별 지출을 등록할 수 있습니다.
                </p>
            )}
            {composerOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-end bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center sm:justify-center"
                    onClick={closeComposer}
                >
                    <div
                        className="mp-scroll relative z-[101] max-h-[calc(100%-1.5rem)] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sticky top-0 z-20 grid grid-cols-[2rem_1fr_2rem] items-center bg-white pb-2">
                            <span aria-hidden="true" />
                            <h3 className="text-center text-sm font-extrabold">
                                {editingExpenseId != null
                                    ? '지출 수정'
                                    : '1/N 더치페이'}
                            </h3>
                            <button
                                type="button"
                                onClick={closeComposer}
                                aria-label="지출 추가 닫기"
                                className="relative z-30 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-[var(--color-app-navy)]"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className="py-7 text-center">
                            <p className="text-2xl font-black text-slate-900">
                                {amount
                                    ? `${Number(amount).toLocaleString('ko-KR')}원을`
                                    : '금액을 입력하고'}
                            </p>
                            <p className="mt-1 text-2xl font-black text-slate-900">
                                <span className="text-brand">
                                    {participantIds.length}명
                                </span>
                                과 나눌게요
                            </p>
                            <p className="mt-3 text-xs text-slate-400">
                                1인당{' '}
                                <b className="text-[var(--color-app-navy)]">
                                    {currency(
                                        participantIds.length > 0
                                            ? Math.floor(
                                                  Number(amount || 0) /
                                                      participantIds.length,
                                              )
                                            : 0,
                                    )}
                                </b>
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 pb-2">
                            {members.map((member) => {
                                const selected = participantIds.includes(
                                    member.memberId,
                                )
                                return (
                                    <button
                                        key={member.memberId}
                                        type="button"
                                        onClick={() =>
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
                                        className="group flex w-16 shrink-0 flex-col items-center gap-1.5"
                                    >
                                        <span
                                            className={`relative isolate overflow-visible rounded-full transition ${
                                                selected
                                                    ? 'ring-2 ring-brand/40 ring-offset-2'
                                                    : 'opacity-45 grayscale'
                                            }`}
                                        >
                                            <Avatar
                                                name={member.nickname}
                                                color={DEFAULT_AVATAR_COLOR}
                                                size={48}
                                                imageUrl={resolveMediaUrl(
                                                    member.profileImageUrl,
                                                )}
                                            />
                                            {selected && (
                                                <span className="absolute -right-2 -top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--color-app-navy)] text-white shadow-md transition group-hover:scale-110">
                                                    <XIcon size={11} />
                                                </span>
                                            )}
                                        </span>
                                        <span className="w-full truncate text-[10px] font-bold text-slate-600">
                                            {member.nickname}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-5 space-y-3">
                            <ExpenseField
                                label="지출 항목"
                                icon={<FileTextIcon size={16} />}
                            >
                                <input
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(event.target.value)
                                    }
                                    placeholder="예: 흑돼지 저녁 식사"
                                    maxLength={100}
                                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400"
                                />
                            </ExpenseField>
                            <ExpenseField
                                label="결제 금액"
                                icon={<CircleDollarSignIcon size={16} />}
                            >
                                <div className="flex items-center">
                                    <input
                                        value={
                                            amount
                                                ? Number(amount).toLocaleString(
                                                      'ko-KR',
                                                  )
                                                : ''
                                        }
                                        onChange={(event) =>
                                            setAmount(
                                                event.target.value.replace(
                                                    /[^0-9]/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        placeholder="0"
                                        inputMode="numeric"
                                        className="min-w-0 flex-1 bg-transparent text-right text-sm font-extrabold text-slate-800 outline-none placeholder:text-slate-300"
                                    />
                                    <span className="ml-1 text-sm font-bold text-slate-500">
                                        원
                                    </span>
                                </div>
                            </ExpenseField>
                            <ExpenseField
                                label="지출 날짜"
                                icon={<CalendarDaysIcon size={16} />}
                            >
                                <Select
                                    value={expenseDate}
                                    onChange={setExpenseDate}
                                    aria-label="지출 날짜 선택"
                                    options={[
                                        {
                                            value: '',
                                            label: 'DAY를 선택해 주세요',
                                        },
                                        ...dayOptions.map((option) => ({
                                            value: option.date,
                                            label: `DAY ${option.dayNumber} · ${option.label}`,
                                        })),
                                    ]}
                                    menuClassName="!z-[120]"
                                    className="[&>button]:rounded-xl [&>button]:px-0 [&>button]:py-1 [&>button]:text-sm [&>button]:text-slate-700 [&>button:hover]:bg-transparent"
                                />
                            </ExpenseField>
                            <ExpenseField
                                label="결제한 사람"
                                icon={<ReceiptTextIcon size={16} />}
                            >
                                <Select
                                    value={payerId?.toString() ?? ''}
                                    onChange={(value) =>
                                        setPayerId(value ? Number(value) : null)
                                    }
                                    aria-label="결제자 선택"
                                    options={[
                                        {
                                            value: '',
                                            label: '결제자를 선택해 주세요',
                                        },
                                        ...members.map((member) => ({
                                            value: member.memberId.toString(),
                                            label: member.nickname,
                                            leading: (
                                                <Avatar
                                                    name={member.nickname}
                                                    color={DEFAULT_AVATAR_COLOR}
                                                    size={20}
                                                    imageUrl={resolveMediaUrl(
                                                        member.profileImageUrl,
                                                    )}
                                                />
                                            ),
                                        })),
                                    ]}
                                    menuClassName="!z-[120]"
                                    className="[&>button]:rounded-xl [&>button]:px-0 [&>button]:py-1 [&>button]:text-sm [&>button]:text-slate-700 [&>button:hover]:bg-transparent"
                                />
                            </ExpenseField>
                        </div>
                        <button
                            disabled={saving || participantIds.length === 0}
                            onClick={() => void submit()}
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:shadow-none"
                        >
                            <ReceiptTextIcon size={16} />
                            {saving
                                ? '저장 중...'
                                : editingExpenseId != null
                                  ? '수정 내용 저장'
                                  : '지출 저장'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function ExpenseField({
    label,
    icon,
    children,
}: {
    label: string
    icon: ReactNode
    children: ReactNode
}) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--color-app-navy)]/15">
            <span className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold text-[var(--color-app-navy)]">
                {icon}
                {label}
            </span>
            {children}
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
