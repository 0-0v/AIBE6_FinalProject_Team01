import assert from 'node:assert/strict'
import test from 'node:test'
import {
    findOverlappingItem,
    formatTimeRange,
    getNextSortOrder,
} from './itinerary-time.ts'

function item(id, startTime, endTime) {
    return {
        id,
        startTime,
        endTime,
        placeName: `장소 ${id}`,
        sortOrder: Number(id),
    }
}

test('t1 시간이 겹치는 다른 일정 항목을 반환한다', () => {
    const overlap = findOverlappingItem('1', '10:00', '11:00', [
        item('1', '10:00', '11:00'),
        item('2', '10:30', '12:00'),
    ])

    assert.equal(overlap?.id, '2')
})

test('t2 종료 시간과 다음 시작 시간이 같으면 겹치지 않는다', () => {
    const overlap = findOverlappingItem('1', '10:00', '11:00', [
        item('2', '11:00', '12:00'),
    ])

    assert.equal(overlap, null)
})

test('t3 시작 또는 종료 시간이 없으면 중복 검사를 건너뛴다', () => {
    assert.equal(
        findOverlappingItem('1', '', '11:00', [item('2', '10:00', '12:00')]),
        null,
    )
})

test('t4 시작과 종료 시간이 없으면 시간 미정으로 표시한다', () => {
    assert.equal(formatTimeRange(null, null), '시간 미정')
})

test('t5 한쪽 시간만 있으면 설정된 시간만 표시한다', () => {
    assert.equal(formatTimeRange('10:00', null), '시작 10:00')
    assert.equal(formatTimeRange(null, '11:00'), '종료 11:00')
})

test('t6 순번에 공백이 있어도 가장 큰 순번 다음 값을 반환한다', () => {
    assert.equal(
        getNextSortOrder([
            { ...item('1', null, null), sortOrder: 0 },
            { ...item('2', null, null), sortOrder: 2 },
        ]),
        3,
    )
    assert.equal(getNextSortOrder([]), 0)
})
