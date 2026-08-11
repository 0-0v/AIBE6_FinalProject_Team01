import { login, readScenario } from './lib/client.js'

export const options = {
    stages: [
        { duration: '20s', target: 10 },
        { duration: '10s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '20s', target: 10 },
        { duration: '20s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<2000'],
    },
}

export function setup() {
    return { token: login() }
}

export default function (data) {
    readScenario(data.token)
}

