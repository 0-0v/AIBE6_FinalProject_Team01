import assert from 'node:assert/strict'
import test from 'node:test'
import {
    filterPublicRecordsForDay,
    mergePublicRecordsWithItinerary,
} from './public-records.ts'

test('t1 숫자와 문자열 장소 ID가 섞여도 선택한 Day의 기록을 반환한다', () => {
    const day = {
        itineraryDate: '2026-08-17',
        items: [{ tripPlaceId: 101 }],
    }
    const records = [
        {
            id: 1,
            tripPlaceId: 101,
            visitedAt: '2026-08-18T10:00:00',
        },
        {
            id: 2,
            tripPlaceId: 202,
            visitedAt: '2026-08-18T11:00:00',
        },
    ]

    assert.deepEqual(filterPublicRecordsForDay(records, day), [records[0]])
})

test('t2 일정 장소 ID가 없어도 방문 날짜가 같으면 기록을 반환한다', () => {
    const day = {
        itineraryDate: '2026-08-17',
        items: [],
    }
    const records = [
        {
            id: 1,
            tripPlaceId: null,
            visitedAt: '2026-08-17T10:00:00',
        },
    ]

    assert.deepEqual(filterPublicRecordsForDay(records, day), records)
})

test('t3 기록이 없는 일정 장소도 일정 순서대로 공개 항목에 포함한다', () => {
    const day = {
        itineraryDate: '2026-08-17',
        items: [
            { id: 'item-1', tripPlaceId: 101 },
            { id: 'item-2', tripPlaceId: 202 },
        ],
    }
    const records = [
        {
            id: 1,
            tripPlaceId: 101,
            visitedAt: '2026-08-17T10:00:00',
        },
    ]

    assert.deepEqual(mergePublicRecordsWithItinerary(records, day), [
        { kind: 'record', itineraryItem: day.items[0], record: records[0] },
        { kind: 'itinerary', itineraryItem: day.items[1] },
    ])
})

test('t4 일정에 연결되지 않은 당일 기록은 마지막에 유지한다', () => {
    const day = {
        itineraryDate: '2026-08-17',
        items: [{ id: 'item-1', tripPlaceId: 101 }],
    }
    const records = [
        {
            id: 1,
            tripPlaceId: null,
            visitedAt: '2026-08-17T10:00:00',
        },
    ]

    assert.deepEqual(mergePublicRecordsWithItinerary(records, day), [
        { kind: 'itinerary', itineraryItem: day.items[0] },
        { kind: 'record', itineraryItem: null, record: records[0] },
    ])
})
