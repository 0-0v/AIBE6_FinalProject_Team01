import assert from 'node:assert/strict'
import test from 'node:test'
import { filterPublicRecordsForDay } from './public-records.ts'

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
