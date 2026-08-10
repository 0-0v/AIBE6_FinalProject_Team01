import assert from 'node:assert/strict'
import test from 'node:test'
import {
    isAnchorPlace,
    resolvePlaceDisplayIcon,
} from '../../../entities/trip/model/place-display-icon.ts'

test('t1 교통 장소는 세부 타입에 맞는 아이콘을 사용한다', () => {
    assert.equal(
        resolvePlaceDisplayIcon('transport', 'PLANE', 'airport'),
        'PLANE',
    )
    assert.equal(
        resolvePlaceDisplayIcon('transport', 'PLANE', 'train_station'),
        'TRAIN',
    )
    assert.equal(
        resolvePlaceDisplayIcon('transport', 'PLANE', 'bus_station'),
        'BUS',
    )
    assert.equal(
        resolvePlaceDisplayIcon('transport', 'PLANE', 'ferry_terminal'),
        'SHIP',
    )
    assert.equal(
        resolvePlaceDisplayIcon('transport', 'PLANE', 'parking'),
        'PARKING',
    )
})

test('t2 알 수 없는 교통 장소는 비행기 대신 중립 아이콘을 사용한다', () => {
    assert.equal(
        resolvePlaceDisplayIcon('transport', 'PLANE', null),
        'ROUTE',
    )
    assert.equal(
        resolvePlaceDisplayIcon(
            'transport',
            'PLANE',
            'transportation_service',
        ),
        'ROUTE',
    )
})

test('t3 교통 외 장소는 저장된 카테고리 아이콘을 유지한다', () => {
    assert.equal(
        resolvePlaceDisplayIcon('attraction', 'LANDMARK', 'museum'),
        'LANDMARK',
    )
})

test('t4 숙소와 공항 및 기차역만 축소 지도 기준점으로 사용한다', () => {
    assert.equal(isAnchorPlace('lodging', null), true)
    assert.equal(isAnchorPlace('transport', 'airport'), true)
    assert.equal(isAnchorPlace('transport', 'train_station'), true)
    assert.equal(isAnchorPlace('transport', 'subway_station'), false)
    assert.equal(isAnchorPlace('transport', 'bus_station'), false)
})
