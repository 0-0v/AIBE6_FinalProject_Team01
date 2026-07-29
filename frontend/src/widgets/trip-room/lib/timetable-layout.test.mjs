import assert from 'node:assert/strict'
import test from 'node:test'
import { getTimetableHourRange } from './timetable-layout.ts'

test('t1 일정이 없으면 사용자 활동 시간인 09시부터 21시까지 표시한다', () => {
    assert.deepEqual(getTimetableHourRange([]), {
        startHour: 9,
        endHour: 21,
    })
})

test('t2 이른 일정과 늦은 일정이 있으면 시간표 범위를 자동 확장한다', () => {
    assert.deepEqual(
        getTimetableHourRange([
            { startTime: '07:30', endTime: '08:40' },
            { startTime: '20:30', endTime: '22:15' },
        ]),
        {
            startHour: 7,
            endHour: 23,
        },
    )
})

test('t3 종료 시간이 없으면 시작 시간부터 한 시간을 확보한다', () => {
    assert.deepEqual(
        getTimetableHourRange([{ startTime: '21:30', endTime: null }]),
        {
            startHour: 9,
            endHour: 22,
        },
    )
})
