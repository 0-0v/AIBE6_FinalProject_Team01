'use client'

import dynamic from 'next/dynamic'
import { GoogleMapsProvider } from '@/components/providers/GoogleMapsProvider'

const LegacyApp = dynamic(() => import('@/App').then((module) => module.App), {
    ssr: false,
})

export default function SpaPage() {
    return (
        <GoogleMapsProvider>
            <LegacyApp />
        </GoogleMapsProvider>
    )
}
