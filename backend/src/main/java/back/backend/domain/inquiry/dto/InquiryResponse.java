package back.backend.domain.inquiry.dto;

import back.backend.domain.inquiry.entity.*;
import java.time.LocalDateTime;

public record InquiryResponse(
        Long id, Long memberId, InquiryCategory category, String email, String subject,
        String content, InquiryStatus status, String answer, Long answeredBy,
        LocalDateTime answeredAt, LocalDateTime createdAt
) {
    public static InquiryResponse from(ServiceInquiry inquiry) {
        return new InquiryResponse(inquiry.getId(), inquiry.getMemberId(), inquiry.getCategory(),
                inquiry.getEmail(), inquiry.getSubject(), inquiry.getContent(), inquiry.getStatus(),
                inquiry.getAnswer(), inquiry.getAnsweredBy(), inquiry.getAnsweredAt(), inquiry.getCreatedAt());
    }
}
