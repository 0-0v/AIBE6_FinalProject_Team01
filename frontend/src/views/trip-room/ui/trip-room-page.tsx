import React, { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
    Place,
    getTripPlaces,
    getTripPlaceAccess,
    getTripPlaceVotes,
    fromApiToPlace,
} from '@/entities/trip'
import { AiAgentPanel } from '@/features/ai-organize'
import { useCommentStore } from '@/features/comment-place'
import { ManageTripModal, useTripStore } from '@/features/manage-trip'
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
        }
    }

    if (
        inviteCode &&
        (verifiedInviteCode !== inviteCode || guestRoom === null)
    ) {
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

    return (
        <div className="flex h-full w-full flex-col">
            <div className="relative flex min-h-0 flex-1 flex-row">
                <div className="relative min-w-0 flex-1">
                    <MapCanvas
                        places={mapPlaces}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                    {!inviteCode && !aiOpen && (
                        <button
                            onClick={() => setAiOpen(true)}
                            className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-brand-700"
                        >
                            <SparklesIcon size={17} /> AI로 지도 정리
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
                                tripId={tripId!}
                                initialActivityOpen={
                                    searchParams.get('activity') === 'open'
                                }
                                onTripDatesChanged={() => void loadTrips()}
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

                {aiOpen && (
                    <AiAgentPanel
                        places={displayedPlaces}
                        onClose={() => setAiOpen(false)}
                        onApply={(suggestion) => {
                            if (suggestion.type === 'duplicate') {
                                setPlaces((current) =>
                                    current.filter(
                                        (place) => !place.duplicateOf,
                                    ),
                                )
                            }
                        }}
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
            </div>
        </div>
    )
}
