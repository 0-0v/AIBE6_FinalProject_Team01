package back.backend.domain.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Objects;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "external_api_usages")
@EntityListeners(AuditingEntityListener.class)
public class ExternalApiUsage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id")
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ExternalApiProvider provider;

    @Column(nullable = false, length = 80)
    private String operation;

    @Column(nullable = false)
    private boolean success;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "output_tokens")
    private Integer outputTokens;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ExternalApiUsage() {}

    private ExternalApiUsage(Long memberId, ExternalApiProvider provider, String operation,
                             boolean success, Integer inputTokens, Integer outputTokens) {
        this.memberId = memberId;
        this.provider = Objects.requireNonNull(provider);
        this.operation = Objects.requireNonNull(operation);
        this.success = success;
        this.inputTokens = inputTokens;
        this.outputTokens = outputTokens;
    }

    public static ExternalApiUsage create(Long memberId, ExternalApiProvider provider,
                                          String operation, boolean success,
                                          Integer inputTokens, Integer outputTokens) {
        return new ExternalApiUsage(memberId, provider, operation, success, inputTokens, outputTokens);
    }

    public Long getId() { return id; }
    public Long getMemberId() { return memberId; }
    public ExternalApiProvider getProvider() { return provider; }
    public String getOperation() { return operation; }
    public boolean isSuccess() { return success; }
    public Integer getInputTokens() { return inputTokens; }
    public Integer getOutputTokens() { return outputTokens; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
