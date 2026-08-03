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
import { arrayMove } from '@dnd-kit/sortable'
import {
    addItineraryItem,
    getItinerary,
    moveItineraryItem,
    removeItineraryItem,
    reorderItineraryItems,
    type ItineraryDay,
    type ItineraryItem,
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
    refreshVersion = 0,
) {
    const itinerary = useItineraryDays(tripId, canWrite, refreshVersion)
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
    // 드래그 시작 시점의 원래 순서 — 실시간 재배치 중 취소되면 되돌리고,
    // 드롭 시 실제로 바뀐 게 있는지 비교하는 기준으로 쓴다.
    const dragStartSnapshotRef = useRef<{
        dayId: string
        items: ItineraryItem[]
    } | null>(null)
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 10 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
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
    const departureTripPlaceIds = new Set(
        days
            .map((day) => day.departure?.tripPlaceId)
            .filter((id) => id != null)
            .map(String),
    )
    const unscheduledPlaces = savedPlaces.filter(
        (place) =>
            !scheduledTripPlaceIds.has(String(place.id)) &&
            !departureTripPlaceIds.has(String(place.id)),
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
            setDays((current) =>
                current.map((d) =>
                    String(d.id) === String(created.id) ? created : d,
                ),
            )
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
            dragStartSnapshotRef.current = null
        } else {
            setIsDraggingScheduledItem(true)
            const sourceDay = days.find((day) =>
                day.items.some((item) => String(item.id) === id),
            )
            dragStartSnapshotRef.current = sourceDay
                ? { dayId: String(sourceDay.id), items: sourceDay.items }
                : null
        }
    }

    function handleDragOver(event: DragOverEvent) {
        if (savingRef.current) return
        const { active, over } = event
        const overId = over == null ? null : String(over.id)
        if (overId == null || overId === UNSCHEDULED_DROP_ZONE_ID) {
            setPreviewDayId(null)
            return
        }
        const targetDay = resolveTargetDay(overId)
        setPreviewDayId(targetDay == null ? null : String(targetDay.id))

        const activeId = String(active.id)
        if (activeId.startsWith('place-') || targetDay == null) return

        const sourceDayId = String(
            active.data.current?.sortable?.containerId ?? '',
        )
        if (String(targetDay.id) !== sourceDayId) return

        // 같은 Day 안에서 기존 아이템 위로 드래그 중일 때만 실시간으로 순서를
        // 미리 반영한다 (드롭존/컨테이너 자체 위는 드롭 시점 로직에 맡김).
        const oldIndex = targetDay.items.findIndex(
            (item) => String(item.id) === activeId,
        )
        const overIndex = targetDay.items.findIndex(
            (item) => String(item.id) === overId,
        )
        if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) {
            return
        }

        const reordered = arrayMove(targetDay.items, oldIndex, overIndex)
        setDays((current) =>
            current.map((day) =>
                String(day.id) === sourceDayId
                    ? { ...day, items: reordered }
                    : day,
            ),
        )
    }

    function handleDragCancel() {
        const snapshot = dragStartSnapshotRef.current
        if (snapshot) {
            setDays((current) =>
                current.map((day) =>
                    String(day.id) === snapshot.dayId
                        ? { ...day, items: snapshot.items }
                        : day,
                ),
            )
        }
        dragStartSnapshotRef.current = null
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
                // 낙관적 업데이트로 충분 — 추가 getItinerary 불필요
                setFeedback({
                    message: '장소를 저장된 장소로 되돌렸어요.',
                    undo:
                        sourceDay != null && movingItem?.tripPlaceId != null
                            ? async () => {
                                  const reAdded = await addItineraryItem(
                                      tripId,
                                      Number(sourceDay.id),
                                      Number(movingItem.tripPlaceId),
                                      movingItem.sortOrder,
                                  )
                                  setDays((current) =>
                                      current.map((d) =>
                                          String(d.id) === String(reAdded.id)
                                              ? reAdded
                                              : d,
                                      ),
                                  )
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
                // 낙관적 업데이트로 위치는 확정 — 이동 시간은 백그라운드에서 갱신
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
                // 두 Day의 이동 시간만 조용히 갱신 (1초 후, 사용자 시선이 멀어진 뒤)
                setTimeout(() => {
                    void getItinerary(tripId)
                        .then(setDays)
                        .catch(() => {})
                }, 1000)
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
                ? overId === sourceDayId
                    ? // 포인터가 모든 아이템 아래 컨테이너 영역에 있음 → 맨 끝에 삽입
                      getSameDayInsertionIndexAtBoundary(
                          sourceDay.items,
                          activeId,
                          sourceDay.items.length,
                      )
                    : getSameDayInsertionIndex(
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
        const reorderedItems = [...sourceDay.items]
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const [movedItem] = reorderedItems.splice(oldIndex, 1)
            reorderedItems.splice(newIndex, 0, movedItem)
        }

        // 실시간 재배치(handleDragOver)로 이미 순서가 바뀌었을 수 있으므로,
        // 드래그 시작 시점의 원래 순서와 비교해 실제 변경 여부를 판단한다.
        const snapshot =
            dragStartSnapshotRef.current?.dayId === sourceDayId
                ? dragStartSnapshotRef.current.items
                : sourceDay.items
        dragStartSnapshotRef.current = null
        const unchanged =
            snapshot.length === reorderedItems.length &&
            snapshot.every(
                (item, index) =>
                    String(item.id) === String(reorderedItems[index].id),
            )
        if (unchanged) return
        if (!beginSaving()) return

        const previousDays = days
        const previousOrder = snapshot.map((item) => Number(item.id))
        setDays((currentDays) =>
            currentDays.map((day) =>
                String(day.id) === sourceDayId
                    ? { ...day, items: reorderedItems }
                    : day,
            ),
        )
        try {
            const updatedDay = await reorderItineraryItems(
                tripId,
                Number(sourceDayId),
                reorderedItems.map((item) => Number(item.id)),
            )
            // API 응답(이동 시간 포함)으로 해당 Day만 교체 — 다른 Day 불변
            setDays((current) =>
                current.map((d) =>
                    String(d.id) === String(updatedDay.id) ? updatedDay : d,
                ),
            )
            setFeedback({
                message: `Day ${sourceDay.dayNumber}의 방문 순서를 변경했어요.`,
                undo: async () => {
                    const restoredDay = await reorderItineraryItems(
                        tripId,
                        Number(sourceDayId),
                        previousOrder,
                    )
                    setDays((current) =>
                        current.map((d) =>
                            String(d.id) === String(restoredDay.id)
                                ? restoredDay
                                : d,
                        ),
                    )
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
        activeScheduledItemForOverlay:
            isDraggingScheduledItem && activeDragId
                ? (days
                      .flatMap((day) => day.items)
                      .find((item) => String(item.id) === activeDragId) ?? null)
                : null,
        addPlaceToDay,
        handleDragStart,
        handleDragOver,
        handleDragCancel,
        handleDragEnd,
    }
}
