import React, {
    type CSSProperties,
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GripVerticalIcon, SparklesIcon } from 'lucide-react'
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
import {
    AiPlaceRecommendationsPanel,
    consumePendingAiTripAction,
    type PendingAiTripAction,
} from '@/features/ai-trip-assistant'
import { useCommentStore } from '@/features/comment-place'
import {
    claimGuestTripAccess,
    ManageTripModal,
    TripVisibilityModal,
    useTripStore,
} from '@/features/manage-trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { useCurrentUserStore } from '@/shared/model'
import {
    MapCanvas,
    RoomDetailPanel,
    RoomListPanel,
    getNextSortOrder,
} from '@/widgets/trip-room'
import {
    REALTIME_EVENT_NAME,
    type RealtimeEvent,
} from '@/widgets/realtime-sync'

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
    const showRoomList = !inviteCode && !roomId
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
    const [realtimeVersion, setRealtimeVersion] = useState(0)
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
                getNextSortOrder(targetDay.items),
            )
            const updated = await getItinerary(tripId)
            setItineraryState({ tripId, days: updated })
        },
        [tripId, itineraryState],
    )
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [headerContainer, setHeaderContainer] =
        useState<HTMLDivElement | null>(null)
    const [customPanelWidth, setCustomPanelWidth] = useState<number | null>(
        null,
    )
    const [isResizingPanel, setIsResizingPanel] = useState(false)
    const workspacePanelRef = useRef<HTMLElement>(null)
    const [aiOpen, setAiOpen] = useState(false)
    const [pendingAiAction, setPendingAiAction] =
        useState<PendingAiTripAction | null>(null)
    const [manageOpen, setManageOpen] = useState(false)
    const [visibilityOpen, setVisibilityOpen] = useState(false)
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
    const workspacePanelWidth = 'min(520px, 46vw)'
    const resolvedWorkspacePanelWidth =
        customPanelWidth == null ? workspacePanelWidth : `${customPanelWidth}px`
    const resolvedPanelWidth = showRoomList
        ? 'min(760px, 52vw)'
        : resolvedWorkspacePanelWidth

    const clampPanelWidth = useCallback((width: number) => {
        const minimumWidth = 360
        const workspaceWidth =
            workspacePanelRef.current?.parentElement?.getBoundingClientRect()
                .width ?? window.innerWidth
        const maximumWidth = Math.max(
            minimumWidth,
            Math.min(900, workspaceWidth - 360),
        )
        return Math.min(Math.max(width, minimumWidth), maximumWidth)
    }, [])

    useEffect(() => {
        if (!isResizingPanel) return

        function handlePointerMove(event: PointerEvent) {
            const panelRight =
                workspacePanelRef.current?.getBoundingClientRect().right ??
                window.innerWidth
            const nextWidth = clampPanelWidth(panelRight - event.clientX)
            setCustomPanelWidth(nextWidth)
        }

        function handlePointerUp() {
            setIsResizingPanel(false)
        }

        const previousCursor = document.body.style.cursor
        const previousUserSelect = document.body.style.userSelect
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        window.addEventListener('pointercancel', handlePointerUp)

        return () => {
            document.body.style.cursor = previousCursor
            document.body.style.userSelect = previousUserSelect
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
            window.removeEventListener('pointercancel', handlePointerUp)
        }
    }, [clampPanelWidth, isResizingPanel])

    function handlePanelResizeKeyDown(
        event: React.KeyboardEvent<HTMLDivElement>,
    ) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

        event.preventDefault()
        const currentWidth =
            customPanelWidth ??
            workspacePanelRef.current?.getBoundingClientRect().width ??
            400
        const direction = event.key === 'ArrowLeft' ? 1 : -1
        setCustomPanelWidth(clampPanelWidth(currentWidth + direction * 20))
    }

    function resetActivePanelWidth() {
        setCustomPanelWidth(null)
    }

    useEffect(() => {
        const handleRealtimeChange = (event: Event) => {
            const detail = (event as CustomEvent<RealtimeEvent>).detail
            if (detail.tripId === tripId) {
                setRealtimeVersion((current) => current + 1)
            }
        }
        window.addEventListener(REALTIME_EVENT_NAME, handleRealtimeChange)
        return () =>
            window.removeEventListener(
                REALTIME_EVENT_NAME,
                handleRealtimeChange,
            )
    }, [tripId])

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
        if (!tripId) return
        const action = consumePendingAiTripAction(tripId)
        if (!action) return
        Promise.resolve().then(() => {
            if (action.kind === 'place-recommendations') {
                setPendingAiAction(action)
            }
        })
    }, [tripId])

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
    }, [activeRoomId, inviteCode, realtimeVersion, tripId])

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
    }, [realtimeVersion, tripId])

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
        if (!tripId || !inviteCode) return
        setIsJoining(true)
        setJoinError(null)
        try {
            await claimGuestTripAccess(inviteCode)
            await loadTrips()
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
        <div className="flex h-full w-full flex-col bg-slate-50">
            <AnimatePresence initial={false}>
                {room && (
                    <motion.div
                        key={`room-header-${room.id}`}
                        ref={setHeaderContainer}
                        initial={{ opacity: 0, y: -18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{
                            opacity: { duration: 0.3, delay: 0.06 },
                            y: {
                                duration: 0.42,
                                ease: [0.22, 1, 0.36, 1],
                            },
                        }}
                        className="relative z-30 shrink-0 overflow-hidden bg-slate-50"
                    />
                )}
            </AnimatePresence>
            <div
                className={`relative flex min-h-0 flex-1 flex-col lg:flex-row ${
                    room ? 'gap-5 p-4 sm:px-10 sm:py-5' : ''
                }`}
            >
                <motion.div
                    initial={room ? { opacity: 0, y: 14 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.42,
                        ease: [0.22, 1, 0.36, 1],
                        delay: room ? 0.08 : 0,
                    }}
                    className={`relative min-h-[360px] min-w-0 flex-1 overflow-hidden ${
                        room
                            ? 'rounded-3xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]'
                            : ''
                    }`}
                >
                    <MapCanvas
                        places={mapPlaces}
                        initialLat={room?.destinationLat}
                        initialLng={room?.destinationLng}
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
                    {!inviteCode && canManagePlaces && (
                        <button
                            onClick={() => setAiOpen(true)}
                            className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-brand-700"
                        >
                            <SparklesIcon size={17} /> 동선 추천
                        </button>
                    )}
                </motion.div>

                <motion.aside
                    ref={workspacePanelRef}
                    initial={room ? { opacity: 0, x: 44 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 0.48,
                        ease: [0.22, 1, 0.36, 1],
                        delay: room ? 0.13 : 0,
                    }}
                    className={`@container relative flex min-h-0 w-full shrink-0 flex-1 flex-col overflow-hidden border border-slate-200 bg-white lg:min-w-[360px] lg:max-w-[calc(100%-360px)] lg:w-[var(--workspace-panel-width)] lg:flex-none ${
                        room
                            ? 'rounded-3xl shadow-[0_14px_36px_rgba(15,23,42,0.10)]'
                            : ''
                    } ${
                        isResizingPanel
                            ? ''
                            : 'transition-[width] duration-300 ease-out'
                    }`}
                    style={
                        {
                            '--workspace-panel-width': resolvedPanelWidth,
                        } as CSSProperties
                    }
                >
                    <div
                        role="separator"
                        aria-label="여행방 패널 너비 조절"
                        aria-orientation="vertical"
                        tabIndex={0}
                        onPointerDown={(event) => {
                            if (event.button !== 0) return
                            event.preventDefault()
                            const currentWidth =
                                workspacePanelRef.current?.getBoundingClientRect()
                                    .width
                            if (currentWidth != null) {
                                setCustomPanelWidth(
                                    clampPanelWidth(currentWidth),
                                )
                            }
                            setIsResizingPanel(true)
                        }}
                        onDoubleClick={resetActivePanelWidth}
                        onKeyDown={handlePanelResizeKeyDown}
                        title="드래그해서 패널 너비 조절 · 더블클릭해서 초기화"
                        className="group absolute -left-3 top-0 z-20 hidden h-full w-6 cursor-col-resize touch-none items-center justify-center focus:outline-none lg:flex"
                    >
                        <span
                            className={`absolute h-full transition-all duration-150 ${
                                isResizingPanel
                                    ? 'w-1 bg-brand shadow-[0_0_12px_rgba(235,94,119,0.35)]'
                                    : 'w-px bg-transparent group-hover:bg-brand-200 group-focus:bg-brand-300'
                            }`}
                        />
                        <span
                            className={`relative flex h-10 w-5 items-center justify-center rounded-full border bg-white shadow-sm transition ${
                                isResizingPanel
                                    ? 'border-brand bg-brand text-white shadow-md'
                                    : 'border-slate-200 text-slate-400 group-hover:border-brand-200 group-hover:text-brand-600 group-hover:shadow-md group-focus:border-brand group-focus:text-brand-700'
                            }`}
                        >
                            <GripVerticalIcon size={14} />
                        </span>
                        {isResizingPanel && (
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                                {customPanelWidth == null
                                    ? '너비 조절 중'
                                    : `${Math.round(customPanelWidth)}px`}
                            </span>
                        )}
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={room ? `room-${room.id}` : 'room-list'}
                            className="flex min-h-0 flex-1 flex-col"
                            initial={{ opacity: 0, x: 28 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 18 }}
                            transition={{
                                duration: 0.28,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            {room ? (
                                <RoomDetailPanel
                                    key={room.id}
                                    room={room}
                                    places={displayedPlaces}
                                    selectedId={selectedId}
                                    onSelectPlace={setSelectedId}
                                    onBack={() => navigate('/app/room')}
                                    onManage={() => setManageOpen(true)}
                                    onVisibilityManage={() =>
                                        setVisibilityOpen(true)
                                    }
                                    onUpdatePlace={updatePlace}
                                    onAddPlace={addPlace}
                                    onDeletePlace={deletePlace}
                                    loadError={
                                        tripId
                                            ? placesError
                                            : '아직 서버와 연결되지 않은 여행방입니다.'
                                    }
                                    canManage={!inviteCode && canManagePlaces}
                                    tripId={tripId!}
                                    initialActivityOpen={
                                        searchParams.get('activity') === 'open'
                                    }
                                    onTripDatesChanged={async () => {
                                        await loadTrips()
                                    }}
                                    onItineraryDaysLoaded={
                                        handleItineraryDaysLoaded
                                    }
                                    itineraryVersion={itineraryVersion}
                                    realtimeVersion={realtimeVersion}
                                    showBackButton={false}
                                    guestView={Boolean(inviteCode)}
                                    headerContainer={headerContainer}
                                    onJoin={
                                        inviteCode
                                            ? handleLoginChoice
                                            : undefined
                                    }
                                />
                            ) : (
                                <RoomListPanel
                                    rooms={rooms}
                                    isLoading={isLoading}
                                    error={error}
                                    onRetry={() => void loadTrips()}
                                    onSelectRoom={(id) => {
                                        selectTrip(id)
                                        navigate(`/app/room/${id}`)
                                    }}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.aside>

                {aiOpen && tripId && (
                    <AiAgentPanel
                        tripId={tripId}
                        places={displayedPlaces}
                        days={itineraryDays}
                        onClose={() => {
                            setAiOpen(false)
                        }}
                        onApplied={handleAiRouteApplied}
                    />
                )}
                {tripId &&
                    room &&
                    pendingAiAction?.kind === 'place-recommendations' && (
                        <AiPlaceRecommendationsPanel
                            tripId={tripId}
                            roomId={room.id}
                            recommendations={pendingAiAction.recommendations}
                            onClose={() => setPendingAiAction(null)}
                            onRegistered={addPlace}
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
                    trip.status === 'COMPLETED' &&
                    (visibilityOpen || !trip.completionConfirmed) && (
                        <TripVisibilityModal
                            trip={trip}
                            required={!trip.completionConfirmed}
                            onClose={() => setVisibilityOpen(false)}
                            onChanged={() => {
                                setVisibilityOpen(false)
                                void loadTrips()
                            }}
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
