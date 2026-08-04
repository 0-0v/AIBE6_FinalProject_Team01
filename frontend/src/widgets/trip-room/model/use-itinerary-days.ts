'use client'

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type SetStateAction,
} from 'react'
import {
    getItinerary,
    initializeItinerary,
    type ItineraryDay,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'

export function useItineraryDays(
    tripId: number,
    canInitialize = true,
    refreshVersion = 0,
) {
    const [state, setState] = useState<{
        tripId: number
        days: ItineraryDay[]
        loading: boolean
        error: string | null
    }>({ tripId, days: [], loading: true, error: null })
    const activeRef = useRef(true)

    useEffect(() => {
        activeRef.current = true
        let active = true
        const loadDays = canInitialize ? initializeItinerary : getItinerary
        loadDays(tripId)
            .then((days) => {
                if (!active) return
                setState({ tripId, days, loading: false, error: null })
            })
            .catch((error: unknown) => {
                if (!active) return
                setState({
                    tripId,
                    days: [],
                    loading: false,
                    error: getApiErrorMessage(
                        error,
                        '일정을 불러오지 못했습니다.',
                    ),
                })
            })

        return () => {
            active = false
            activeRef.current = false
        }
    }, [canInitialize, tripId])

    const setDays = useCallback(
        (daysOrUpdater: SetStateAction<ItineraryDay[]>) => {
            setState((current) => {
                const currentDays =
                    current.tripId === tripId ? current.days : []
                const days =
                    typeof daysOrUpdater === 'function'
                        ? daysOrUpdater(currentDays)
                        : daysOrUpdater
                return {
                    tripId,
                    days,
                    loading: false,
                    error: null,
                }
            })
        },
        [tripId],
    )

    const refresh = useCallback(async () => {
        try {
            const days = await getItinerary(tripId)
            if (activeRef.current) {
                setState({ tripId, days, loading: false, error: null })
            }
            return days
        } catch (error) {
            if (activeRef.current) {
                setState((current) => ({
                    tripId,
                    days: current.tripId === tripId ? current.days : [],
                    loading: false,
                    error: getApiErrorMessage(
                        error,
                        '일정을 불러오지 못했습니다.',
                    ),
                }))
            }
            throw error
        }
    }, [tripId])

    const lastRefreshRef = useRef({ tripId, refreshVersion })

    useEffect(() => {
        const previous = lastRefreshRef.current
        lastRefreshRef.current = { tripId, refreshVersion }

        if (
            previous.tripId !== tripId ||
            previous.refreshVersion === refreshVersion
        ) {
            return
        }

        void refresh().catch(() => {
            // refresh에서 기존 일정은 유지하고 오류 상태를 반영한다.
        })
    }, [refresh, refreshVersion, tripId])

    return {
        days: state.tripId === tripId ? state.days : [],
        loading: state.tripId !== tripId || state.loading,
        error: state.tripId === tripId ? state.error : null,
        setDays,
        refresh,
    }
}
