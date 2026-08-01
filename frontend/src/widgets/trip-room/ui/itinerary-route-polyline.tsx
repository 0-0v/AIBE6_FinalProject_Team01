'use client'

import { Polyline } from '@vis.gl/react-google-maps'

export type ItineraryRouteEmphasis = 'normal' | 'focused' | 'dimmed'

type Props = {
    path: Array<{ lat: number; lng: number }>
    color: string
    opacity: number
    strokeWeight: number
    zIndex: number
    emphasis: ItineraryRouteEmphasis
}

const DASH_STYLE: Record<
    ItineraryRouteEmphasis,
    { scale: number; repeat: string }
> = {
    normal: { scale: 3, repeat: '20px' },
    focused: { scale: 4, repeat: '24px' },
    dimmed: { scale: 2, repeat: '30px' },
}

export function ItineraryRoutePolyline({
    path,
    color,
    opacity,
    strokeWeight,
    zIndex,
    emphasis,
}: Props) {
    const dashStyle = DASH_STYLE[emphasis]

    return (
        <Polyline
            path={path}
            strokeColor={color}
            strokeWeight={strokeWeight}
            strokeOpacity={0.001}
            zIndex={zIndex}
            geodesic
            icons={[
                {
                    icon: {
                        path: 'M 0,-1 0,1',
                        strokeOpacity: opacity,
                        strokeColor: color,
                        scale: dashStyle.scale,
                    },
                    offset: '0',
                    repeat: dashStyle.repeat,
                },
            ]}
        />
    )
}
