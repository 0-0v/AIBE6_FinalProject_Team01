import test from 'node:test'
import assert from 'node:assert/strict'
import { getJwtExpirationTime } from '../../../shared/lib/jwt-expiration.ts'

function tokenWithExpiration(expirationSeconds) {
    const payload = Buffer.from(
        JSON.stringify({ exp: expirationSeconds }),
    ).toString('base64url')
    return `header.${payload}.signature`
}

test('t1 JWT의 만료 시각을 밀리초로 반환한다', () => {
    assert.equal(getJwtExpirationTime(tokenWithExpiration(1234)), 1_234_000)
})

test('t2 형식이 잘못된 JWT는 만료 시각을 반환하지 않는다', () => {
    assert.equal(getJwtExpirationTime('invalid-token'), null)
})
