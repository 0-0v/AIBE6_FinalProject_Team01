import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate } from 'k6/metrics'
import { BASE_URL, authParams, login } from './lib/client.js'

const flowFailures = new Rate('realistic_flow_failures')
const accountCount = Number(__ENV.PERFORMANCE_MEMBER_COUNT || 1000)
const password = __ENV.TEST_PASSWORD || 'PlamingoLoad1!'

export const options = {
    scenarios: {
        realistic_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: __ENV.STAGE_100 || '3m', target: 100 },
                { duration: __ENV.STAGE_300 || '3m', target: 300 },
                { duration: __ENV.STAGE_500 || '3m', target: 500 },
                { duration: __ENV.STAGE_750 || '3m', target: 750 },
                { duration: __ENV.STAGE_1000 || '3m', target: 1000 },
                { duration: __ENV.HOLD_1000 || '10m', target: 1000 },
                { duration: __ENV.RAMP_DOWN || '5m', target: 0 },
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        realistic_flow_failures: ['rate<0.01'],
        'http_req_duration{flow:dashboard}': ['p(95)<500', 'p(99)<1000'],
        'http_req_duration{flow:trip_room}': ['p(95)<700', 'p(99)<1500'],
        'http_req_duration{flow:write}': ['p(95)<1000', 'p(99)<2000'],
    },
}

let session
let notificationsMarked = false
let lastPresenceAt = 0

function accountEmail(index) {
    return `performance-user-${String(index).padStart(4, '0')}@plamingo.app`
}

function checkAll(responses, label) {
    const passed = check(responses, {
        [`${label} 전체 응답 정상`]: (results) =>
            results.every((response) => response.status === 200),
    })
    flowFailures.add(!passed)
    return passed
}

function ensureSession() {
    if (session) return session
    const accountIndex = ((__VU - 1) % accountCount) + 1
    const token = login({ email: accountEmail(accountIndex), password })
    const tripsResponse = http.get(`${BASE_URL}/api/trips`, {
        ...authParams(token),
        tags: { flow: 'dashboard', endpoint: 'trips' },
    })
    const tripId = tripsResponse.json('data.0.id')
    const ready = check(tripsResponse, {
        '개별 계정 여행방 조회 성공': (response) => response.status === 200,
        '개별 계정 여행방 존재': () => Number.isInteger(Number(tripId)),
    })
    flowFailures.add(!ready)
    if (!ready) return null
    session = { token, tripId: Number(tripId) }
    return session
}

function dashboardFlow(current) {
    const params = authParams(current.token)
    const responses = http.batch([
        ['GET', `${BASE_URL}/api/trips`, null, { ...params, tags: { flow: 'dashboard', endpoint: 'trips' } }],
        ['GET', `${BASE_URL}/api/notifications?page=0&size=6`, null, { ...params, tags: { flow: 'dashboard', endpoint: 'notifications' } }],
        ['GET', `${BASE_URL}/api/notifications/unread-count`, null, { ...params, tags: { flow: 'dashboard', endpoint: 'unread_count' } }],
    ])
    checkAll(responses, '대시보드')
}

function tripRoomFlow(current) {
    const params = authParams(current.token)
    const trip = `${BASE_URL}/api/trips/${current.tripId}`
    const tagged = (endpoint) => ({ ...params, tags: { flow: 'trip_room', endpoint } })
    const responses = http.batch([
        ['GET', `${trip}/members`, null, tagged('trip_members')],
        ['GET', `${trip}/itinerary`, null, tagged('itinerary')],
    ])
    checkAll(responses, '여행방')
}

function boundedWriteFlow(current) {
    const params = authParams(current.token)
    const now = Date.now()
    if (now - lastPresenceAt >= 30000) {
        const response = http.post(
            `${BASE_URL}/api/trips/${current.tripId}/presence`,
            null,
            { ...params, tags: { flow: 'write', endpoint: 'presence' } },
        )
        const passed = check(response, {
            'presence 갱신 성공': (result) => result.status === 200,
        })
        flowFailures.add(!passed)
        lastPresenceAt = now
    }

    if (!notificationsMarked && Math.random() < 0.03) {
        const response = http.patch(
            `${BASE_URL}/api/notifications/read-all`,
            null,
            { ...params, tags: { flow: 'write', endpoint: 'notifications_read_all' } },
        )
        const passed = check(response, {
            '알림 전체 읽음 성공': (result) => result.status === 200,
        })
        flowFailures.add(!passed)
        notificationsMarked = passed
    }
}

export default function () {
    const current = ensureSession()
    if (!current) {
        sleep(1)
        return
    }

    const roll = Math.random()
    if (roll < 0.3) {
        group('대시보드 조회', () => dashboardFlow(current))
    } else {
        group('여행방 진입', () => tripRoomFlow(current))
    }
    boundedWriteFlow(current)
    sleep(2 + Math.random() * 6)
}
