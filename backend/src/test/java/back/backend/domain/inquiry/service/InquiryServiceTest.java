package back.backend.domain.inquiry.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.service.SmtpEmailClient;
import back.backend.domain.admin.repository.AdminActionLogRepository;
import back.backend.domain.inquiry.dto.*;
import back.backend.domain.inquiry.entity.*;
import back.backend.domain.inquiry.exception.InquiryErrorCode;
import back.backend.domain.inquiry.repository.ServiceInquiryRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisValueService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InquiryServiceTest {
    @Mock ServiceInquiryRepository repository;
    @Mock RedisValueService redisValueService;
    @Mock SmtpEmailClient emailClient;
    @Mock AdminActionLogRepository actionLogRepository;
    InquiryService service;

    @BeforeEach
    void setUp() {
        service = new InquiryService(repository, redisValueService, emailClient,
                Clock.fixed(Instant.parse("2026-08-11T00:00:00Z"), ZoneId.of("Asia/Seoul")),
                actionLogRepository);
    }

    @Test
    @DisplayName("t1 유효한 문의를 접수하면 대기 상태로 저장한다")
    void t1_createInquirySavesPendingInquiry() {
        when(redisValueService.increment(any(), any())).thenReturn(1L);
        when(repository.save(any(ServiceInquiry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InquiryResponse response = service.create(2L, "127.0.0.1",
                new InquiryCreateRequest(InquiryCategory.USER, "user@example.com", "사용 문의", "문의 내용"));

        assertThat(response.status()).isEqualTo(InquiryStatus.PENDING);
        assertThat(response.memberId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("t2 한 시간에 문의를 5회 초과하면 접수를 거부한다")
    void t2_createInquiryRejectsRateLimitExceeded() {
        when(redisValueService.increment(any(), any())).thenReturn(6L);

        assertThatThrownBy(() -> service.create(null, "127.0.0.1",
                new InquiryCreateRequest(InquiryCategory.BUSINESS, "biz@example.com", "제휴", "문의")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(InquiryErrorCode.RATE_LIMITED);
    }

    @Test
    @DisplayName("t3 관리자가 문의에 답변하면 이메일 발송 후 답변 완료로 변경한다")
    void t3_replySendsEmailAndMarksInquiryAnswered() {
        ServiceInquiry inquiry = ServiceInquiry.create(2L, InquiryCategory.USER,
                "user@example.com", "사용 문의", "문의 내용");
        when(repository.findById(1L)).thenReturn(Optional.of(inquiry));

        InquiryResponse response = service.reply(9L, 1L, new InquiryReplyRequest("답변 내용"));

        verify(emailClient).sendInquiryReplyEmail("user@example.com", "사용 문의", "답변 내용");
        verify(actionLogRepository).save(any());
        assertThat(response.status()).isEqualTo(InquiryStatus.ANSWERED);
        assertThat(response.answeredBy()).isEqualTo(9L);
    }
}
