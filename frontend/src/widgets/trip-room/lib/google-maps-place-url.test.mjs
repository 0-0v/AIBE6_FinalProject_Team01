import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGoogleMapsPlaceUrl } from './google-maps-place-url.ts'

test('t1 Google Place ID가 있으면 장소 식별자를 포함한다', () => {
    const url = new URL(
        buildGoogleMapsPlaceUrl({
            name: '한시장',
            lat: 16.068,
            lng: 108.224,
            googlePlaceId: 'google-place-id',
        }),
    )

    assert.equal(url.searchParams.get('query'), '한시장')
    assert.equal(url.searchParams.get('query_place_id'), 'google-place-id')
})

test('t2 Google Place ID가 없으면 좌표로 장소를 조회한다', () => {
    const url = new URL(
        buildGoogleMapsPlaceUrl({
            name: '한시장',
            lat: 16.068,
            lng: 108.224,
        }),
    )

    assert.equal(url.searchParams.get('query'), '16.068,108.224')
    assert.equal(url.searchParams.has('query_place_id'), false)
})
