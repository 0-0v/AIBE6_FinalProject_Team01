import assert from 'node:assert/strict'
import test from 'node:test'
import {
    compactAddress,
    isVisitedAtRangeMessage,
    summarizeExpenses,
} from './record-panel-helpers.ts'

test('t1 대한민국을 제외한 주소 앞 두 구역을 표시한다', () => {
    assert.equal(
        compactAddress('대한민국 서울특별시 종로구 청운동'),
        '서울특별시 종로구',
    )
})

test('t2 주소가 없으면 미정 문구를 표시한다', () => {
    assert.equal(compactAddress(null), '주소 미정')
})

test('t3 방문 일시 범위 오류만 식별한다', () => {
    assert.equal(
        isVisitedAtRangeMessage('방문 일시는 여행 기간 안이어야 합니다.'),
        true,
    )
    assert.equal(isVisitedAtRangeMessage('다른 오류'), false)
})

test('t4 총지출과 받을 금액 및 보낼 금액을 회원 기준으로 계산한다', () => {
    const expenses = [
        {
            totalAmount: 30_000,
            payerId: 1,
            participants: [
                { memberId: 1, shareAmount: 10_000, status: 'PENDING' },
                { memberId: 2, shareAmount: 20_000, status: 'PENDING' },
            ],
        },
        {
            totalAmount: 12_000,
            payerId: 2,
            participants: [
                { memberId: 1, shareAmount: 6_000, status: 'PENDING' },
                { memberId: 2, shareAmount: 6_000, status: 'PENDING' },
            ],
        },
    ]

    assert.deepEqual(summarizeExpenses(expenses, 1), {
        totalExpense: 42_000,
        myReceivable: 20_000,
        myPayable: 6_000,
    })
})
