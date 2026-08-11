import http from 'k6/http'
import { check, fail, sleep } from 'k6'

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080'
export const WS_URL = __ENV.WS_URL || BASE_URL.replace(/^http/, 'ws') + '/ws'

export const defaultThresholds = {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
}

export function login() {
    const response = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            identifier: __ENV.TEST_EMAIL || 'test-user-1@plamingo.app',
            password: __ENV.TEST_PASSWORD,
        }),
        { headers: { 'Content-Type': 'application/json' } },
    )
    const passed = check(response, {
        '로그인 성공': (result) => result.status === 200,
        '액세스 토큰 발급': (result) => Boolean(result.json('data.accessToken')),
    })
    if (!passed) {
        fail(`로그인 실패: status=${response.status}`)
    }
    return response.json('data.accessToken')
}

export function authParams(token) {
    return { headers: { Authorization: `Bearer ${token}` } }
}

export function readScenario(token) {
    const params = authParams(token)
    const responses = http.batch([
        ['GET', `${BASE_URL}/api/trips`, null, params],
        ['GET', `${BASE_URL}/api/notifications?page=0&size=20`, null, params],
        ['GET', `${BASE_URL}/api/notifications/unread-count`, null, params],
        ['GET', `${BASE_URL}/api/cards/public?page=0&size=9&sort=LATEST`, null, params],
    ])
    check(responses, {
        '여행방 목록 조회 정상': (results) => results[0].status === 200,
        '알림 목록 조회 정상': (results) => results[1].status === 200,
        '읽지 않은 알림 수 조회 정상': (results) => results[2].status === 200,
        '공개 카드 목록 조회 정상': (results) => results[3].status === 200,
    })
    sleep(Number(__ENV.THINK_TIME_SECONDS || 1))
}
