import type { TripMember } from '@/features/manage-trip'

export function resolveMemberNickname(
    members: TripMember[],
    addedBy: string,
): string | undefined {
    return members.find((member) => member.memberId === Number(addedBy))
        ?.nickname
}
