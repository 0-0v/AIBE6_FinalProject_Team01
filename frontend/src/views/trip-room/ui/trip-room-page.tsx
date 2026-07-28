import React, {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    Globe2Icon,
    LockIcon,
    Settings2Icon,
    SparklesIcon,
} from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
    Place,
    getTripPlaces,
    getTripPlaceAccess,
    getTripPlaceVotes,
    getItinerary,
    addItineraryItem,
    fromApiToPlace,
    type ItineraryDay,
} from '@/entities/trip'
import { AiAgentPanel } from '@/features/ai-organize'
import { useCommentStore } from '@/features/comment-place'
import {
    claimGuestTripAccess,
    ManageTripModal,
    TripCompletionConfirmationModal,
    useTripStore,
} from '@/features/manage-trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import { MapCanvas, RoomDetailPanel, RoomListPanel } from '@/widgets/trip-room'

export function TripRoom() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { roomId, inviteCode } = useParams<{
        roomId?: string
        inviteCode?: string
    }>()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isUserInitialized = useCurrentUserStore(
        (state) => state.isInitialized,
    )
    const {
        trips,
        rooms,
        guestRoom,
        activeTripId,
        isLoading,
        error,
        loadTrips,
        loadInvitedTrip,
        selectTrip,
        resetTrips,
    } = useTripStore()
    const [showRoomList, setShowRoomList] = useState(false)
    const effectiveRoomId = roomId ?? activeTripId
    const room = inviteCode
        ? guestRoom
        : showRoomList
          ? undefined
          : rooms.find((item) => item.id === effectiveRoomId)
    const trip = trips.find((item) => String(item.id) === effectiveRoomId)
    const activeRoomId = room?.id
    const tripId = room?.apiTripId

    const [places, setPlaces] = useState<Place[]>([])
    const [itineraryState, setItineraryState] = useState<{
        tripId: number | undefined
        days: ItineraryDay[]
    }>({ tripId: undefined, days: [] })
    const [itineraryVersion, setItineraryVersion] = useState(0)
    const itineraryDays =
        itineraryState.tripId === tripId ? itineraryState.days : []
    const handleItineraryDaysLoaded = useCallback(
        (days: ItineraryDay[]) => {
            setItineraryState({ tripId, days })
        },
        [tripId],
    )
    const handleAiRouteApplied = useCallback(
        (days: ItineraryDay[]) => {
            setItineraryState({ tripId, days })
            setItineraryVersion((current) => current + 1)
        },
        [tripId],
    )

    const handleAddToSchedule = useCallback(
        async (placeId: string, dayId: string) => {
            if (!tripId) return
            const currentDays =
                itineraryState.tripId === tripId ? itineraryState.days : []
            const targetDay = currentDays.find((d) => String(d.id) === dayId)
            if (!targetDay) return
            await addItineraryItem(
                tripId,
                Number(dayId),
                Number(placeId),
                targetDay.items.length,
            )
            const updated = await getItinerary(tripId)
            setItineraryState({ tripId, days: updated })
        },
        [tripId, itineraryState],
    )
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [collapsed, setCollapsed] = useState(false)
    const [aiOpen, setAiOpen] = useState(false)
    const [manageOpen, setManageOpen] = useState(false)
    const [placesError, setPlacesError] = useState<string | null>(null)
    const [canManagePlaces, setCanManagePlaces] = useState(false)
    const [inviteCodeInput, setInviteCodeInput] = useState('')
    const [verifiedInviteCode, setVerifiedInviteCode] = useState<string | null>(
        null,
    )
    const [inviteCodeError, setInviteCodeError] = useState<string | null>(null)
    const [inviteMode, setInviteMode] = useState<
        'guest' | 'join-confirm' | null
    >(null)
    const [joinError, setJoinError] = useState<string | null>(null)
    const [isJoining, setIsJoining] = useState(false)
    const isReturningFromLogin =
        Boolean(inviteCode) &&
        searchParams.get('join') === 'true' &&
        Boolean(currentUser)

    useEffect(() => {
        if (inviteCode) return
        if (!isUserInitialized) return
        else if (currentUser) void loadTrips()
        else resetTrips()
    }, [
        currentUser,
        inviteCode,
        isUserInitialized,
        loadInvitedTrip,
        loadTrips,
        resetTrips,
    ])

    useEffect(() => {
        if (roomId) selectTrip(roomId)
    }, [roomId, selectTrip])

    useEffect(() => {
        if (
            !inviteCode ||
            !isReturningFromLogin ||
            verifiedInviteCode === inviteCode
        ) {
            return
        }
        void loadInvitedTrip(inviteCode).then((success) => {
            if (!success) return
            setVerifiedInviteCode(inviteCode)
            setInviteMode('join-confirm')
        })
    }, [inviteCode, isReturningFromLogin, loadInvitedTrip, verifiedInviteCode])

    useEffect(() => {
        if (!activeRoomId || !tripId) return
        const controller = new AbortController()
        Promise.all([
            getTripPlaces(tripId, controller.signal),
            getTripPlaceVotes(tripId, controller.signal),
            getTripPlaceAccess(tripId, controller.signal),
        ])
            .then(([tripPlaces, voteSummaries, canEdit]) => {
                setPlacesError(null)
                setCanManagePlaces(canEdit)
                const votesByPlaceId = new Map(
                    voteSummaries.map((vote) => [vote.tripPlaceId, vote]),
                )
                const cachedComments =
                    useCommentStore.getState().commentsByPlaceId
                setPlaces(
                    tripPlaces
                        .filter(
                            (tp) =>
                                votesByPlaceId.get(tp.tripPlaceId)
                                    ?.placeStatus !== 'REJECTED',
                        )
                        .map((tp) => {
                            const place = fromApiToPlace(
                                tp,
                                activeRoomId,
                                votesByPlaceId.get(tp.tripPlaceId),
                            )
                            return {
                                ...place,
                                comments:
                                    cachedComments[place.id] ?? place.comments,
                            }
                        }),
                )
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setPlaces([])
                setCanManagePlaces(false)
                setPlacesError(
                    getApiErrorMessage(
                        error,
                        '여행 장소를 불러오지 못했습니다.',
                    ),
                )
            })
        return () => controller.abort()
    }, [activeRoomId, inviteCode, tripId])

    useEffect(() => {
        if (!tripId) return
        let active = true
        getItinerary(tripId)
            .then((days) => {
                if (active) setItineraryState({ tripId, days })
            })
            .catch(() => {
                if (active) setItineraryState({ tripId, days: [] })
            })

        return () => {
            active = false
        }
    }, [tripId])

    const displayedPlaces = useMemo(
        () =>
            room ? places.filter((place) => place.roomId === room.id) : places,
        [places, room],
    )

    const mapPlaces = useMemo(
        () => displayedPlaces.filter((place) => place.status === 'saved'),
        [displayedPlaces],
    )

    function updatePlace(id: string, update: (place: Place) => Place) {
        setPlaces((current) =>
            current.map((place) => (place.id === id ? update(place) : place)),
        )
    }

    function addPlace(place: Place) {
        setPlaces((current) => [place, ...current])
    }

    function deletePlace(id: string) {
        setPlaces((current) => current.filter((place) => place.id !== id))
    }

    async function handleInviteCodeSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!inviteCode) return

        const normalizedCode = inviteCodeInput.trim()
        if (!normalizedCode) {
            setInviteCodeError('초대 코드를 입력해 주세요.')
            return
        }
        if (normalizedCode !== inviteCode) {
            setInviteCodeError('초대 코드가 일치하지 않습니다.')
            return
        }

        setInviteCodeError(null)
        const success = await loadInvitedTrip(normalizedCode)
        if (success) {
            setVerifiedInviteCode(normalizedCode)
            setInviteMode(null)
        }
    }

    function handleLoginChoice() {
        if (!inviteCode) return
        if (currentUser) {
            setInviteMode('join-confirm')
            return
        }
        sessionStorage.setItem(
            'postLoginReturnPath',
            `/app/room/invite/${encodeURIComponent(inviteCode)}?join=true`,
        )
        navigate('/login')
    }

    async function handleJoinTrip() {
        if (!tripId) return
        setIsJoining(true)
        setJoinError(null)
        try {
            await claimGuestTripAccess()
            selectTrip(String(tripId))
            navigate(`/app/room/${tripId}`, { replace: true })
        } catch (claimError) {
            setJoinError(
                getApiErrorMessage(
                    claimError,
                    '여행방 참여에 실패했습니다. 다시 시도해 주세요.',
                ),
            )
        } finally {
            setIsJoining(false)
        }
    }

    if (
        inviteCode &&
        (verifiedInviteCode !== inviteCode || guestRoom === null)
    ) {
        if (isReturningFromLogin) {
            return (
                <main className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-orange-50">
                    <p className="text-sm font-bold text-slate-500">
                        초대 여행방을 불러오는 중입니다...
                    </p>
                </main>
            )
        }
        return (
            <main className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-orange-50 px-5">
                <section className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                    <div className="mb-7">
                        <p className="text-sm font-extrabold text-brand-700">
                            여행방 초대
                        </p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                            초대 코드를 입력해 주세요
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            전달받은 초대 코드를 확인한 뒤 조회 전용 여행방을
                            열어드릴게요.
                        </p>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={handleInviteCodeSubmit}
                    >
                        <div>
                            <label
                                htmlFor="invite-code"
                                className="mb-2 block text-sm font-bold text-slate-700"
                            >
                                초대 코드
                            </label>
                            <input
                                id="invite-code"
                                value={inviteCodeInput}
                                onChange={(event) => {
                                    setInviteCodeInput(event.target.value)
                                    setInviteCodeError(null)
                                }}
                                placeholder="초대 코드를 입력하세요"
                                autoComplete="off"
                                autoFocus
                                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-brand focus:ring-4 focus:ring-brand-50"
                                aria-describedby="invite-code-error"
                            />
                        </div>
                        {(inviteCodeError || error) && (
                            <p
                                id="invite-code-error"
                                className="text-sm font-semibold text-red-500"
                                role="alert"
                            >
                                {inviteCodeError ?? error}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? '확인 중...' : '여행방 입장하기'}
                        </button>
                    </form>
                </section>
            </main>
        )
    }

    if (inviteCode && guestRoom && inviteMode === null) {
        return (
            <main className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-orange-50 px-5">
                <section className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                    <p className="text-sm font-extrabold text-brand-700">
                        초대 코드 확인 완료
                    </p>
                    <h1 className="mt-2 text-2xl font-black text-slate-900">
                        {guestRoom.title}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        게스트로 둘러보거나 로그인한 계정으로 여행방 참여를
                        진행할 수 있습니다.
                    </p>
                    <div className="mt-7 space-y-3">
                        <button
                            type="button"
                            onClick={() => setInviteMode('guest')}
                            className="flex h-12 w-full items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-sm font-extrabold text-brand-700 transition hover:bg-brand-100"
                        >
                            게스트 모드로 보기
                        </button>
                        <button
                            type="button"
                            onClick={handleLoginChoice}
                            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white transition hover:bg-brand-700"
                        >
                            {currentUser
                                ? '로그인 계정으로 참여'
                                : '로그인하기'}
                        </button>
                    </div>
                </section>
            </main>
        )
    }

    return (
        <div className="flex h-full w-full flex-col">
            {inviteCode && inviteMode === 'guest' && (
                <button
                    type="button"
                    onClick={handleLoginChoice}
                    className="absolute right-7 top-7 z-40 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-brand-700"
                >
                    {currentUser ? '여행방 참여하기' : '로그인하고 참여하기'}
                </button>
            )}
            <div className="relative flex min-h-0 flex-1 flex-row">
                <div className="relative min-w-0 flex-1">
                    <MapCanvas
                        places={mapPlaces}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onDeselect={() => setSelectedId(null)}
                        days={itineraryDays}
                        onAddToSchedule={
                            !inviteCode && canManagePlaces
                                ? handleAddToSchedule
                                : undefined
                        }
                    />
                    {!inviteCode &&
                        trip &&
                        currentUser &&
                        trip.ownerId === currentUser.id &&
                        trip.status === 'COMPLETED' && (
                            <button
                                type="button"
                                onClick={() => setManageOpen(true)}
                                className="absolute left-5 top-5 z-20 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 text-left shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
                                aria-label="완료된 여행방 공개 설정 열기"
                            >
                                <span
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                        trip.visibility === 'PUBLIC'
                                            ? 'bg-brand-50 text-brand-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {trip.visibility === 'PUBLIC' ? (
                                        <Globe2Icon size={18} />
                                    ) : (
                                        <LockIcon size={18} />
                                    )}
                                </span>
                                <span>
                                    <span className="block text-xs font-bold text-slate-400">
                                        완료 여행방 ·{' '}
                                        {trip.visibility === 'PUBLIC'
                                            ? '공개'
                                            : '비공개'}
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-1 text-sm font-extrabold text-slate-800">
                                        공개 설정 열기
                                        <Settings2Icon size={14} />
                                    </span>
                                </span>
                            </button>
                        )}
                    {!inviteCode && canManagePlaces && !aiOpen && (
                        <button
                            onClick={() => setAiOpen(true)}
                            className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-brand-700"
                        >
                            <SparklesIcon size={17} /> 동선 추천
                        </button>
                    )}
                    {collapsed && (
                        <button
                            onClick={() => setCollapsed(false)}
                            className="absolute right-4 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:bg-slate-50"
                            aria-label="여행방 패널 펼치기"
                        >
                            <ChevronLeftIcon size={16} />
                        </button>
                    )}
                </div>

                {!collapsed && (
                    <aside className="relative flex min-h-0 w-full shrink-0 flex-1 flex-col border-t border-slate-200 bg-white lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
                        <button
                            onClick={() => setCollapsed(true)}
                            className="absolute -left-3 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:bg-slate-50 lg:flex"
                            aria-label="여행방 패널 접기"
                        >
                            <ChevronRightIcon size={16} />
                        </button>
                        {room ? (
                            <RoomDetailPanel
                                key={room.id}
                                room={room}
                                places={displayedPlaces}
                                selectedId={selectedId}
                                onSelectPlace={setSelectedId}
                                onBack={() => setShowRoomList(true)}
                                onManage={() => setManageOpen(true)}
                                onUpdatePlace={updatePlace}
                                onAddPlace={addPlace}
                                onDeletePlace={deletePlace}
                                loadError={
                                    tripId
                                        ? placesError
                                        : '아직 서버와 연결되지 않은 여행방입니다.'
                                }
                                canManage={!inviteCode && canManagePlaces}
                                isOwner={Boolean(
                                    currentUser &&
                                        trip &&
                                        trip.ownerId === currentUser.id,
                                )}
                                tripId={tripId!}
                                initialActivityOpen={
                                    searchParams.get('activity') === 'open'
                                }
                                onTripDatesChanged={() => void loadTrips()}
                                onItineraryDaysLoaded={
                                    handleItineraryDaysLoaded
                                }
                                itineraryVersion={itineraryVersion}
                                showBackButton={!inviteCode}
                                guestView={Boolean(inviteCode)}
                            />
                        ) : (
                            <RoomListPanel
                                rooms={rooms}
                                isLoading={isLoading}
                                error={error}
                                onRetry={() => void loadTrips()}
                                onSelectRoom={(id) => {
                                    selectTrip(id)
                                    setShowRoomList(false)
                                    navigate(`/app/room/${id}`)
                                }}
                            />
                        )}
                    </aside>
                )}

                {aiOpen && tripId && (
                    <AiAgentPanel
                        tripId={tripId}
                        onClose={() => setAiOpen(false)}
                        onApplied={handleAiRouteApplied}
                    />
                )}
                {manageOpen && trip && (
                    <ManageTripModal
                        trip={trip}
                        onClose={() => setManageOpen(false)}
                        onChanged={() => {
                            setManageOpen(false)
                            navigate('/app/room')
                            void loadTrips()
                        }}
                    />
                )}
                {trip &&
                    currentUser &&
                    trip.ownerId === currentUser.id &&
                    trip.status === 'COMPLETED' &&
                    !trip.completionConfirmed && (
                        <TripCompletionConfirmationModal
                            tripId={trip.id}
                            tripTitle={trip.title}
                            onConfirmed={() => void loadTrips()}
                        />
                    )}
                {inviteCode && inviteMode === 'join-confirm' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm">
                        <section className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
                            <p className="text-sm font-extrabold text-brand-700">
                                여행방 참여
                            </p>
                            <h2 className="mt-2 text-xl font-black text-slate-900">
                                {room?.title}에 참여하시겠습니까?
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                참여하면 현재 로그인한 계정에 여행방이 추가되며,
                                일정과 장소를 자유롭게 편집할 수 있습니다.
                            </p>
                            {joinError && (
                                <p className="mt-3 text-sm font-semibold text-red-500">
                                    {joinError}
                                </p>
                            )}
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setInviteMode('guest')}
                                    disabled={isJoining}
                                    className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
                                >
                                    나중에
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleJoinTrip()}
                                    disabled={isJoining}
                                    className="h-11 flex-1 rounded-xl bg-brand text-sm font-extrabold text-white hover:bg-brand-700 disabled:opacity-60"
                                >
                                    {isJoining ? '참여 중...' : '참여하기'}
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    )
}
