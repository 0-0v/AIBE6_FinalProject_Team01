'use client'

import dynamic from 'next/dynamic'

const SpaApp = dynamic(
    () => import('@/app/_bootstrap/spa-app').then((module) => module.App),
    {
        ssr: false,
    },
)

export default function SpaPage() {
    return <SpaApp />
}
