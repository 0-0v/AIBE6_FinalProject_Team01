import { defaultThresholds, login, readScenario } from './lib/client.js'

export const options = {
    stages: [
        { duration: '2m', target: 30 },
        { duration: __ENV.SOAK_DURATION || '30m', target: 30 },
        { duration: '2m', target: 0 },
    ],
    thresholds: defaultThresholds,
}

export function setup() {
    return { token: login() }
}

export default function (data) {
    readScenario(data.token)
}

