type Props = {
    name: string
    color: string
    size?: number
    className?: string
    imageUrl?: string | null
}

export function Avatar({ name, color, size = 32, className = '', imageUrl }: Props) {
    const initial = name.trim().charAt(0).toUpperCase()

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={`${name}의 프로필 이미지`}
                className={`inline-block shrink-0 rounded-full object-cover ${className}`}
                style={{ width: size, height: size }}
            />
        )
    }

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${className}`}
            style={{
                backgroundColor: color,
                width: size,
                height: size,
                fontSize: size * 0.42,
            }}
            aria-hidden="true"
        >
            {initial}
        </span>
    )
}
