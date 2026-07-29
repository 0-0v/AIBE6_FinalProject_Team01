'use client'

import { useCallback, useRef, useState } from 'react'
import {
    closestCorners,
    MouseSensor,
    pointerWithin,
    TouchSensor,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragOverEvent,
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
import {
    getCrossDayInsertionIndex,
    getSameDayInsertionIndex,
    getSameDayInsertionIndexAtBoundary,
    parseItineraryDropZoneId,
} from '../lib/itinerary-drop-position'
import { getNextSortOrder } from '../lib/itinerary-time'
import { useItineraryDays } from './use-itinerary-days'

export const UNSCHEDULED_DROP_ZONE_ID = 'unscheduled-places'

export type ItineraryBoardFeedback = {
    message: string
    undo?: () => Promise<void>
}

export const itineraryCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length === 0) return closestCorners(args)

    return [...pointerCollisions].sort((left, right) => {
        const priority = (id: string | number) => {
            const data = args.droppableContainers.find(
                (container) => container.id === id,
            )?.data.current
            if (data?.type === 'itinerary-drop-zone') return 0
            if (data?.sortable != null) return 1
            return 2
        }
        return priority(left.id) - priority(right.id)
    })
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
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    const [previewDayId, setPreviewDayId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const [feedback, setFeedback] = useState<ItineraryBoardFeedback | null>(
        null,
    )
    const [isDragging, setIsDragging] = useState(false)
    const [isDraggingScheduledItem, setIsDraggingScheduledItem] =
        useState(false)
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 180,
                tolerance: 8,
            },
        }),
    )

    function beginSaving(): boolean {
        if (savingRef.current) return false
        savingRef.current = true
        setSaving(true)
        return true
    }

    function finishSaving() {
        savingRef.current = false
        setSaving(false)
    }

    async function restoreAfterMutationFailure(
        previousDays: ItineraryDay[],
    ): Promise<string | null> {
        setDays(previousDays)
        try {
            await refresh()
            return null
        } catch (refreshError) {
            return getApiErrorMessage(
                refreshError,
                '서버 상태를 다시 확인하지 못했습니다. 화면은 변경 전 상태로 복원했습니다.',
            )
        }
    }

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

    async function addPlaceToDay(
        placeId: string,
        dayId: string,
        insertionIndex?: number,
    ) {
        if (!beginSaving()) return
        const targetDay = findDayById(dayId)
        if (!targetDay) {
            finishSaving()
            return
        }
        setDndError(null)
        try {
            const created = await addItineraryItem(
                tripId,
                Number(dayId),
                Number(placeId),
                insertionIndex ?? getNextSortOrder(targetDay.items),
            )
            setDays(await getItinerary(tripId))
            const createdItem = created.items.find(
                (item) => String(item.tripPlaceId) === placeId,
            )
            setFeedback({
                message: `${targetDay.title ?? `Day ${targetDay.dayNumber}`}에 장소를 추가했어요.`,
                undo: async () => {
                    if (createdItem == null) return
                    await removeItineraryItem(tripId, Number(createdItem.id))
                    setDays(await getItinerary(tripId))
                },
            })
        } catch (error) {
            setDndError(
                getApiErrorMessage(error, '일정에 추가하지 못했습니다.'),
            )
        } finally {
            finishSaving()
        }
    }

    function findDayById(id: string): ItineraryDay | undefined {
        return days.find((day) => String(day.id) === id)
    }

    function resolveTargetDay(overId: string): ItineraryDay | undefined {
        const dropZone = parseItineraryDropZoneId(overId)
        return (
            (dropZone == null ? undefined : findDayById(dropZone.dayId)) ??
            findDayById(overId) ??
            days.find((day) =>
                day.items.some((item) => String(item.id) === overId),
            )
        )
    }

    function handleDragStart(event: DragStartEvent) {
        if (savingRef.current) return
        setIsDragging(true)
        const id = String(event.active.id)
        setActiveDragId(id)
        if (id.startsWith('place-')) {
            setActivePlaceId(id.replace('place-', ''))
            setIsDraggingScheduledItem(false)
        } else {
            setIsDraggingScheduledItem(true)
        }
    }

    function handleDragOver(event: DragOverEvent) {
        if (savingRef.current) return
        const overId = event.over == null ? null : String(event.over.id)
        if (overId == null || overId === UNSCHEDULED_DROP_ZONE_ID) {
            setPreviewDayId(null)
            return
        }
        const targetDay = resolveTargetDay(overId)
        setPreviewDayId(targetDay == null ? null : String(targetDay.id))
    }

    function handleDragCancel() {
        setIsDragging(false)
        setIsDraggingScheduledItem(false)
        setActivePlaceId(null)
        setActiveDragId(null)
        setPreviewDayId(null)
    }

    function isPlacedAfterOverItem(event: DragEndEvent): boolean {
        const activeRect =
            event.active.rect.current.translated ??
            event.active.rect.current.initial
        if (activeRect == null || event.over == null) return false
        return (
            activeRect.top + activeRect.height / 2 >
            event.over.rect.top + event.over.rect.height / 2
        )
    }

    async function handleDragEnd(event: DragEndEvent) {
        if (savingRef.current) {
            handleDragCancel()
            return
        }
        const { active, over } = event
        setIsDragging(false)
        setIsDraggingScheduledItem(false)
        setActivePlaceId(null)
        setActiveDragId(null)
        setPreviewDayId(null)
        setDndError(null)
        if (!over) return

        const activeId = String(active.id)
        const overId = String(over.id)
        if (activeId.startsWith('place-')) {
            const targetDay = resolveTargetDay(overId)
            if (targetDay) {
                const dropZone = parseItineraryDropZoneId(overId)
                const insertionIndex =
                    dropZone?.insertionIndex ??
                    getCrossDayInsertionIndex(
                        targetDay.items,
                        overId,
                        isPlacedAfterOverItem(event),
                    )
                await addPlaceToDay(
                    activeId.replace('place-', ''),
                    String(targetDay.id),
                    insertionIndex,
                )
            }
            return
        }

        const sourceDayId = String(
            active.data.current?.sortable?.containerId ?? '',
        )
        if (overId === UNSCHEDULED_DROP_ZONE_ID) {
            if (!beginSaving()) return
            const previousDays = days
            const sourceDay = findDayById(sourceDayId)
            const movingItem = sourceDay?.items.find(
                (item) => String(item.id) === activeId,
            )
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
                setFeedback({
                    message: '장소를 저장된 장소로 되돌렸어요.',
                    undo:
                        sourceDay != null && movingItem?.tripPlaceId != null
                            ? async () => {
                                  await addItineraryItem(
                                      tripId,
                                      Number(sourceDay.id),
                                      Number(movingItem.tripPlaceId),
                                      movingItem.sortOrder,
                                  )
                                  setDays(await getItinerary(tripId))
                              }
                            : undefined,
                })
            } catch (error) {
                const refreshError =
                    await restoreAfterMutationFailure(previousDays)
                setDndError(
                    refreshError ??
                        getApiErrorMessage(
                            error,
                            '저장된 장소로 되돌리지 못했습니다.',
                        ),
                )
            } finally {
                finishSaving()
            }
            return
        }

        const targetDay = resolveTargetDay(overId)
        if (!targetDay) return
        const targetDayId = String(targetDay.id)

        if (sourceDayId !== targetDayId) {
            if (!beginSaving()) return
            const previousDays = days
            const dropZone = parseItineraryDropZoneId(overId)
            const insertionIndex =
                dropZone?.insertionIndex ??
                getCrossDayInsertionIndex(
                    targetDay.items,
                    overId,
                    isPlacedAfterOverItem(event),
                )
            const sourceDay = findDayById(sourceDayId)
            const movingItem = sourceDay?.items.find(
                (item) => String(item.id) === activeId,
            )
            if (sourceDay && movingItem) {
                const nextTargetItems = [...targetDay.items]
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
                    insertionIndex,
                )
                setDays(await getItinerary(tripId))
                setFeedback({
                    message: `${targetDay.title ?? `Day ${targetDay.dayNumber}`}로 장소를 이동했어요.`,
                    undo: async () => {
                        await moveItineraryItem(
                            tripId,
                            Number(activeId),
                            Number(sourceDayId),
                            Math.max(
                                0,
                                sourceDay?.items.findIndex(
                                    (item) => String(item.id) === activeId,
                                ) ?? 0,
                            ),
                        )
                        setDays(await getItinerary(tripId))
                    },
                })
            } catch (error) {
                const refreshError =
                    await restoreAfterMutationFailure(previousDays)
                setDndError(
                    refreshError ??
                        getApiErrorMessage(error, '이동에 실패했습니다.'),
                )
            } finally {
                finishSaving()
            }
            return
        }

        const sourceDay = findDayById(sourceDayId)
        if (!sourceDay) return
        const oldIndex = sourceDay.items.findIndex(
            (item) => String(item.id) === activeId,
        )
        const dropZone = parseItineraryDropZoneId(overId)
        const newIndex =
            dropZone == null
                ? getSameDayInsertionIndex(
                      sourceDay.items,
                      activeId,
                      overId,
                      isPlacedAfterOverItem(event),
                  )
                : getSameDayInsertionIndexAtBoundary(
                      sourceDay.items,
                      activeId,
                      dropZone.insertionIndex,
                  )
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
        if (!beginSaving()) return

        const previousDays = days
        const reorderedItems = [...sourceDay.items]
        const previousOrder = sourceDay.items.map((item) => Number(item.id))
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
            setFeedback({
                message: `Day ${sourceDay.dayNumber}의 방문 순서를 변경했어요.`,
                undo: async () => {
                    await reorderItineraryItems(
                        tripId,
                        Number(sourceDayId),
                        previousOrder,
                    )
                    setDays(await getItinerary(tripId))
                },
            })
        } catch (error) {
            const refreshError = await restoreAfterMutationFailure(previousDays)
            setDndError(
                refreshError ??
                    getApiErrorMessage(error, '순서 변경에 실패했습니다.'),
            )
        } finally {
            finishSaving()
        }
    }

    async function undoLastAction() {
        if (!feedback?.undo || !beginSaving()) return
        setDndError(null)
        try {
            await feedback.undo()
            setFeedback({ message: '이전 상태로 되돌렸어요.' })
        } catch (error) {
            setDndError(getApiErrorMessage(error, '실행 취소에 실패했습니다.'))
        } finally {
            finishSaving()
        }
    }

    const clearFeedback = useCallback(() => setFeedback(null), [])

    return {
        ...itinerary,
        sensors,
        dndError,
        isDragging,
        isDraggingScheduledItem,
        activeDragId,
        previewDayId,
        saving,
        feedback,
        clearFeedback,
        undoLastAction,
        unscheduledPlaces,
        activePlaceForOverlay: activePlaceId
            ? (places.find((place) => place.id === activePlaceId) ?? null)
            : null,
        addPlaceToDay,
        handleDragStart,
        handleDragOver,
        handleDragCancel,
        handleDragEnd,
    }
}
