import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveMemberNickname } from './member-lookup.ts'

const members = [
    { memberId: 1, nickname: '박흥준', profileImageUrl: null, online: true },
    { memberId: 2, nickname: '김철수', profileImageUrl: null, online: false },
]

test('t1 addedBy와 일치하는 멤버가 있으면 닉네임을 반환한다', () => {
    assert.equal(resolveMemberNickname(members, '2'), '김철수')
})

test('t2 일치하는 멤버가 없으면 undefined를 반환한다', () => {
    assert.equal(resolveMemberNickname(members, '999'), undefined)
})
