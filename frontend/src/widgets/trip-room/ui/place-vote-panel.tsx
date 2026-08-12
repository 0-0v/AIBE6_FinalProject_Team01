import { useEffect, useMemo, useState } from 'react'
import {
    CheckIcon,
    LoaderCircleIcon,
    MapPinIcon,
    PlusIcon,
    SearchIcon,
    SparklesIcon,
    XIcon,
} from 'lucide-react'
import {
    CategoryIcon,
    createTripPlaceVote,
    getTripPlaceVotes,
    respondPlaceVoteById,
    type Place,
    type PlaceVoteSummary,
    buildClosedVotePlaceResults,
    type ClosedVoteFilter,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { hexWithAlpha } from '@/shared/lib'

type Props = {
    tripId: number
    places: Place[]
    canWrite: boolean
    realtimeVersion: number
    onFocusPlace: (placeId: string) => void
}
type VoteChoice = 'AGREE' | 'DISAGREE' | 'OPTION_A' | 'OPTION_B'

export function PlaceVotePanel({
    tripId,
    places,
    canWrite,
    realtimeVersion,
    onFocusPlace,
}: Props) {
    const [votes, setVotes] = useState<PlaceVoteSummary[]>([])
    const [view, setView] = useState<'OPEN' | 'CLOSED'>('OPEN')
    const [closedFilter, setClosedFilter] = useState<ClosedVoteFilter>('ALL')
    const [creating, setCreating] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [votingId, setVotingId] = useState<number | null>(null)
    const [type, setType] = useState<'PLACE_APPROVAL' | 'PLACE_BATTLE'>(
        'PLACE_APPROVAL',
    )
    const [primary, setPrimary] = useState('')
    const [secondary, setSecondary] = useState('')
    const [commentOpen, setCommentOpen] = useState(false)
    const [comment, setComment] = useState('')
    const [error, setError] = useState<string | null>(null)

    async function load() {
        try {
            setVotes(await getTripPlaceVotes(tripId))
            setError(null)
        } catch (requestError) {
            setError(
                getApiErrorMessage(requestError, '투표를 불러오지 못했습니다.'),
            )
        }
    }

    useEffect(() => {
        const controller = new AbortController()
        getTripPlaceVotes(tripId, controller.signal)
            .then((items) => {
                setVotes(items)
                setError(null)
            })
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        getApiErrorMessage(
                            requestError,
                            '투표를 불러오지 못했습니다.',
                        ),
                    )
                }
            })
        return () => controller.abort()
    }, [tripId, realtimeVersion])

    useEffect(() => {
        if (!creating) return
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !submitting) setCreating(false)
        }
        window.addEventListener('keydown', closeOnEscape)
        return () => window.removeEventListener('keydown', closeOnEscape)
    }, [creating, submitting])

    const openPlaceIds = useMemo(
        () =>
            new Set(
                votes
                    .filter((vote) => vote.status === 'OPEN')
                    .flatMap((vote) => [
                        vote.tripPlaceId,
                        vote.secondaryTripPlaceId,
                    ])
                    .filter((id): id is number => id != null),
            ),
        [votes],
    )
    const closedPlaceIds = useMemo(
        () =>
            new Set(
                votes
                    .filter((vote) => vote.status === 'CLOSED')
                    .flatMap((vote) => [
                        vote.tripPlaceId,
                        vote.secondaryTripPlaceId,
                    ])
                    .filter((id): id is number => id != null),
            ),
        [votes],
    )
    const selectedPrimary = places.find((place) => place.id === primary)

    const visible = useMemo(
        () =>
            votes.filter((vote) => {
                if (vote.status !== view) return false
                return view === 'OPEN'
            }),
        [view, votes],
    )

    const closedResults = useMemo(
        () => buildClosedVotePlaceResults(votes, closedFilter),
        [closedFilter, votes],
    )

    function resetForm() {
        setType('PLACE_APPROVAL')
        setPrimary('')
        setSecondary('')
        setComment('')
        setCommentOpen(false)
    }

    function isSameAsPrimary(place: Place) {
        if (!selectedPrimary) return false
        return (
            place.id === selectedPrimary.id ||
            Boolean(
                place.googlePlaceId &&
                place.googlePlaceId === selectedPrimary.googlePlaceId,
            )
        )
    }

    async function createVote() {
        const samePlace =
            type === 'PLACE_BATTLE' &&
            places.some(
                (place) => place.id === secondary && isSameAsPrimary(place),
            )
        if (
            !primary ||
            (type === 'PLACE_BATTLE' && (!secondary || samePlace))
        ) {
            setError(
                type === 'PLACE_BATTLE'
                    ? '서로 다른 두 장소를 선택해 주세요.'
                    : '장소를 선택해 주세요.',
            )
            return
        }
        if (
            openPlaceIds.has(Number(primary)) ||
            (secondary && openPlaceIds.has(Number(secondary)))
        ) {
            setError(
                '이미 투표가 진행 중인 장소입니다. 진행 중 투표를 먼저 확인해 주세요.',
            )
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            await createTripPlaceVote(tripId, {
                type,
                primaryTripPlaceId: Number(primary),
                secondaryTripPlaceId:
                    type === 'PLACE_BATTLE' ? Number(secondary) : undefined,
                creatorComment: comment.trim() || undefined,
            })
            setCreating(false)
            resetForm()
            await load()
        } catch (requestError) {
            setError(
                getApiErrorMessage(requestError, '투표를 만들지 못했습니다.'),
            )
            await load()
        } finally {
            setSubmitting(false)
        }
    }

    async function respond(voteRequestId: number, choice: VoteChoice) {
        if (votingId != null) return
        setVotingId(voteRequestId)
        setError(null)
        try {
            await respondPlaceVoteById(tripId, voteRequestId, choice)
            await load()
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, '투표하지 못했습니다.'))
            await load()
        } finally {
            setVotingId(null)
        }
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-slate-50/60">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                <div className="flex gap-2">
                    {(['OPEN', 'CLOSED'] as const).map((status) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => setView(status)}
                            className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${view === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            {status === 'OPEN'
                                ? `진행 중 ${votes.filter((vote) => vote.status === status).length}`
                                : `종료 ${votes.filter((vote) => vote.status === status).length}`}
                        </button>
                    ))}
                </div>
                {canWrite && (
                    <button
                        type="button"
                        onClick={() => {
                            resetForm()
                            setError(null)
                            setCreating(true)
                        }}
                        className="flex items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-700 transition hover:bg-brand-100"
                    >
                        <PlusIcon size={14} /> 투표 만들기
                    </button>
                )}
            </div>

            {view === 'CLOSED' && (
                <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2">
                    {(
                        [
                            ['ALL', '전체'],
                            ['SELECTED', '선정된 장소'],
                            ['NOT_SELECTED', '미선정 장소'],
                            ['TIE', '무승부'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setClosedFilter(key)}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${closedFilter === key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <p
                    role="alert"
                    className="mx-4 mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-medium text-rose-600"
                >
                    {error}
                </p>
            )}
            <div className="mp-scroll flex-1 space-y-3 overflow-y-auto p-4">
                {(view === 'OPEN' ? visible.length : closedResults.length) ===
                0 ? (
                    <p className="py-16 text-center text-sm text-slate-400">
                        표시할 투표가 없습니다.
                    </p>
                ) : view === 'OPEN' ? (
                    visible.map((item) => (
                        <VoteCard
                            key={item.voteRequestId}
                            vote={item}
                            submitting={votingId === item.voteRequestId}
                            onVote={(choice) =>
                                void respond(item.voteRequestId, choice)
                            }
                            places={places}
                            onFocusPlace={onFocusPlace}
                        />
                    ))
                ) : (
                    closedResults.map((entry) => (
                        <VoteResultPlaceCard
                            key={`${entry.vote.voteRequestId}-${entry.place.tripPlaceId}`}
                            {...entry}
                            places={places}
                            onFocusPlace={onFocusPlace}
                        />
                    ))
                )}
            </div>

            {creating && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !submitting)
                            setCreating(false)
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-place-vote-title"
                        className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl"
                    >
                        <header className="flex items-start justify-between bg-gradient-to-br from-brand-50 via-white to-rose-50 px-6 py-5">
                            <div>
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
                                    <SparklesIcon size={19} />
                                </div>
                                <h2
                                    id="create-place-vote-title"
                                    className="text-xl font-black text-slate-900"
                                >
                                    새 장소 투표
                                </h2>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    멤버들이 비교하기 쉽도록 AI가 장소 정보를
                                    함께 정리해요.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setCreating(false)}
                                aria-label="투표 만들기 닫기"
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-40"
                            >
                                <XIcon size={19} />
                            </button>
                        </header>
                        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
                            <fieldset>
                                <legend className="mb-2 text-xs font-extrabold text-slate-700">
                                    투표 방식
                                </legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {(
                                        [
                                            'PLACE_APPROVAL',
                                            'PLACE_BATTLE',
                                        ] as const
                                    ).map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => {
                                                setType(value)
                                                setSecondary('')
                                            }}
                                            className={`rounded-2xl border p-3 text-left transition ${type === value ? 'border-brand bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <b className="block text-sm text-slate-900">
                                                {value === 'PLACE_APPROVAL'
                                                    ? '찬반 투표'
                                                    : 'A/B 대결'}
                                            </b>
                                            <span className="mt-1 block text-[11px] text-slate-500">
                                                {value === 'PLACE_APPROVAL'
                                                    ? '한 장소를 함께 갈지 결정'
                                                    : '두 장소 중 하나를 선택'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <div
                                className={`grid gap-3 ${type === 'PLACE_BATTLE' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
                            >
                                <PlaceSelect
                                    label={
                                        type === 'PLACE_BATTLE'
                                            ? 'A 장소'
                                            : '투표할 장소'
                                    }
                                    value={primary}
                                    places={places}
                                    openPlaceIds={openPlaceIds}
                                    onChange={(value) => {
                                        setPrimary(value)
                                        if (
                                            secondary &&
                                            places.some(
                                                (place) =>
                                                    place.id === secondary &&
                                                    (place.id === value ||
                                                        Boolean(
                                                            place.googlePlaceId &&
                                                            place.googlePlaceId ===
                                                                places.find(
                                                                    (item) =>
                                                                        item.id ===
                                                                        value,
                                                                )
                                                                    ?.googlePlaceId,
                                                        )),
                                            )
                                        )
                                            setSecondary('')
                                    }}
                                />
                                {type === 'PLACE_BATTLE' && (
                                    <PlaceSelect
                                        label="B 장소"
                                        value={secondary}
                                        places={places}
                                        openPlaceIds={openPlaceIds}
                                        disabledPlace={(place) =>
                                            isSameAsPrimary(place)
                                        }
                                        onChange={setSecondary}
                                    />
                                )}
                            </div>

                            {primary &&
                                closedPlaceIds.has(Number(primary)) &&
                                !openPlaceIds.has(Number(primary)) && (
                                    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                        <CheckIcon
                                            size={15}
                                            className="mt-0.5 shrink-0"
                                        />
                                        <p>
                                            <b>재투표로 진행됩니다.</b>
                                            <br />이 장소는 종료된 투표 이력이
                                            있으며 이전 결과는 그대로
                                            보관됩니다.
                                        </p>
                                    </div>
                                )}

                            {!commentOpen ? (
                                <button
                                    type="button"
                                    onClick={() => setCommentOpen(true)}
                                    className="text-xs font-extrabold text-brand-700 hover:text-brand-800"
                                >
                                    + 만든 사람의 코멘트 남기기
                                </button>
                            ) : (
                                <label className="block">
                                    <span className="mb-2 block text-xs font-extrabold text-slate-700">
                                        투표를 만든 사람의 코멘트{' '}
                                        <em className="font-medium not-italic text-slate-400">
                                            선택
                                        </em>
                                    </span>
                                    <textarea
                                        maxLength={500}
                                        rows={3}
                                        value={comment}
                                        onChange={(event) =>
                                            setComment(event.target.value)
                                        }
                                        placeholder="왜 이 장소를 골랐는지 간단히 알려주세요."
                                        className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-100"
                                    />
                                </label>
                            )}
                        </div>
                        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setCreating(false)}
                                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                disabled={
                                    submitting ||
                                    !primary ||
                                    (type === 'PLACE_BATTLE' && !secondary)
                                }
                                onClick={() => void createVote()}
                                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {submitting ? (
                                    <span className="inline-flex items-center gap-2">
                                        <LoaderCircleIcon
                                            size={15}
                                            className="animate-spin"
                                        />
                                        AI가 장소 정보 정리 중...
                                    </span>
                                ) : closedPlaceIds.has(Number(primary)) ? (
                                    '재투표 시작'
                                ) : (
                                    '투표 시작'
                                )}
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    )
}

function PlaceSelect({
    label,
    value,
    places,
    openPlaceIds,
    disabledPlace,
    onChange,
}: {
    label: string
    value: string
    places: Place[]
    openPlaceIds: Set<number>
    disabledPlace?: (place: Place) => boolean
    onChange: (value: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const selected = places.find((place) => place.id === value)
    const candidates = places.filter((place) => {
        const keyword = query.trim().toLowerCase()
        return (
            keyword.length === 0 ||
            place.name.toLowerCase().includes(keyword) ||
            place.address.toLowerCase().includes(keyword) ||
            place.categoryName.toLowerCase().includes(keyword)
        )
    })

    return (
        <div className="relative">
            <span className="mb-2 block text-xs font-extrabold text-slate-700">
                {label}{' '}
                <em className="font-medium not-italic text-rose-500">필수</em>
            </span>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition ${open ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200 hover:border-slate-300'}`}
            >
                {selected ? (
                    <>
                        <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{
                                backgroundColor: hexWithAlpha(
                                    selected.categoryColor,
                                    '18',
                                ),
                                color: selected.categoryColor,
                            }}
                        >
                            <CategoryIcon
                                icon={selected.categoryIcon}
                                size={18}
                            />
                        </span>
                        <span className="min-w-0 flex-1">
                            <b className="block truncate text-sm text-slate-800">
                                {selected.name}
                            </b>
                            <span className="block truncate text-[11px] text-slate-400">
                                {selected.address}
                            </span>
                        </span>
                    </>
                ) : (
                    <span className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPinIcon size={16} /> 장소를 선택해 주세요
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                        <SearchIcon size={14} className="text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="장소명, 주소, 카테고리 검색"
                            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                        />
                    </div>
                    <ul className="mp-scroll max-h-56 overflow-y-auto p-1.5">
                        {candidates.map((place) => {
                            const active = openPlaceIds.has(Number(place.id))
                            const same = disabledPlace?.(place) ?? false
                            const disabled = active || same
                            return (
                                <li key={place.id}>
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                            onChange(place.id)
                                            setQuery('')
                                            setOpen(false)
                                        }}
                                        className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <span
                                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                backgroundColor: hexWithAlpha(
                                                    place.categoryColor,
                                                    '18',
                                                ),
                                                color: place.categoryColor,
                                            }}
                                        >
                                            <CategoryIcon
                                                icon={place.categoryIcon}
                                                size={16}
                                            />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5">
                                                <b className="truncate text-sm text-slate-800">
                                                    {place.name}
                                                </b>
                                                <em className="shrink-0 text-[10px] font-bold not-italic text-slate-400">
                                                    {place.categoryName}
                                                </em>
                                            </span>
                                            <span className="block truncate text-[11px] text-slate-400">
                                                {active
                                                    ? '투표 진행 중'
                                                    : same
                                                      ? '같은 장소는 선택할 수 없음'
                                                      : place.address}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                        {candidates.length === 0 && (
                            <li className="py-8 text-center text-xs text-slate-400">
                                검색 결과가 없습니다.
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}

function VoteCard({
    vote,
    submitting,
    onVote,
    places,
    onFocusPlace,
}: {
    vote: PlaceVoteSummary
    submitting: boolean
    onVote: (choice: VoteChoice) => void
    places: Place[]
    onFocusPlace: (placeId: string) => void
}) {
    const battle = vote.type === 'PLACE_BATTLE'
    return (
        <article className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
            {battle ? (
                <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
                    {[vote.primaryPlace, vote.secondaryPlace!].map(
                        (option, index) => (
                            <div
                                key={option.tripPlaceId}
                                className="min-w-0 bg-white p-4"
                            >
                                <PlaceIdentity
                                    option={option}
                                    place={findPlace(
                                        places,
                                        option.tripPlaceId,
                                    )}
                                    prefix={index === 0 ? 'A' : 'B'}
                                    onFocusPlace={onFocusPlace}
                                />
                                <AiDescription text={option.aiDescription} />
                                <VoteButton
                                    disabled={submitting}
                                    active={
                                        vote.myChoice ===
                                        (index === 0 ? 'OPTION_A' : 'OPTION_B')
                                    }
                                    onClick={() =>
                                        onVote(
                                            index === 0
                                                ? 'OPTION_A'
                                                : 'OPTION_B',
                                        )
                                    }
                                    label={`${index === 0 ? 'A' : 'B'} 선택`}
                                    count={
                                        index === 0
                                            ? vote.agreeCount
                                            : vote.disagreeCount
                                    }
                                />
                            </div>
                        ),
                    )}
                </div>
            ) : (
                <div className="p-4">
                    <PlaceIdentity
                        option={vote.primaryPlace}
                        place={findPlace(places, vote.primaryPlace.tripPlaceId)}
                        onFocusPlace={onFocusPlace}
                    />
                    <AiDescription text={vote.primaryPlace.aiDescription} />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <VoteButton
                            disabled={submitting}
                            active={vote.myChoice === 'AGREE'}
                            onClick={() => onVote('AGREE')}
                            label="찬성"
                            count={vote.agreeCount}
                        />
                        <VoteButton
                            disabled={submitting}
                            active={vote.myChoice === 'DISAGREE'}
                            onClick={() => onVote('DISAGREE')}
                            label="반대"
                            count={vote.disagreeCount}
                        />
                    </div>
                </div>
            )}
            {vote.comparisonSummary && (
                <p className="mx-4 mb-3 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
                    {vote.comparisonSummary}
                </p>
            )}
            {vote.creatorComment && (
                <div className="border-t border-slate-100 px-4 py-3">
                    <b className="text-[11px] text-slate-500">
                        투표를 만든 사람의 코멘트
                    </b>
                    <p className="mt-1 text-xs text-slate-700">
                        {vote.creatorComment}
                    </p>
                </div>
            )}
        </article>
    )
}

function VoteResultPlaceCard({
    vote,
    place: option,
    outcome,
    places,
    onFocusPlace,
}: {
    vote: PlaceVoteSummary
    place: PlaceVoteSummary['primaryPlace']
    outcome: 'SELECTED' | 'NOT_SELECTED' | 'TIE'
    places: Place[]
    onFocusPlace: (placeId: string) => void
}) {
    const localPlace = findPlace(places, option.tripPlaceId)
    const optionA = vote.primaryPlace.tripPlaceId === option.tripPlaceId
    const count = optionA ? vote.agreeCount : vote.disagreeCount
    return (
        <article className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
            <div className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${outcome === 'SELECTED' ? 'bg-amber-50 text-amber-700' : outcome === 'TIE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                        {outcome === 'SELECTED'
                            ? '투표 선정'
                            : outcome === 'TIE'
                              ? '무승부'
                              : '미선정'}
                    </span>
                    <span className="text-xs font-extrabold text-slate-500">
                        {count}표
                    </span>
                </div>
                <PlaceIdentity
                    option={option}
                    place={localPlace}
                    prefix={
                        vote.type === 'PLACE_BATTLE'
                            ? optionA
                                ? 'A'
                                : 'B'
                            : undefined
                    }
                    onFocusPlace={onFocusPlace}
                />
                <AiDescription text={option.aiDescription} />
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
                {vote.type === 'PLACE_BATTLE'
                    ? `${vote.primaryPlace.name} VS ${vote.secondaryPlace?.name}`
                    : `${vote.primaryPlace.name} 찬반 투표`}{' '}
                결과
            </div>
        </article>
    )
}

function findPlace(places: Place[], tripPlaceId: number) {
    return places.find((place) => Number(place.id) === tripPlaceId)
}

function PlaceIdentity({
    option,
    place,
    prefix,
    onFocusPlace,
}: {
    option: PlaceVoteSummary['primaryPlace']
    place?: Place
    prefix?: string
    onFocusPlace: (placeId: string) => void
}) {
    return (
        <div className="flex min-w-0 gap-3">
            <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                    backgroundColor: place
                        ? hexWithAlpha(place.categoryColor, '18')
                        : '#f1f5f9',
                    color: place?.categoryColor ?? '#64748b',
                }}
            >
                {place ? (
                    <CategoryIcon icon={place.categoryIcon} size={22} />
                ) : (
                    <MapPinIcon size={20} />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    {prefix && (
                        <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
                            {prefix}
                        </span>
                    )}
                    <b className="truncate text-sm text-slate-900">
                        {option.name}
                    </b>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                    {option.address || '주소 정보 없음'}
                </p>
                {place && (
                    <button
                        type="button"
                        onClick={() => onFocusPlace(place.id)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-700 hover:underline"
                    >
                        <MapPinIcon size={12} /> 지도에서 보기
                    </button>
                )}
            </div>
        </div>
    )
}

function AiDescription({ text }: { text: string | null }) {
    return text ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <b className="text-[11px] text-brand-700">AI 장소 정보</b>
            <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
        </div>
    ) : null
}

function VoteButton({
    disabled,
    active,
    onClick,
    label,
    count,
}: {
    disabled: boolean
    active: boolean
    onClick: () => void
    label: string
    count: number
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`w-full rounded-xl border py-2.5 text-xs font-extrabold transition disabled:opacity-50 ${active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50'}`}
        >
            {label} · {count}
        </button>
    )
}
