import type { Place } from '@/entities/trip'
import { DESIGN_COLORS } from '@/shared/config'
import { useCurrentUserStore } from '@/shared/model'
import { DEFAULT_AVATAR_COLOR } from '@/shared/ui'

// 장소 카드/상세 패널에 공통으로 쓰는 "등록자" 표시 정보 —
// 내가 등록한 장소면 내 닉네임/기본 색상, 아니면 전달받은 닉네임(또는 "멤버")과 회색을 쓴다.
export function useAdderDisplay(place: Place, addedByNickname?: string) {
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const isMe = place.addedBy === String(currentUser?.id)
    const adderName =
        addedByNickname ?? (isMe ? (currentUser?.nickname ?? '나') : '멤버')
    const adderColor = isMe ? DEFAULT_AVATAR_COLOR : DESIGN_COLORS.app.textMuted
    return { adderName, adderColor }
}
