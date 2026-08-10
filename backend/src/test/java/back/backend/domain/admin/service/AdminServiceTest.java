package back.backend.domain.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.admin.dto.AdminMemberStatusRequest;
import back.backend.domain.admin.entity.AdminActionLog;
import back.backend.domain.admin.exception.AdminErrorCode;
import back.backend.domain.admin.repository.AdminActionLogRepository;
import back.backend.domain.admin.repository.ExternalApiUsageRepository;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 18, 0);
    @Mock MemberRepository memberRepository;
    @Mock TripRepository tripRepository;
    @Mock AdminActionLogRepository actionLogRepository;
    @Mock ExternalApiUsageRepository usageRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    AdminService adminService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW.atZone(ZoneId.of("Asia/Seoul")).toInstant(), ZoneId.of("Asia/Seoul"));
        adminService = new AdminService(memberRepository, tripRepository, actionLogRepository,
                usageRepository, refreshTokenRepository, clock);
    }

    @Test
    @DisplayName("t1 관리자가 일반 회원을 정지하면 세션을 폐기하고 감사 로그를 기록한다")
    void t1_suspendMemberRevokesSessionAndWritesAuditLog() {
        Member member = member(2L);
        when(memberRepository.findById(2L)).thenReturn(Optional.of(member));

        var response = adminService.suspend(1L, 2L,
                new AdminMemberStatusRequest("비정상 자동 호출", NOW.plusDays(1)));

        assertThat(response.status()).isEqualTo(MemberStatus.SUSPENDED);
        verify(refreshTokenRepository).deleteByMemberId(2L);
        ArgumentCaptor<AdminActionLog> captor = ArgumentCaptor.forClass(AdminActionLog.class);
        verify(actionLogRepository).save(captor.capture());
        assertThat(captor.getValue().getReason()).isEqualTo("비정상 자동 호출");
    }

    @Test
    @DisplayName("t2 관리자가 자신의 계정을 정지하려 하면 요청을 거부한다")
    void t2_suspendSelfThrowsBusinessException() {
        assertThatThrownBy(() -> adminService.suspend(1L, 1L,
                new AdminMemberStatusRequest("오류", null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(AdminErrorCode.CANNOT_SUSPEND_SELF);
    }

    @Test
    @DisplayName("t3 정지되지 않은 회원의 정지를 해제하려 하면 요청을 거부한다")
    void t3_releaseActiveMemberThrowsBusinessException() {
        Member member = member(3L);
        when(memberRepository.findById(3L)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> adminService.releaseSuspension(1L, 3L, "오조작 복구"))
                .isInstanceOf(BusinessException.class);
    }

    private Member member(Long id) {
        Member member = Member.create("user" + id + "@example.com", "사용자" + id,
                null, AuthProvider.LOCAL, "user" + id + "@example.com");
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
