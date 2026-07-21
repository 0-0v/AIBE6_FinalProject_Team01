'use client'

import type { PropsWithChildren } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'

export function GoogleMapsProvider({ children }: PropsWithChildren) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
        return children
    }

    return (
        <APIProvider apiKey={apiKey} language="ko" region="KR">
            {children}
        </APIProvider>
    )
}
