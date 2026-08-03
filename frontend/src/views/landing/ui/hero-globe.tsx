'use client'

import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'

const GLOBE_SIZE = 440
const THETA = 0.32
// cobe 내부 상수: 지구본 반지름 0.8 + 마커 기본 elevation 0.05
const MARKER_PROJECTION_RADIUS = 0.85

type GlobeMarker = {
    id: string
    label: string
    location: [number, number]
    size: number
}

// 대륙별로 고른 유명 여행지 10곳
const GLOBE_MARKERS: GlobeMarker[] = [
    // 아시아
    { id: 'seoul', label: '서울', location: [37.5665, 126.978], size: 0.035 },
    { id: 'tokyo', label: '도쿄', location: [35.6762, 139.6503], size: 0.035 },
    { id: 'bangkok', label: '방콕', location: [13.7563, 100.5018], size: 0.035 },
    // 중동
    { id: 'dubai', label: '두바이', location: [25.2048, 55.2708], size: 0.035 },
    // 유럽
    { id: 'paris', label: '파리', location: [48.8566, 2.3522], size: 0.035 },
    { id: 'rome', label: '로마', location: [41.9028, 12.4964], size: 0.035 },
    // 북미
    {
        id: 'newyork',
        label: '뉴욕',
        location: [40.7128, -74.006],
        size: 0.035,
    },
    // 남미
    {
        id: 'riodejaneiro',
        label: '리우데자네이루',
        location: [-22.9068, -43.1729],
        size: 0.035,
    },
    // 아프리카
    { id: 'cairo', label: '카이로', location: [30.0444, 31.2357], size: 0.035 },
    // 오세아니아
    {
        id: 'sydney',
        label: '시드니',
        location: [-33.8688, 151.2093],
        size: 0.035,
    },
]

// cobe 소스의 좌표 변환(U 함수)과 동일 — lat/lng를 구 표면의 단위벡터로 변환
function toUnitVector(lat: number, lng: number): [number, number, number] {
    const latRad = (lat * Math.PI) / 180
    const lngRad = (lng * Math.PI) / 180 - Math.PI
    const cosLat = Math.cos(latRad)
    return [
        -cosLat * Math.cos(lngRad),
        Math.sin(latRad),
        cosLat * Math.sin(lngRad),
    ]
}

// cobe 소스의 화면 투영(O 함수)과 동일 — 정사각형 캔버스, scale=1, offset=[0,0] 기준
function project(
    point: [number, number, number],
    phi: number,
    theta: number,
): { x: number; y: number; visible: boolean } {
    const [x, y, z] = point
    const cosPhi = Math.cos(phi)
    const sinPhi = Math.sin(phi)
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    const c = cosPhi * x + sinPhi * z
    const s = sinPhi * sinTheta * x + cosTheta * y - cosPhi * sinTheta * z
    const front = -sinPhi * cosTheta * x + sinTheta * y + cosPhi * cosTheta * z
    return {
        x: (c + 1) / 2,
        y: (-s + 1) / 2,
        visible: front >= 0 || c * c + s * s >= 0.64,
    }
}

export function HeroGlobe() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const labelRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const phiRef = useRef(0)
    const pointerRef = useRef({ down: false, startX: 0, startPhi: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const globe = createGlobe(canvas, {
            devicePixelRatio: 2,
            width: GLOBE_SIZE * 2,
            height: GLOBE_SIZE * 2,
            phi: 0,
            theta: THETA,
            dark: 0,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [1, 0.97, 0.93],
            markerColor: [1, 0.478, 0.349],
            glowColor: [0.85, 0.8, 1],
            opacity: 0.95,
            markers: GLOBE_MARKERS,
        })

        let animationFrame: number
        const renderFrame = () => {
            if (!pointerRef.current.down) {
                phiRef.current += 0.0035
            }
            globe.update({ phi: phiRef.current })

            for (const marker of GLOBE_MARKERS) {
                const label = labelRefs.current[marker.id]
                if (!label) continue
                const unit = toUnitVector(
                    marker.location[0],
                    marker.location[1],
                )
                const scaled: [number, number, number] = [
                    unit[0] * MARKER_PROJECTION_RADIUS,
                    unit[1] * MARKER_PROJECTION_RADIUS,
                    unit[2] * MARKER_PROJECTION_RADIUS,
                ]
                const projected = project(scaled, phiRef.current, THETA)
                label.style.left = `${projected.x * 100}%`
                label.style.top = `${projected.y * 100}%`
                label.style.opacity = projected.visible ? '1' : '0'
            }

            animationFrame = requestAnimationFrame(renderFrame)
        }
        animationFrame = requestAnimationFrame(renderFrame)

        return () => {
            cancelAnimationFrame(animationFrame)
            globe.destroy()
        }
    }, [])

    return (
        <div
            style={{
                position: 'relative',
                width: 'min(72vw, 440px)',
                aspectRatio: '1',
                filter: 'drop-shadow(0 26px 30px rgba(139,124,255,0.25))',
            }}
        >
            <canvas
                ref={canvasRef}
                aria-label="여행지를 잇는 인터랙티브 지구본"
                role="img"
                onPointerDown={(event) => {
                    pointerRef.current.down = true
                    pointerRef.current.startX = event.clientX
                    pointerRef.current.startPhi = phiRef.current
                    event.currentTarget.style.cursor = 'grabbing'
                }}
                onPointerUp={(event) => {
                    pointerRef.current.down = false
                    event.currentTarget.style.cursor = 'grab'
                }}
                onPointerOut={(event) => {
                    pointerRef.current.down = false
                    event.currentTarget.style.cursor = 'grab'
                }}
                onPointerMove={(event) => {
                    if (!pointerRef.current.down) return
                    const delta = event.clientX - pointerRef.current.startX
                    phiRef.current = pointerRef.current.startPhi + delta / 120
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: 'grab',
                    contain: 'layout paint size',
                }}
            />
            {GLOBE_MARKERS.map((marker) => (
                <div
                    key={marker.id}
                    ref={(el) => {
                        labelRefs.current[marker.id] = el
                    }}
                    style={{
                        position: 'absolute',
                        transform: 'translate(-50%, -150%)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#3A2A28',
                        background: 'rgba(255,255,255,0.92)',
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1.5px solid rgba(58,42,40,0.15)',
                        boxShadow: '0 2px 6px rgba(58,42,40,0.12)',
                        opacity: 0,
                    }}
                >
                    {marker.label}
                </div>
            ))}
        </div>
    )
}
