package back.backend.domain.admin.service;

import back.backend.domain.admin.dto.*;
import back.backend.domain.admin.entity.AdminActionLog;
import back.backend.domain.admin.entity.AdminActionType;
import back.backend.domain.admin.exception.AdminErrorCode;
import back.backend.domain.admin.repository.AdminActionLogRepository;
import back.backend.domain.admin.repository.ExternalApiUsageRepository;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberRole;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.response.PageResponse;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AdminService {
    private final MemberRepository memberRepository;
    private final TripRepository tripRepository;
    private final AdminActionLogRepository actionLogRepository;
    private final ExternalApiUsageRepository usageRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final Clock clock;

    public AdminService(MemberRepository memberRepository, TripRepository tripRepository,
                        AdminActionLogRepository actionLogRepository,
                        ExternalApiUsageRepository usageRepository,
                        RefreshTokenRepository refreshTokenRepository, Clock clock) {
        this.memberRepository = memberRepository;
        this.tripRepository = tripRepository;
        this.actionLogRepository = actionLogRepository;
        this.usageRepository = usageRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse dashboard() {
        return new AdminDashboardResponse(memberRepository.count(),
                memberRepository.countByStatus(MemberStatus.ACTIVE),
                memberRepository.countByStatus(MemberStatus.SUSPENDED), tripRepository.count(),
                usageRepository.countByCreatedAtGreaterThanEqual(LocalDate.now(clock).atStartOfDay()));
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminMemberSummaryResponse> members(String query, MemberStatus status,
                                                             int page, int size) {
        Specification<Member> spec = (root, criteriaQuery, builder) -> builder.conjunction();
        if (StringUtils.hasText(query)) {
            String pattern = "%" + query.strip().toLowerCase() + "%";
            spec = spec.and((root, cq, builder) -> builder.or(
                    builder.like(builder.lower(root.get("email")), pattern),
                    builder.like(builder.lower(root.get("nickname")), pattern)));
        }
        if (status != null) {
            spec = spec.and((root, cq, builder) -> builder.equal(root.get("status"), status));
        }
        return PageResponse.from(memberRepository.findAll(spec,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(AdminMemberSummaryResponse::from));
    }

    @Transactional(readOnly = true)
    public AdminMemberSummaryResponse member(Long memberId) {
        return AdminMemberSummaryResponse.from(requireMember(memberId));
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminTripSummaryResponse> memberTrips(Long memberId, int page, int size) {
        requireMember(memberId);
        return PageResponse.from(tripRepository.findAllByParticipantMemberId(memberId,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(AdminTripSummaryResponse::from));
    }

    @Transactional
    public AdminMemberSummaryResponse suspend(Long adminId, Long memberId,
                                               AdminMemberStatusRequest request) {
        Member member = requireMutableMember(adminId, memberId);
        LocalDateTime now = LocalDateTime.now(clock);
        member.suspend(adminId, request.reason(), now, request.suspendedUntil());
        refreshTokenRepository.deleteByMemberId(memberId);
        actionLogRepository.save(AdminActionLog.create(adminId, AdminActionType.MEMBER_SUSPENDED,
                "MEMBER", memberId, request.reason()));
        return AdminMemberSummaryResponse.from(member);
    }

    @Transactional
    public AdminMemberSummaryResponse releaseSuspension(Long adminId, Long memberId, String reason) {
        Member member = requireMember(memberId);
        if (member.getStatus() != MemberStatus.SUSPENDED) {
            throw new BusinessException(AdminErrorCode.MEMBER_NOT_SUSPENDED);
        }
        member.releaseSuspension();
        actionLogRepository.save(AdminActionLog.create(adminId,
                AdminActionType.MEMBER_SUSPENSION_RELEASED, "MEMBER", memberId, reason));
        return AdminMemberSummaryResponse.from(member);
    }

    @Transactional(readOnly = true)
    public PageResponse<ExternalApiUsageResponse> memberApiUsages(Long memberId, int page, int size) {
        requireMember(memberId);
        return PageResponse.from(usageRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(
                memberId, PageRequest.of(page, size)).map(ExternalApiUsageResponse::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminActionLogResponse> actionLogs(int page, int size) {
        return PageResponse.from(actionLogRepository.findAllByOrderByCreatedAtDescIdDesc(
                PageRequest.of(page, size)).map(AdminActionLogResponse::from));
    }

    private Member requireMutableMember(Long adminId, Long memberId) {
        if (adminId.equals(memberId)) throw new BusinessException(AdminErrorCode.CANNOT_SUSPEND_SELF);
        Member member = requireMember(memberId);
        if (member.getRole() == MemberRole.ADMIN) throw new BusinessException(AdminErrorCode.CANNOT_SUSPEND_ADMIN);
        if (member.getStatus() == MemberStatus.WITHDRAWN) throw new BusinessException(AdminErrorCode.WITHDRAWN_MEMBER);
        return member;
    }

    private Member requireMember(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(AdminErrorCode.MEMBER_NOT_FOUND));
    }
}
