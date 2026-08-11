import ws from 'k6/ws'
import { check } from 'k6'
import { Counter, Trend } from 'k6/metrics'
import { WS_URL, login } from './lib/client.js'

const connected = new Counter('websocket_connected')
const connectDuration = new Trend('websocket_connect_duration', true)

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        websocket_connected: ['count>0'],
        websocket_connect_duration: ['p(95)<1000'],
    },
}

export function setup() {
    return { token: login() }
}

export default function (data) {
    const startedAt = Date.now()
    const response = ws.connect(WS_URL, {}, (socket) => {
        socket.on('open', () => {
            socket.send(`CONNECT\naccept-version:1.2\nheart-beat:10000,10000\nAuthorization:Bearer ${data.token}\n\n\0`)
        })
        socket.on('message', (message) => {
            if (message.startsWith('CONNECTED')) {
                connected.add(1)
                connectDuration.add(Date.now() - startedAt)
                if (__ENV.TRIP_ID) {
                    socket.send(`SUBSCRIBE\nid:trip-${__VU}\ndestination:/topic/trips/${__ENV.TRIP_ID}\n\n\0`)
                }
            }
        })
        socket.setTimeout(() => socket.close(), 15000)
    })
    check(response, { 'WebSocket 업그레이드 성공': (result) => result?.status === 101 })
}

