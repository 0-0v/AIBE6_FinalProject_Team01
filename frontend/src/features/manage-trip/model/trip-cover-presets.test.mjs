import assert from 'node:assert/strict'
import test from 'node:test'
import { keepOrPickTripCoverPreset } from './trip-cover-presets.ts'

const presets = [
    { key: 'PRESET_1', url: '/cover-1.jpg' },
    { key: 'PRESET_2', url: '/cover-2.jpg' },
]

test('t1 서버 목록에 현재 커버가 있으면 같은 객체를 유지한다', () => {
    const current = { key: 'PRESET_1', url: '/initial-cover.jpg' }

    assert.equal(keepOrPickTripCoverPreset(current, presets), current)
})

test('t2 Strict Mode에서 목록을 반복 반영해도 커버가 바뀌지 않는다', () => {
    const current = { key: 'PRESET_1', url: '/initial-cover.jpg' }
    const first = keepOrPickTripCoverPreset(current, presets)
    const second = keepOrPickTripCoverPreset(first, presets)

    assert.equal(first, current)
    assert.equal(second, current)
})

test('t3 현재 커버가 비활성화된 경우에만 서버 목록에서 다시 선택한다', () => {
    const current = { key: 'INACTIVE', url: '/inactive.jpg' }
    const selected = keepOrPickTripCoverPreset(current, [presets[0]])

    assert.deepEqual(selected, presets[0])
})
