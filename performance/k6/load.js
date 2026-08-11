import { defaultThresholds, login, readScenario } from './lib/client.js'

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
    ],
    thresholds: defaultThresholds,
}

export function setup() {
    return { token: login() }
}

export default function (data) {
    readScenario(data.token)
}

