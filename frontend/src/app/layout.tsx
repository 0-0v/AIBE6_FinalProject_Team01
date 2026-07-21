import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { GlobalModal } from '@/shared/ui'
import './globals.css'

export const metadata: Metadata = {
    title: 'Plamingo',
    description: '함께 만드는 AI 공동 여행지도',
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
