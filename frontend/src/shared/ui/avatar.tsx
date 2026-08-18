import { UserIcon } from 'lucide-react'
import { DESIGN_COLORS } from '@/shared/config'

export const DEFAULT_AVATAR_COLOR = DESIGN_COLORS.app.avatar

type Props = {
    name: string
    color: string
    size?: number
    className?: string
    imageUrl?: string | null
}

export function Avatar({
    name,
    color,
    size = 32,
    className = '',
    imageUrl,
}: Props) {
    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-slate-500 ${className}`}
            style={{
                backgroundColor: color,
                width: size,
                height: size,
            }}
            aria-label={`${name}의 프로필`}
        >
            <UserIcon
                size={size * 0.5}
                color="var(--color-app-avatar-icon)"
                aria-hidden="true"
            />
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={`${name}의 프로필 이미지`}
                    onError={(event) => {
                        event.currentTarget.style.display = 'none'
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
        </span>
    )
}
