import ws from 'k6/ws'
import { check } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { WS_URL, login } from './lib/client.js'

const connectionFailures = new Rate('realistic_ws_connection_failures')
const connectDuration = new Trend('realistic_ws_connect_duration', true)
const accountCount = Number(__ENV.PERFORMANCE_MEMBER_COUNT || 1000)
const password = __ENV.TEST_PASSWORD || 'PlamingoLoad1!'

export const options = {
    scenarios: {
        websocket_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: __ENV.WS_RAMP_100 || '1m', target: 100 },
                { duration: __ENV.WS_RAMP_500 || '2m', target: 500 },
                { duration: __ENV.WS_RAMP_1000 || '2m', target: 1000 },
                { duration: __ENV.WS_HOLD_1000 || '5m', target: 1000 },
                { duration: __ENV.WS_RAMP_DOWN || '2m', target: 0 },
            ],
        },
    },
    thresholds: {
        realistic_ws_connection_failures: ['rate<0.01'],
        realistic_ws_connect_duration: ['p(95)<1000', 'p(99)<2000'],
    },
}

function emailForVu() {
    const accountIndex = ((__VU - 1) % accountCount) + 1
    return `performance-user-${String(accountIndex).padStart(4, '0')}@plamingo.app`
}

export default function () {
    const token = login({ email: emailForVu(), password })
    const startedAt = Date.now()
    let connected = false
    const response = ws.connect(WS_URL, {}, (socket) => {
        socket.on('open', () => {
            socket.send(`CONNECT\naccept-version:1.2\nheart-beat:10000,10000\nAuthorization:Bearer ${token}\n\n\0`)
        })
        socket.on('message', (message) => {
            if (!message.startsWith('CONNECTED') || connected) return
            connected = true
            connectDuration.add(Date.now() - startedAt)
            socket.send(`SUBSCRIBE\nid:user-${__VU}\ndestination:/user/queue/notifications\n\n\0`)
        })
        socket.setTimeout(() => socket.close(), Number(__ENV.WS_SESSION_MS || 30000))
    })
    const passed = check(response, {
        'WebSocket 업그레이드 성공': (result) => result?.status === 101,
    }) && connected
    connectionFailures.add(!passed)
}
