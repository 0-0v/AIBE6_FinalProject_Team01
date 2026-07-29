import { CategoryIcon } from '@/entities/trip'

type Props = {
    color: string
    label?: string | number
    categoryIcon?: string | null
    selected?: boolean
    hovered?: boolean
    preview?: boolean
}

export function ItineraryMapMarker({
    color,
    label,
    categoryIcon,
    selected = false,
    hovered = false,
    preview = false,
}: Props) {
    const emphasized = selected || hovered
    const sizeClass = selected ? 'size-10' : emphasized ? 'size-9' : 'size-8'

    return (
        <div
            className={`relative flex flex-col items-center transition-transform ${
                emphasized ? 'scale-110' : ''
            }`}
        >
            <div
                className={`${sizeClass} relative flex items-center justify-center rounded-full border-[3px] border-white shadow-[0_5px_12px_rgba(15,23,42,0.24)] transition-all ${
                    selected ? 'ring-4 ring-white/70' : ''
                } ${selected ? 'itinerary-marker-bounce' : ''} ${
                    preview ? 'animate-pulse' : ''
                }`}
                style={{ backgroundColor: color }}
            >
                <span
                    className="absolute -bottom-1.5 left-1/2 z-0 size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-b-[3px] border-r-[3px] border-white"
                    style={{ backgroundColor: color }}
                    aria-hidden
                />
                <span className="relative z-10 flex items-center justify-center font-extrabold text-white">
                    {categoryIcon ? (
                        <CategoryIcon
                            icon={categoryIcon}
                            size={selected ? 18 : 15}
                            strokeWidth={2.5}
                        />
                    ) : (
                        <span className={selected ? 'text-sm' : 'text-xs'}>
                            {label ?? '·'}
                        </span>
                    )}
                </span>
            </div>
        </div>
    )
}
