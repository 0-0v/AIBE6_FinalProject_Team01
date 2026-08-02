type AiBrandMarkProps = {
    size?: 'sm' | 'md'
}

export function AiBrandMark({ size = 'md' }: AiBrandMarkProps) {
    const sizeClass = size === 'sm' ? 'h-10 w-10' : 'h-14 w-14'
    const imageClass = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'

    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-white via-rose-50 to-pink-100 shadow-[0_10px_25px_rgba(225,91,116,0.18)] ${sizeClass}`}
        >
            <span className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-brand/15 blur-md" />
            <img
                src="/favicon.png"
                alt=""
                aria-hidden="true"
                className={`relative object-contain drop-shadow-sm ${imageClass}`}
            />
        </span>
    )
}
