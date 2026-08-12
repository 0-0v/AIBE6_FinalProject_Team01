import assert from 'node:assert/strict'
import test from 'node:test'

import { buildClosedVotePlaceResults } from '../../../entities/trip/model/place-vote-results.ts'

const battleVote = {
    voteRequestId: 1,
    status: 'CLOSED',
    result: 'SELECTED',
    winnerTripPlaceId: 1,
    primaryPlace: { tripPlaceId: 1, name: 'A' },
    secondaryPlace: { tripPlaceId: 2, name: 'B' },
}

test('종료된 A/B 투표를 선정 장소와 미선정 장소로 각각 분리한다', () => {
    const selected = buildClosedVotePlaceResults([battleVote], 'SELECTED')
    const notSelected = buildClosedVotePlaceResults(
        [battleVote],
        'NOT_SELECTED',
    )

    assert.deepEqual(
        selected.map((entry) => entry.place.tripPlaceId),
        [1],
    )
    assert.deepEqual(
        notSelected.map((entry) => entry.place.tripPlaceId),
        [2],
    )
})

test('전체 결과에서는 A/B 장소를 중복 없이 한 번씩 노출한다', () => {
    const all = buildClosedVotePlaceResults([battleVote], 'ALL')

    assert.deepEqual(
        all.map((entry) => entry.place.tripPlaceId),
        [1, 2],
    )
})

test('재투표 결과는 장소별 가장 최근에 종료된 결과만 노출한다', () => {
    const latestLoss = {
        ...battleVote,
        voteRequestId: 2,
        winnerTripPlaceId: 2,
    }
    const oldWin = {
        ...battleVote,
        voteRequestId: 1,
        secondaryPlace: null,
        winnerTripPlaceId: 1,
    }

    const results = buildClosedVotePlaceResults([oldWin, latestLoss], 'ALL')
    const placeA = results.filter((entry) => entry.place.tripPlaceId === 1)

    assert.equal(placeA.length, 1)
    assert.equal(placeA[0].outcome, 'NOT_SELECTED')
})
