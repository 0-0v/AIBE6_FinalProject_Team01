package back.backend.domain.inquiry.service;

import back.backend.domain.auth.service.SmtpEmailClient;
import back.backend.domain.admin.entity.AdminActionLog;
import back.backend.domain.admin.entity.AdminActionType;
import back.backend.domain.admin.repository.AdminActionLogRepository;
import back.backend.domain.inquiry.dto.*;
import back.backend.domain.inquiry.entity.*;
import back.backend.domain.inquiry.exception.InquiryErrorCode;
import back.backend.domain.inquiry.repository.ServiceInquiryRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import back.backend.global.response.PageResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InquiryService {
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofHours(1);
    private static final long RATE_LIMIT = 5;
    private final ServiceInquiryRepository repository;
    private final RedisValueService redisValueService;
    private final SmtpEmailClient emailClient;
    private final Clock clock;
    private final AdminActionLogRepository actionLogRepository;

    public InquiryService(ServiceInquiryRepository repository, RedisValueService redisValueService,
                          SmtpEmailClient emailClient, Clock clock,
                          AdminActionLogRepository actionLogRepository) {
        this.repository = repository;
        this.redisValueService = redisValueService;
        this.emailClient = emailClient;
        this.clock = clock;
        this.actionLogRepository = actionLogRepository;
    }

    @Transactional
    public InquiryResponse create(Long memberId, String clientAddress, InquiryCreateRequest request) {
        String rateKey = RedisKeyFactory.create("inquiry-rate",
                Integer.toUnsignedString(clientAddress.hashCode()));
        if (redisValueService.increment(rateKey, RATE_LIMIT_WINDOW) > RATE_LIMIT) {
            throw new BusinessException(InquiryErrorCode.RATE_LIMITED);
        }
        return InquiryResponse.from(repository.save(ServiceInquiry.create(memberId,
                request.category(), request.email(), request.subject(), request.content())));
    }

    @Transactional(readOnly = true)
    public PageResponse<InquiryResponse> findAll(InquiryStatus status, int page, int size) {
        var pageable = PageRequest.of(page, size);
        var inquiries = status == null
                ? repository.findAllByOrderByCreatedAtDescIdDesc(pageable)
                : repository.findAllByStatusOrderByCreatedAtDescIdDesc(status, pageable);
        return PageResponse.from(inquiries.map(InquiryResponse::from));
    }

    @Transactional
    public InquiryResponse reply(Long adminId, Long inquiryId, InquiryReplyRequest request) {
        ServiceInquiry inquiry = repository.findById(inquiryId)
                .orElseThrow(() -> new BusinessException(InquiryErrorCode.NOT_FOUND));
        if (inquiry.getStatus() == InquiryStatus.ANSWERED) {
            throw new BusinessException(InquiryErrorCode.ALREADY_ANSWERED);
        }
        emailClient.sendInquiryReplyEmail(inquiry.getEmail(), inquiry.getSubject(), request.answer());
        inquiry.answer(adminId, request.answer(), LocalDateTime.now(clock));
        actionLogRepository.save(AdminActionLog.create(adminId, AdminActionType.INQUIRY_REPLIED,
                "SERVICE_INQUIRY", inquiryId, "서비스 문의에 이메일 답변을 발송했습니다."));
        return InquiryResponse.from(inquiry);
    }
}
