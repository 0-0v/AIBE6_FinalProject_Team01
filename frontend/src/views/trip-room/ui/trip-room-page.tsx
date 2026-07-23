import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Place } from '@/entities/trip'
import { AiAgentPanel } from '@/features/ai-organize'
import { ManageTripModal, useTripStore } from '@/features/manage-trip'
import { useCurrentUserStore } from '@/shared/model'
import { MapCanvas, RoomDetailPanel, RoomListPanel } from '@/widgets/trip-room'

export function TripRoom() {
    const navigate = useNavigate()
    const { roomId } = useParams<{ roomId?: string }>()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const { trips, rooms, isLoading, error, loadTrips, resetTrips } = useTripStore()
    const room = rooms.find((item) => item.id === roomId)
    const trip = trips.find((item) => String(item.id) === roomId)

    const [places, setPlaces] = useState<Place[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [collapsed, setCollapsed] = useState(false)
    const [aiOpen, setAiOpen] = useState(false)
    const [manageOpen, setManageOpen] = useState(false)

    useEffect(() => {
        if (currentUser) void loadTrips()
        else resetTrips()
    }, [currentUser, loadTrips, resetTrips])

    const displayedPlaces = useMemo(
        () =>
            room ? places.filter((place) => place.roomId === room.id) : places,
        [places, room],
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

    return (
        <div className="flex h-full w-full flex-col">
            <div className="relative flex min-h-0 flex-1 flex-row">
                <div className="relative min-w-0 flex-1">
                    <MapCanvas
                        places={displayedPlaces}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                    {!aiOpen && (
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
                                onBack={() => navigate('/app/room')}
                                onManage={() => setManageOpen(true)}
                                onUpdatePlace={updatePlace}
                                onAddPlace={addPlace}
                                onDeletePlace={deletePlace}
                            />
                        ) : (
                            <RoomListPanel
                                rooms={rooms}
                                isLoading={isLoading}
                                error={error}
                                onRetry={() => void loadTrips()}
                                onSelectRoom={(id) =>
                                    navigate(`/app/room/${id}`)
                                }
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
