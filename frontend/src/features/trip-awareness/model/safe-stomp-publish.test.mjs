import assert from 'node:assert/strict'
import test from 'node:test'
import { safeStompPublish } from './safe-stomp-publish.ts'

test('t1 연결된 STOMP 클라이언트만 메시지를 발행한다', () => {
    const published = []
    const result = safeStompPublish(
        {
            connected: true,
            publish: (frame) => published.push(frame),
        },
        '/app/trip-awareness/1',
        '{"workspace":"places"}',
    )

    assert.equal(result, true)
    assert.deepEqual(published, [
        {
            destination: '/app/trip-awareness/1',
            body: '{"workspace":"places"}',
        },
    ])
})

test('t2 종료된 STOMP 클라이언트에는 메시지를 발행하지 않는다', () => {
    let publishCount = 0
    const result = safeStompPublish(
        {
            connected: false,
            publish: () => {
                publishCount += 1
            },
        },
        '/app/trip-awareness/1',
        '{}',
    )

    assert.equal(result, false)
    assert.equal(publishCount, 0)
})

test('t3 연결 종료 경쟁으로 publish가 실패해도 예외를 전파하지 않는다', () => {
    const result = safeStompPublish(
        {
            connected: true,
            publish: () => {
                throw new Error('There is no underlying STOMP connection')
            },
        },
        '/app/trip-awareness/1',
        '{}',
    )

    assert.equal(result, false)
})
