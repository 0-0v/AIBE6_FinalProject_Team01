'use client'

import { useState } from 'react'
import {
    getItinerary,
    updateItineraryItem,
    type ItineraryDay,
    type ItineraryItem,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { findOverlappingItem } from '../lib/itinerary-time'

type Params = {
    tripId: number
    item: ItineraryItem
    dayItems: ItineraryItem[]
    onUpdated: (days: ItineraryDay[]) => void
}

export function useItineraryItemEditor({
    tripId,
    item,
    dayItems,
    onUpdated,
}: Params) {
    const [editing, setEditing] = useState(false)
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [memo, setMemo] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [overlapWarning, setOverlapWarning] = useState<string | null>(null)

    function beginEditing() {
        setStartTime(item.startTime ?? '')
        setEndTime(item.endTime ?? '')
        setMemo(item.memo ?? '')
        setSaveError(null)
        setOverlapWarning(null)
        setEditing(true)
    }

    function cancelEditing() {
        setEditing(false)
        setSaveError(null)
        setOverlapWarning(null)
    }

    function changeStartTime(value: string) {
        setStartTime(value)
        setOverlapWarning(null)
    }

    function changeEndTime(value: string) {
        setEndTime(value)
        setOverlapWarning(null)
    }

    async function save(force = false) {
        const overlappingItem = findOverlappingItem(
            item.id,
            startTime,
            endTime,
            dayItems,
        )
        if (!force && overlappingItem) {
            setOverlapWarning(
                `${overlappingItem.placeName ?? '다른 장소'}의 ${
                    overlappingItem.startTime ?? ''
                }~${overlappingItem.endTime ?? ''} 일정과 시간이 겹칩니다.`,
            )
            return
        }

        setOverlapWarning(null)
        setSaving(true)
        setSaveError(null)
        try {
            await updateItineraryItem(tripId, Number(item.id), {
                startTime: startTime || null,
                endTime: endTime || null,
                memo: memo || null,
            })
            onUpdated(await getItinerary(tripId))
            setEditing(false)
        } catch (error) {
            setSaveError(getApiErrorMessage(error, '저장에 실패했습니다.'))
        } finally {
            setSaving(false)
        }
    }

    return {
        editing,
        startTime,
        endTime,
        memo,
        saving,
        saveError,
        overlapWarning,
        setMemo,
        beginEditing,
        cancelEditing,
        changeStartTime,
        changeEndTime,
        save,
    }
}
