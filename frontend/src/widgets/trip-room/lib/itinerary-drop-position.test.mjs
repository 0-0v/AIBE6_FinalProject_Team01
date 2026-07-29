import assert from 'node:assert/strict'
import test from 'node:test'

import {
    buildItineraryDropZoneId,
    getCrossDayInsertionIndex,
    getSameDayInsertionIndex,
    getSameDayInsertionIndexAtBoundary,
    parseItineraryDropZoneId,
} from './itinerary-drop-position.ts'

const items = [{ id: 1 }, { id: 2 }, { id: 3 }]

test('t1 다른 Day의 첫 카드 위에 놓으면 맨 앞에 삽입한다', () => {
    assert.equal(getCrossDayInsertionIndex(items, '1', false), 0)
})

test('t2 다른 Day의 마지막 카드 아래에 놓으면 맨 뒤에 삽입한다', () => {
    assert.equal(getCrossDayInsertionIndex(items, '3', true), 3)
})

test('t3 Day 빈 영역에 놓으면 맨 뒤에 삽입한다', () => {
    assert.equal(getCrossDayInsertionIndex(items, 'day-1', false), 3)
})

test('t4 같은 Day에서 앞 카드를 대상 카드 아래로 옮긴다', () => {
    assert.equal(getSameDayInsertionIndex(items, '1', '2', true), 1)
})

test('t5 같은 Day에서 뒤 카드를 대상 카드 위로 옮긴다', () => {
    assert.equal(getSameDayInsertionIndex(items, '3', '1', false), 0)
})

test('t6 같은 Day의 맨 뒤 경계에 놓으면 마지막 순번으로 이동한다', () => {
    assert.equal(getSameDayInsertionIndexAtBoundary(items, '1', 3), 2)
})

test('t7 드롭 영역 식별자에서 Day와 삽입 위치를 복원한다', () => {
    const id = buildItineraryDropZoneId('day-2', 3)
    assert.deepEqual(parseItineraryDropZoneId(id), {
        dayId: 'day-2',
        insertionIndex: 3,
    })
})
