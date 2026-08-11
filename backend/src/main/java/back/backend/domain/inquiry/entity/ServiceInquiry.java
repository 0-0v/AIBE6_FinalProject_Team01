package back.backend.domain.inquiry.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "service_inquiries")
@EntityListeners(AuditingEntityListener.class)
public class ServiceInquiry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "member_id") private Long memberId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private InquiryCategory category;
    @Column(nullable = false) private String email;
    @Column(nullable = false, length = 100) private String subject;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private InquiryStatus status;
    @Column(columnDefinition = "TEXT") private String answer;
    @Column(name = "answered_by") private Long answeredBy;
    @Column(name = "answered_at") private LocalDateTime answeredAt;
    @CreatedDate @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @LastModifiedDate @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ServiceInquiry() {}

    private ServiceInquiry(Long memberId, InquiryCategory category, String email, String subject, String content) {
        this.memberId = memberId;
        this.category = category;
        this.email = email.strip().toLowerCase();
        this.subject = subject.strip();
        this.content = content.strip();
        this.status = InquiryStatus.PENDING;
    }

    public static ServiceInquiry create(Long memberId, InquiryCategory category, String email,
                                        String subject, String content) {
        return new ServiceInquiry(memberId, category, email, subject, content);
    }

    public void answer(Long adminId, String answer, LocalDateTime answeredAt) {
        this.answer = answer.strip();
        this.answeredBy = adminId;
        this.answeredAt = answeredAt;
        this.status = InquiryStatus.ANSWERED;
    }

    public Long getId() { return id; }
    public Long getMemberId() { return memberId; }
    public InquiryCategory getCategory() { return category; }
    public String getEmail() { return email; }
    public String getSubject() { return subject; }
    public String getContent() { return content; }
    public InquiryStatus getStatus() { return status; }
    public String getAnswer() { return answer; }
    public Long getAnsweredBy() { return answeredBy; }
    public LocalDateTime getAnsweredAt() { return answeredAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
