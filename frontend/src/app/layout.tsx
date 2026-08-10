import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { GlobalModal } from '@/shared/ui'
import './globals.css'

export const metadata: Metadata = {
    title: 'Plamingo',
    description: '함께 만드는 AI 공동 여행지도',
    icons: {
        icon: '/plamingo-badge.svg',
        shortcut: '/plamingo-badge.svg',
        apple: '/plamingo-badge.svg',
    },
}

export default function RootLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="ko">
            <body>
                {children}
                <GlobalModal />
            </body>
        </html>
    )
}
