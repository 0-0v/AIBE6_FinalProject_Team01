type BrandLogoProps = {
    className?: string
    alt?: string
}

export function BrandLogo({
    className = 'h-full w-full',
    alt = 'Plamingo',
}: BrandLogoProps) {
    return (
        <img
            src="/plamingo-badge.svg"
            alt={alt}
            className={`object-contain ${className}`}
        />
    )
}
