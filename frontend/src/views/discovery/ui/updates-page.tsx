import { NotificationList } from '@/features/manage-notification'
import { PageHeader } from './page-header'

export function Updates() {
    return (
        <div className="min-h-full bg-[#f8fafb] px-4 py-6 sm:px-9 sm:py-7">
            <div className="mx-auto max-w-[860px]">
                <PageHeader
                    eyebrow="ACTIVITY"
                    title="알림"
                    description="여행방의 주요 활동과 AI 결과를 확인하세요."
                />
                <NotificationList />
            </div>
        </div>
    )
}
