import type { PlaceVoteSummary } from './types'

export type ClosedVoteOutcome = 'SELECTED' | 'NOT_SELECTED' | 'TIE'
export type ClosedVoteFilter = 'ALL' | ClosedVoteOutcome

export type ClosedVotePlaceResult = {
    vote: PlaceVoteSummary
    place: PlaceVoteSummary['primaryPlace']
    outcome: ClosedVoteOutcome
}

export function closedVoteOutcomeForPlace(
    vote: PlaceVoteSummary | undefined,
    tripPlaceId: number,
): ClosedVoteOutcome | null {
    if (vote?.status !== 'CLOSED') return null
    const belongsToVote =
        vote.primaryPlace.tripPlaceId === tripPlaceId ||
        vote.secondaryPlace?.tripPlaceId === tripPlaceId
    if (!belongsToVote) return null
    if (vote.result === 'TIE') return 'TIE'
    return vote.winnerTripPlaceId === tripPlaceId ? 'SELECTED' : 'NOT_SELECTED'
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
                outcome: closedVoteOutcomeForPlace(vote, tripPlaceId)!,
            }
        })
        .filter((entry) => filter === 'ALL' || entry.outcome === filter)
}
