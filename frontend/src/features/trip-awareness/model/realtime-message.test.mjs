import assert from 'node:assert/strict'
import test from 'node:test'
import {
    isAccountSuspendedEvent,
    isTripRealtimeEvent,
    parseRealtimeMessage,
} from '../../../shared/lib/realtime-event.ts'

test('t1 올바른 객체 메시지를 파싱한다', () => {
    assert.deepEqual(parseRealtimeMessage('{"eventId":"event-1"}'), {
        eventId: 'event-1',
    })
})

test('t2 잘못된 JSON 메시지는 예외 없이 무시한다', () => {
    assert.equal(parseRealtimeMessage('{invalid'), null)
})

test('t3 대상 여행방과 이벤트 유형이 모두 일치할 때만 처리한다', () => {
    const event = {
        eventId: 'event-1',
        type: 'TRIP_MEMBERS_CHANGED',
        tripId: 7,
        targetType: 'TRIP',
        targetId: 7,
        occurredAt: '2026-08-14T00:00:00Z',
    }

    assert.equal(isTripRealtimeEvent(event, 7, 'TRIP_MEMBERS_CHANGED'), true)
    assert.equal(isTripRealtimeEvent(event, 8, 'TRIP_MEMBERS_CHANGED'), false)
    assert.equal(isTripRealtimeEvent(null, 7, 'TRIP_MEMBERS_CHANGED'), false)
})

test('t4 현재 회원에게 전달된 유효한 정지 이벤트만 처리한다', () => {
    assert.equal(
        isAccountSuspendedEvent(
            { memberId: 7, noticeToken: 'notice-token' },
            7,
        ),
        true,
    )
    assert.equal(
        isAccountSuspendedEvent(
            { memberId: 8, noticeToken: 'notice-token' },
            7,
        ),
        false,
    )
    assert.equal(
        isAccountSuspendedEvent({ memberId: 7, noticeToken: '   ' }, 7),
        false,
    )
})
