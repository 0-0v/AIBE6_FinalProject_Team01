import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGoogleMapsDirectionsUrl } from './google-maps-directions.ts'

const origin = { lat: 37.5665, lng: 126.978 }
const destination = { lat: 37.57, lng: 126.99 }

test('t1 지하철과 버스는 Google Maps 대중교통 길찾기로 연결한다', () => {
    for (const mode of ['지하철', '버스']) {
        const url = new URL(
            buildGoogleMapsDirectionsUrl(origin, destination, mode),
        )
        assert.equal(url.searchParams.get('travelmode'), 'transit')
    }
})

test('t2 택시는 Google Maps 자동차 길찾기로 연결한다', () => {
    const url = new URL(
        buildGoogleMapsDirectionsUrl(origin, destination, '택시'),
    )

    assert.equal(url.searchParams.get('travelmode'), 'driving')
    assert.equal(url.searchParams.get('origin'), '37.5665,126.978')
    assert.equal(url.searchParams.get('destination'), '37.57,126.99')
})
