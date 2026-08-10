import React from 'react'
import { cn } from '@/shared/lib'

type Props = {
    children: React.ReactNode
    /** hex 컬러 (카테고리 등 동적 색상). 지정 시 배경 20% + 전경 100% 적용 */
    color?: string | null
    className?: string
}

/**
 * 인라인 뱃지 컴포넌트.
 * - `color` 미지정: className으로 직접 색상 제어
 * - `color` 지정: 배경은 color+20%, 글자는 color 100%
 *
 * @example
 * // 카테고리 뱃지
 * <Badge color={place.categoryColor}>{place.categoryName}</Badge>
 *
 * // 상태 뱃지 (preset)
 * <Badge className="bg-green-100 text-green-600">확정</Badge>
 * <Badge className="bg-brand/10 text-brand">일정 보드</Badge>
 */
export function Badge({ children, color, className }: Props) {
    return (
        <span
            className={cn(
                'inline-block shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                className,
            )}
            style={color ? { backgroundColor: color + '20', color } : undefined}
        >
            {children}
        </span>
    )
}
