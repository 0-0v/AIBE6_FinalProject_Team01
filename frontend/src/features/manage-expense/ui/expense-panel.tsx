import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
    ArrowRightIcon,
    CalendarDaysIcon,
    CheckCircle2Icon,
    CircleDollarSignIcon,
    FileTextIcon,
    PlusIcon,
    ReceiptTextIcon,
    SendIcon,
    XIcon,
} from 'lucide-react'
import { resolveMediaUrl } from '@/shared/api/client'
import { Avatar, DEFAULT_AVATAR_COLOR, Select } from '@/shared/ui'
import {
    completeSettlementTransfer,
    createExpense,
    fetchExpenseData,
} from '../api/expense-api'
import type {
    ExpenseContext,
    ExpenseResponse,
    SettlementSummary,
} from '../api/expense-api'

type Props = {
    tripId: number
    canWrite: boolean
    composerOnly?: boolean
    initialComposerOpen?: boolean
    onComposerClose?: () => void
    onChanged?: () => void
}

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

export function ExpensePanel({
    tripId,
    canWrite,
    composerOnly = false,
    initialComposerOpen = false,
    onComposerClose,
    onChanged,
}: Props) {
    const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
    const [context, setContext] = useState(EMPTY_CONTEXT)
    const [settlement, setSettlement] = useState(EMPTY_SETTLEMENT)
    const [composerOpen, setComposerOpen] = useState(initialComposerOpen)
    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [expenseDate, setExpenseDate] = useState('')
    const [payerId, setPayerId] = useState<number | null>(null)
    const [participantIds, setParticipantIds] = useState<number[]>([])
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [completingReceiverId, setCompletingReceiverId] = useState<
        number | null
    >(null)
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
    const pendingTransfers = settlement.transfers.filter(
        (transfer) => transfer.status === 'PENDING',
    )
    const completedTransfers = settlement.transfers.filter(
        (transfer) => transfer.status === 'COMPLETED',
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
            onChanged?.()
            setTitle('')
            setAmount('')
            setExpenseDate('')
            setComposerOpen(false)
            onComposerClose?.()
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

    function closeComposer() {
        setComposerOpen(false)
        onComposerClose?.()
    }

    async function completeTransfer(receiverId: number) {
        setCompletingReceiverId(receiverId)
        setError(null)
        try {
            await completeSettlementTransfer(tripId, receiverId)
            await load()
            onChanged?.()
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : '정산 완료 처리에 실패했습니다.',
            )
        } finally {
            setCompletingReceiverId(null)
        }
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <div
                className={`mp-scroll flex-1 overflow-y-auto p-4 pb-24 ${composerOnly ? 'invisible' : ''}`}
            >
                <section className="rounded-[22px] bg-[#213C51]/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-extrabold text-[#213C51]">
                                더치페이 현황
                            </h3>
                            <p className="mt-1 text-[10px] text-slate-400">
                                송금 관계와 완료 여부를 확인해 보세요.
                            </p>
                        </div>
                        <div className="flex gap-1.5 text-[10px] font-extrabold">
                            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
                                진행 중 {pendingTransfers.length}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[#213C51]">
                                완료 {completedTransfers.length}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                        <Summary
                            label="총 지출"
                            value={settlement.totalExpense}
                        />
                        <Summary
                            label="더치페이"
                            value={settlement.transfers.length}
                            count
                        />
                    </div>
                    <TransferSection
                        title="진행 중"
                        transfers={pendingTransfers}
                        completingReceiverId={completingReceiverId}
                        onComplete={(receiverId) =>
                            void completeTransfer(receiverId)
                        }
                    />
                    <TransferSection
                        title="완료"
                        transfers={completedTransfers}
                        completingReceiverId={completingReceiverId}
                        onComplete={(receiverId) =>
                            void completeTransfer(receiverId)
                        }
                    />
                    {settlement.transfers.length === 0 &&
                        settlement.totalExpense > 0 && (
                            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-5 text-xs font-extrabold text-[#213C51]">
                                <CheckCircle2Icon size={17} />
                                모든 정산이 완료됐어요
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
                        className="relative z-[101] max-h-[calc(100%-1.5rem)] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sticky top-0 z-20 grid grid-cols-[2rem_1fr_2rem] items-center bg-white pb-2">
                            <span aria-hidden="true" />
                            <h3 className="text-center text-sm font-extrabold">
                                1/N 더치페이
                            </h3>
                            <button
                                type="button"
                                onClick={closeComposer}
                                aria-label="지출 추가 닫기"
                                className="relative z-30 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-[#213C51]"
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
                                <b className="text-[#213C51]">
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
                                                <span className="absolute -right-2 -top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#213C51] text-white shadow-md transition group-hover:scale-110">
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
                            {saving ? '저장 중...' : '지출 저장'}
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
        <div className="rounded-2xl bg-slate-50 px-4 py-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#213C51]/15">
            <span className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold text-[#213C51]">
                {icon}
                {label}
            </span>
            {children}
        </div>
    )
}

function TransferSection({
    title,
    transfers,
    completingReceiverId,
    onComplete,
}: {
    title: string
    transfers: SettlementSummary['transfers']
    completingReceiverId: number | null
    onComplete: (receiverId: number) => void
}) {
    if (transfers.length === 0) return null
    const completed = title === '완료'
    return (
        <div className="mt-4">
            <p className="mb-2 text-[10px] font-extrabold text-slate-400">
                {title}
            </p>
            <div className="space-y-2">
                {transfers.map((transfer) => (
                    <div
                        key={`${transfer.senderId}-${transfer.receiverId}`}
                        className={`rounded-2xl border bg-white p-3 ${
                            completed
                                ? 'border-slate-100 opacity-65'
                                : 'border-brand-100'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <MemberAvatar name={transfer.senderNickname} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
                                    <span className="truncate">
                                        {transfer.senderNickname}
                                    </span>
                                    <ArrowRightIcon
                                        size={12}
                                        className="shrink-0 text-slate-300"
                                    />
                                    <span className="truncate">
                                        {transfer.receiverNickname}
                                    </span>
                                </div>
                                <b className="mt-1 block text-sm text-[#213C51]">
                                    {currency(transfer.amount)}
                                </b>
                            </div>
                            {completed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-500">
                                    <CheckCircle2Icon size={12} />
                                    완료
                                </span>
                            ) : transfer.canComplete ? (
                                <button
                                    type="button"
                                    disabled={
                                        completingReceiverId ===
                                        transfer.receiverId
                                    }
                                    onClick={() =>
                                        onComplete(transfer.receiverId)
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"
                                >
                                    <SendIcon size={12} />
                                    {completingReceiverId ===
                                    transfer.receiverId
                                        ? '처리 중'
                                        : '보냈어요'}
                                </button>
                            ) : (
                                <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-extrabold text-brand-700">
                                    진행 중
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function MemberAvatar({ name }: { name: string }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#213C51]/10 text-xs font-black text-[#213C51]">
            {initial(name)}
        </span>
    )
}

function initial(name: string) {
    return name.trim().slice(0, 1) || '?'
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
