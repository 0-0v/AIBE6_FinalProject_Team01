import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ItineraryDay, Place, Room } from '@/entities/trip'
import { ExpensePanel, type ExpenseResponse } from '@/features/manage-expense'
import { InviteModal } from '@/features/invite-member'
import { fetchTripMembers, type TripMember } from '@/features/manage-trip'
import { RecordPanel } from './record-panel'
import { RoomHeader } from './room-header'

type Props = {
    room: Room
    places: Place[]
    itineraryDays: ItineraryDay[]
    tripId: number
    canManage: boolean
    guestView?: boolean
    onJoin?: () => void
    onBack: () => void
    onManage: () => void
    onVisibilityManage: () => void
    onOpenPlanPlace: (placeId: string) => void
    headerContainer?: HTMLElement | null
}

export function RecordRoomPanel({
    room,
    places,
    itineraryDays,
    tripId,
    canManage,
    guestView = false,
    onJoin,
    onBack,
    onManage,
    onVisibilityManage,
    onOpenPlanPlace,
    headerContainer,
}: Props) {
    const [inviteOpen, setInviteOpen] = useState(false)
    const [expenseComposerOpen, setExpenseComposerOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(
        null,
    )
    const [expenseRevision, setExpenseRevision] = useState(0)
    const [members, setMembers] = useState<TripMember[]>([])

    useEffect(() => {
        let active = true
        const loadMembers = async () => {
            try {
                const nextMembers = await fetchTripMembers(tripId)
                if (active) setMembers(nextMembers)
            } catch {
                if (active) setMembers([])
            }
        }
        void loadMembers()
        const intervalId = window.setInterval(() => void loadMembers(), 30_000)
        return () => {
            active = false
            window.clearInterval(intervalId)
        }
    }, [tripId])

    const header = (
        <RoomHeader
            title={room.title}
            location={room.location}
            date={room.date}
            isPublic={room.visibility !== 'PRIVATE'}
            isCompleted={room.lifecycleStatus === 'COMPLETED'}
            canWrite={canManage}
            members={members}
            onInvite={() => setInviteOpen(true)}
            onJoin={guestView ? onJoin : undefined}
            onBack={onBack}
            onManage={onManage}
            onVisibilityManage={onVisibilityManage}
            showBackButton={false}
        />
    )

    return (
        <section className="relative flex min-h-0 flex-1 flex-col">
            {headerContainer ? createPortal(header, headerContainer) : header}
            <RecordPanel
                tripId={tripId}
                places={places}
                itineraryDays={itineraryDays}
                canWrite={canManage}
                startDate={room.startDate}
                endDate={room.endDate}
                onPlaceClick={onOpenPlanPlace}
                onOpenExpenses={() => {
                    setEditingExpense(null)
                    setExpenseComposerOpen(true)
                }}
                onEditExpense={(expense) => {
                    setEditingExpense(expense)
                    setExpenseComposerOpen(true)
                }}
                expenseRevision={expenseRevision}
            />

            {expenseComposerOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <ExpensePanel
                        tripId={tripId}
                        canWrite={canManage}
                        composerOnly
                        initialComposerOpen
                        initialEditingExpense={editingExpense}
                        onComposerClose={() => {
                            setExpenseComposerOpen(false)
                            setEditingExpense(null)
                        }}
                        onChanged={() =>
                            setExpenseRevision((revision) => revision + 1)
                        }
                    />,
                    document.body,
                )}

            {inviteOpen && (
                <InviteModal
                    tripId={tripId}
                    onClose={() => setInviteOpen(false)}
                />
            )}
        </section>
    )
}
