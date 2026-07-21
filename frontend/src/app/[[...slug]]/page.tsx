'use client'

import dynamic from 'next/dynamic'
import { GoogleMapsProvider } from '@/app/providers/google-maps-provider'

const SpaApp = dynamic(
    () => import('@/app/_bootstrap/spa-app').then((module) => module.App),
    {
        ssr: false,
    },
)

export default function SpaPage() {
    return (
        <GoogleMapsProvider>
            <SpaApp />
        </GoogleMapsProvider>
    )
}
