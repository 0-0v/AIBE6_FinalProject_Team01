import http from 'k6/http'
import { check } from 'k6'
import { BASE_URL, authParams, defaultThresholds, login } from './lib/client.js'

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: defaultThresholds,
}

export function setup() {
    return { token: login() }
}

export default function (data) {
    const health = http.get(`${BASE_URL}/actuator/health`)
    check(health, { '서버 상태 정상': (result) => result.status === 200 })

    const trips = http.get(`${BASE_URL}/api/trips`, authParams(data.token))
    check(trips, { '여행방 목록 조회 성공': (result) => result.status === 200 })

    if (__ENV.EXPECT_EXTERNAL_GUARD === 'true') {
        const blocked = http.get(`${BASE_URL}/api/places/search?query=osaka`, {
            responseCallback: http.expectedStatuses(503),
        })
        check(blocked, {
            '외부 Google API 차단 확인': (result) => result.status === 503,
        })
    }
}
