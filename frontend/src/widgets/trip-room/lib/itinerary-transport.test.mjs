import assert from 'node:assert/strict'
import test from 'node:test'
import {
    formatTransportSummary,
    resolveSelectableTransportMode,
} from './itinerary-transport.ts'

test('t1 이동 정보가 없으면 미설정 상태를 표시한다', () => {
    assert.equal(
        formatTransportSummary({
            transportMinutes: null,
            transportMeters: null,
            transportMode: null,
        }),
        '이동 정보 미설정',
    )
})

test('t2 이동수단과 시간 및 거리를 한 문장으로 표시한다', () => {
    assert.equal(
        formatTransportSummary({
            transportMinutes: 35,
            transportMeters: 1250,
            transportMode: '자동차',
        }),
        '자동차 · 예상 35분 · 1.3km',
    )
})

test('t3 기존 지하철 선호는 철도 우선 선택지로 표시한다', () => {
    assert.equal(
        resolveSelectableTransportMode({
            transportMode: '지하철',
            transportModePreference: 'SUBWAY',
        }),
        'RAIL',
    )
})

test('t4 숨겨진 자동값은 실제 이동수단에 맞는 선택지로 표시한다', () => {
    assert.equal(
        resolveSelectableTransportMode({
            transportMode: '버스',
            transportModePreference: null,
        }),
        'BUS',
    )
})
