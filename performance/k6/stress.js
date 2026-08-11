import { login, readScenario } from './lib/client.js'

export const options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<1500'],
    },
}

export function setup() {
    return { token: login() }
}

export default function (data) {
    readScenario(data.token)
}

