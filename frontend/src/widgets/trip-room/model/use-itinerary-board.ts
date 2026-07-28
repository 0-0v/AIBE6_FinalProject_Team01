'use client'

import { useState } from 'react'
import {
    closestCorners,
    PointerSensor,
    pointerWithin,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core'
import {
    addItineraryItem,
    getItinerary,
    moveItineraryItem,
    removeItineraryItem,
    reorderItineraryItems,
    type ItineraryDay,
    type Place,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { getNextSortOrder } from '../lib/itinerary-time'
import { useItineraryDays } from './use-itinerary-days'

export const UNSCHEDULED_DROP_ZONE_ID = 'unscheduled-places'

export const itineraryCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    return pointerCollisions.length > 0
        ? pointerCollisions
        : closestCorners(args)
}

export function useItineraryBoard(
    tripId: number,
    places: Place[],
    canWrite: boolean,
) {
    const itinerary = useItineraryDays(tripId, canWrite)
    const { days, setDays, refresh } = itinerary
    const [dndError, setDndError] = useState<string | null>(null)
    const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isDraggingScheduledItem, setIsDraggingScheduledItem] =
        useState(false)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    )

    const savedPlaces = places.filter((place) => place.status === 'saved')
    const scheduledTripPlaceIds = new Set(
        days.flatMap((day) =>
            day.items
                .map((item) => item.tripPlaceId)
                .filter((id) => id !== null)
                .map(String),
        ),
    )
    const unscheduledPlaces = savedPlaces.filter(
        (place) => !scheduledTripPlaceIds.has(String(place.id)),
    )

    async function addPlaceToDay(placeId: string, dayId: string) {
        const targetDay = findDayById(dayId)
        if (!targetDay) return
        try {
            await addItineraryItem(
                tripId,
                Number(dayId),
                Number(placeId),
                getNextSortOrder(targetDay.items),
            )
            setDays(await getItinerary(tripId))
        } catch (error) {
            setDndError(
                getApiErrorMessage(error, '일정에 추가하지 못했습니다.'),
            )
        }
    }

    function findDayById(id: string): ItineraryDay | undefined {
        return days.find((day) => String(day.id) === id)
    }

    function resolveTargetDay(overId: string): ItineraryDay | undefined {
        return (
            findDayById(overId) ??
            days.find((day) =>
                day.items.some((item) => String(item.id) === overId),
            )
        )
    }

    function handleDragStart(event: DragStartEvent) {
        setIsDragging(true)
        const id = String(event.active.id)
        if (id.startsWith('place-')) {
            setActivePlaceId(id.replace('place-', ''))
            setIsDraggingScheduledItem(false)
        } else {
            setIsDraggingScheduledItem(true)
        }
    }

    function handleDragCancel() {
        setIsDragging(false)
        setIsDraggingScheduledItem(false)
        setActivePlaceId(null)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setIsDragging(false)
        setIsDraggingScheduledItem(false)
        setActivePlaceId(null)
        setDndError(null)
        if (!over) return

        const activeId = String(active.id)
        const overId = String(over.id)
        if (activeId.startsWith('place-')) {
            const targetDay = resolveTargetDay(overId)
            if (targetDay) {
                await addPlaceToDay(
                    activeId.replace('place-', ''),
                    String(targetDay.id),
                )
            }
            return
        }

        const sourceDayId = String(
            active.data.current?.sortable?.containerId ?? '',
        )
        if (overId === UNSCHEDULED_DROP_ZONE_ID) {
            setDays((currentDays) =>
                currentDays.map((day) => ({
                    ...day,
                    items: day.items.filter(
                        (item) => String(item.id) !== activeId,
                    ),
                })),
            )
            try {
                await removeItineraryItem(tripId, Number(activeId))
                setDays(await getItinerary(tripId))
            } catch (error) {
                try { await refresh() } catch { /* refresh 실패 시 내부에서 에러 상태 처리됨 */ }
                setDndError(
                    getApiErrorMessage(
                        error,
                        '저장된 장소로 되돌리지 못했습니다.',
                    ),
                )
            }
            return
        }

        const targetDay = resolveTargetDay(overId)
        if (!targetDay) return
        const targetDayId = String(targetDay.id)

        if (sourceDayId !== targetDayId) {
            const targetIndex = targetDay.items.findIndex(
                (item) => String(item.id) === overId,
            )
            const sourceDay = findDayById(sourceDayId)
            const movingItem = sourceDay?.items.find(
                (item) => String(item.id) === activeId,
            )
            if (sourceDay && movingItem) {
                const nextTargetItems = [...targetDay.items]
                const insertionIndex =
                    targetIndex >= 0 ? targetIndex : nextTargetItems.length
                nextTargetItems.splice(insertionIndex, 0, movingItem)
                setDays((currentDays) =>
                    currentDays.map((day) => {
                        if (String(day.id) === sourceDayId) {
                            return {
                                ...day,
                                items: day.items.filter(
                                    (item) => String(item.id) !== activeId,
                                ),
                            }
                        }
                        if (String(day.id) === targetDayId) {
                            return { ...day, items: nextTargetItems }
                        }
                        return day
                    }),
                )
            }
            try {
                await moveItineraryItem(
                    tripId,
                    Number(activeId),
                    Number(targetDayId),
                    targetIndex >= 0 ? targetIndex : targetDay.items.length,
                )
                setDays(await getItinerary(tripId))
            } catch (error) {
                try { await refresh() } catch { /* refresh 실패 시 내부에서 에러 상태 처리됨 */ }
                setDndError(getApiErrorMessage(error, '이동에 실패했습니다.'))
            }
            return
        }

        const sourceDay = findDayById(sourceDayId)
        if (!sourceDay) return
        const oldIndex = sourceDay.items.findIndex(
            (item) => String(item.id) === activeId,
        )
        const newIndex = sourceDay.items.findIndex(
            (item) => String(item.id) === overId,
        )
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

        const reorderedItems = [...sourceDay.items]
        const [movedItem] = reorderedItems.splice(oldIndex, 1)
        reorderedItems.splice(newIndex, 0, movedItem)
        setDays((currentDays) =>
            currentDays.map((day) =>
                String(day.id) === sourceDayId
                    ? { ...day, items: reorderedItems }
                    : day,
            ),
        )
        try {
            await reorderItineraryItems(
                tripId,
                Number(sourceDayId),
                reorderedItems.map((item) => Number(item.id)),
            )
            setDays(await getItinerary(tripId))
        } catch (error) {
            try { await refresh() } catch { /* refresh 실패 시 내부에서 에러 상태 처리됨 */ }
            setDndError(getApiErrorMessage(error, '순서 변경에 실패했습니다.'))
        }
    }

    return {
        ...itinerary,
        sensors,
        dndError,
        isDragging,
        isDraggingScheduledItem,
        unscheduledPlaces,
        activePlaceForOverlay: activePlaceId
            ? (places.find((place) => place.id === activePlaceId) ?? null)
            : null,
        addPlaceToDay,
        handleDragStart,
        handleDragCancel,
        handleDragEnd,
    }
}
