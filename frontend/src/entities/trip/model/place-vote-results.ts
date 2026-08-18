import type { PlaceVoteSummary } from './types'

export type ClosedVoteOutcome = 'SELECTED' | 'NOT_SELECTED' | 'TIE'
export type ClosedVoteFilter = 'ALL' | ClosedVoteOutcome

export type ClosedVotePlaceResult = {
    vote: PlaceVoteSummary
    place: PlaceVoteSummary['primaryPlace']
    outcome: ClosedVoteOutcome
}

export function latestVoteByPlaceId(votes: PlaceVoteSummary[]) {
    const latest = new Map<number, PlaceVoteSummary>()
    ;[...votes]
        .sort((first, second) => second.voteRequestId - first.voteRequestId)
        .forEach((vote) => {
            ;[vote.primaryPlace, vote.secondaryPlace]
                .filter(
                    (place): place is PlaceVoteSummary['primaryPlace'] =>
                        place != null,
                )
                .forEach((place) => {
                    if (!latest.has(place.tripPlaceId))
                        latest.set(place.tripPlaceId, vote)
                })
        })
    return latest
}

export function buildClosedVotePlaceResults(
    votes: PlaceVoteSummary[],
    filter: ClosedVoteFilter,
): ClosedVotePlaceResult[] {
    const closedVotes = votes.filter((vote) => vote.status === 'CLOSED')
    return [...latestVoteByPlaceId(closedVotes).entries()]
        .map(([tripPlaceId, vote]) => {
            const place =
                vote.primaryPlace.tripPlaceId === tripPlaceId
                    ? vote.primaryPlace
                    : vote.secondaryPlace!
            return {
                vote,
                place,
                outcome:
                    vote.result === 'TIE'
                        ? ('TIE' as const)
                        : vote.winnerTripPlaceId === tripPlaceId
                          ? ('SELECTED' as const)
                          : ('NOT_SELECTED' as const),
            }
        })
        .filter((entry) => filter === 'ALL' || entry.outcome === filter)
}
