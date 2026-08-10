import { CategoryIcon } from '@/entities/trip'

type Props = {
    color: string
    label?: string | number
    categoryIcon?: string | null
    categoryColor?: string | null
    categoryLabel?: string | null
    showCategoryBadge?: boolean
    selected?: boolean
    hovered?: boolean
    preview?: boolean
    focused?: boolean
    outlined?: boolean
    simplified?: boolean
    anchor?: boolean
}

export function ItineraryMapMarker({
    color,
    label,
    categoryIcon,
    categoryColor,
    categoryLabel,
    showCategoryBadge = true,
    selected = false,
    hovered = false,
    preview = false,
    focused = false,
    outlined = false,
    simplified = false,
    anchor = false,
}: Props) {
    const emphasized = selected || hovered

    if (simplified && !emphasized && !focused) {
        return (
            <div
                className="size-2.5 rounded-full border-2 border-white shadow-[0_2px_6px_rgb(var(--rgb-app-ink)/0.35)] transition-transform duration-150 ease-out"
                style={{ backgroundColor: color }}
                title={categoryLabel ?? undefined}
                aria-hidden
            />
        )
    }

    const sizeClass = selected
        ? 'size-10'
        : emphasized
          ? 'size-9'
          : focused
            ? 'size-9'
            : anchor
              ? 'size-9'
              : 'size-8'
    const hasOrderLabel = label != null

    return (
        <div
            className={`relative flex flex-col items-center transition-transform duration-150 ease-out ${
                emphasized ? 'scale-110' : ''
            }`}
        >
            <div
                className={`${sizeClass} relative flex items-center justify-center rounded-full border-[3px] transition-all ${
                    outlined
                        ? 'border-dashed bg-white shadow-sm'
                        : 'border-white shadow-[0_5px_12px_rgb(var(--rgb-app-ink)/0.24)]'
                } ${
                    selected
                        ? 'ring-4 ring-white/70'
                        : focused
                          ? 'ring-[3px] ring-white/80 shadow-[0_6px_16px_rgb(var(--rgb-app-ink)/0.32)]'
                          : ''
                } ${selected ? 'itinerary-marker-bounce' : ''} ${
                    preview ? 'animate-pulse' : ''
                }`}
                style={
                    outlined
                        ? { borderColor: color }
                        : { backgroundColor: color }
                }
            >
                {selected && (
                    <span
                        className="itinerary-marker-pulse pointer-events-none absolute -inset-1 z-0 rounded-full border-2"
                        style={{ borderColor: color }}
                        aria-hidden
                    />
                )}
                {focused && !selected && (
                    <span
                        className="pointer-events-none absolute -inset-1 z-0 rounded-full border-2 opacity-60"
                        style={{ borderColor: color }}
                        aria-hidden
                    />
                )}
                {!outlined && (
                    <span
                        className="absolute -bottom-1.5 left-1/2 z-0 size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-b-[3px] border-r-[3px] border-white"
                        style={{ backgroundColor: color }}
                        aria-hidden
                    />
                )}
                <span className="relative z-10 flex items-center justify-center font-extrabold text-white">
                    {!hasOrderLabel && categoryIcon ? (
                        <CategoryIcon
                            icon={categoryIcon}
                            size={selected ? 18 : 15}
                            strokeWidth={2.5}
                        />
                    ) : (
                        <span
                            className={`${selected ? 'text-sm' : 'text-xs'} ${outlined ? 'text-slate-400' : 'text-white'}`}
                        >
                            {label ?? '·'}
                        </span>
                    )}
                </span>
                {hasOrderLabel && categoryIcon && showCategoryBadge && (
                    <span
                        className={`absolute -right-2 -top-2 z-20 flex items-center justify-center rounded-full border-2 border-white bg-white shadow-sm ${
                            selected ? 'size-6' : 'size-5'
                        }`}
                        style={{ color: categoryColor ?? color }}
                        title={categoryLabel ?? undefined}
                        aria-hidden
                    >
                        <CategoryIcon
                            icon={categoryIcon}
                            size={selected ? 13 : 11}
                            strokeWidth={2.75}
                        />
                    </span>
                )}
            </div>
        </div>
    )
}
