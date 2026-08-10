/// <reference types="google.maps" />
'use client'

import { useEffect, useRef } from 'react'
import { Polyline } from '@vis.gl/react-google-maps'

export type ItineraryRouteEmphasis = 'normal' | 'focused' | 'dimmed'

type Props = {
    path: Array<{ lat: number; lng: number }>
    color: string
    opacity: number
    strokeWeight: number
    zIndex: number
    emphasis: ItineraryRouteEmphasis
    animated?: boolean
    /** false면 점선 없이 완전히 숨긴다(예: 날짜 선택 중 현재 흐르는 구간 외 나머지). */
    visible?: boolean
}

// 전체 일정 보기에서만 쓰는 점선이라 크지 않게, 촘촘하게 잡는다.
const DASH_STYLE: Record<
    ItineraryRouteEmphasis,
    { scale: number; repeat: string }
> = {
    normal: { scale: 2, repeat: '14px' },
    focused: { scale: 2.6, repeat: '16px' },
    dimmed: { scale: 1.3, repeat: '18px' },
}

// 작은 화살표를 촘촘히 이어 붙여 "연결된" 흐름처럼 보이게 한다.
const ARROW_STYLE: Record<
    ItineraryRouteEmphasis,
    { scale: number; repeat: string }
> = {
    normal: { scale: 1.8, repeat: '16px' },
    focused: { scale: 2.1, repeat: '18px' },
    dimmed: { scale: 1.4, repeat: '20px' },
}

const FLOW_SPEED_PX_PER_MS = 0.018

function buildDashIcons(
    color: string,
    opacity: number,
    dashStyle: { scale: number; repeat: string },
) {
    return [
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
    ]
}

export function ItineraryRoutePolyline({
    path,
    color,
    opacity,
    strokeWeight,
    zIndex,
    emphasis,
    animated = false,
    visible = true,
}: Props) {
    const dashStyle = DASH_STYLE[emphasis]
    const arrowStyle = ARROW_STYLE[emphasis]
    const repeatPx = Number.parseFloat(arrowStyle.repeat)
    const polylineRef = useRef<google.maps.Polyline | null>(null)

    // 강조된 동선에서만 작은 화살표들이 이어져 진행 방향으로 흐른다.
    useEffect(() => {
        if (!animated) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return
        }

        let offset = 0
        let lastTimestamp: number | null = null
        let animationFrame: number

        const tick = (timestamp: number) => {
            if (lastTimestamp == null) lastTimestamp = timestamp
            offset =
                (offset + (timestamp - lastTimestamp) * FLOW_SPEED_PX_PER_MS) %
                repeatPx
            lastTimestamp = timestamp
            // 마운트 직후엔 Polyline 인스턴스가 아직 ref에 안 잡혔을 수 있어 매 프레임 새로 읽는다.
            polylineRef.current?.set('icons', [
                {
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        strokeColor: color,
                        strokeOpacity: opacity,
                        strokeWeight: 1,
                        fillColor: color,
                        fillOpacity: opacity,
                        scale: arrowStyle.scale,
                    },
                    offset: `${offset}px`,
                    repeat: arrowStyle.repeat,
                },
            ])
            animationFrame = window.requestAnimationFrame(tick)
        }

        animationFrame = window.requestAnimationFrame(tick)
        return () => {
            window.cancelAnimationFrame(animationFrame)
            // 애니메이션이 꺼지면 화살표가 멈춘 채로 남지 않도록 원래 점선으로 되돌린다.
            // eslint-disable-next-line react-hooks/exhaustive-deps -- 최신 인스턴스로 되돌리는 게 의도된 동작
            polylineRef.current?.set(
                'icons',
                buildDashIcons(color, opacity, dashStyle),
            )
        }
    }, [
        animated,
        arrowStyle.repeat,
        arrowStyle.scale,
        color,
        dashStyle,
        opacity,
        repeatPx,
    ])

    return (
        <Polyline
            ref={polylineRef}
            path={path}
            strokeColor={color}
            strokeWeight={strokeWeight}
            strokeOpacity={0.001}
            zIndex={zIndex}
            geodesic
            icons={visible ? buildDashIcons(color, opacity, dashStyle) : []}
        />
    )
}
