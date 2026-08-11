import { apiClient, type ApiResponse } from '@/shared/api/client'

export type InquiryCategory = 'BUSINESS' | 'USER'

export function submitInquiry(input: {
    category: InquiryCategory
    email: string
    subject: string
    content: string
}) {
    return apiClient.postPublic<ApiResponse<unknown>>('/api/inquiries', input)
}
