package back.backend.domain.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.admin.dto.AdminMemberStatusRequest;
import back.backend.domain.admin.entity.AdminActionLog;
import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.entity.ExternalApiUsage;
import back.backend.domain.admin.exception.AdminErrorCode;
import back.backend.domain.admin.repository.AdminActionLogRepository;
import back.backend.domain.admin.repository.ExternalApiUsageRepository;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.entity.MemberRole;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

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

    @Test
    @DisplayName("t4 최고 관리자가 일반 회원을 지정하면 부관리자 권한과 감사 로그를 부여한다")
    void t4_grantSubAdminPromotesMemberAndWritesAuditLog() {
        Member member = member(4L);
        when(memberRepository.findById(4L)).thenReturn(Optional.of(member));

        var response = adminService.grantSubAdmin(1L, 4L);

        assertThat(response.role()).isEqualTo(MemberRole.SUB_ADMIN);
        verify(refreshTokenRepository).deleteByMemberId(4L);
        verify(actionLogRepository).save(org.mockito.ArgumentMatchers.argThat(log ->
                log.getActionType() == back.backend.domain.admin.entity.AdminActionType.SUB_ADMIN_GRANTED));
    }

    @Test
    @DisplayName("t5 최고 관리자가 부관리자 권한을 회수하면 일반 회원으로 변경하고 세션을 폐기한다")
    void t5_revokeSubAdminDemotesMemberAndRevokesSession() {
        Member member = member(5L);
        member.promoteToSubAdmin();
        when(memberRepository.findById(5L)).thenReturn(Optional.of(member));

        var response = adminService.revokeSubAdmin(1L, 5L);

        assertThat(response.role()).isEqualTo(MemberRole.USER);
        verify(refreshTokenRepository).deleteByMemberId(5L);
    }

    @Test
    @DisplayName("t6 전체 외부 API 사용 이력을 조회하면 날짜 제한 없이 최신순 페이지를 반환한다")
    void t6_externalApiUsagesReturnsAllDatesInDescendingPages() {
        when(usageRepository.findAllByOrderByCreatedAtDescIdDesc(org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(Page.empty());
        when(memberRepository.findAllById(List.of())).thenReturn(List.of());

        var response = adminService.externalApiUsages(1, 20);

        assertThat(response.content()).isEmpty();
        verify(usageRepository).findAllByOrderByCreatedAtDescIdDesc(
                org.mockito.ArgumentMatchers.argThat(pageable -> pageable.getPageNumber() == 1
                        && pageable.getPageSize() == 20));
    }

    @Test
    @DisplayName("t7 외부 API 사용 이력에 회원이 연결되어 있으면 회원 번호 대신 식별 가능한 닉네임을 반환한다")
    void t7_externalApiUsagesIncludesMemberNickname() {
        Member member = member(2L);
        ExternalApiUsage usage = ExternalApiUsage.create(
                2L, ExternalApiProvider.GOOGLE_PLACES, "SEARCH", true, null, null);
        when(usageRepository.findAllByOrderByCreatedAtDescIdDesc(org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(usage)));
        when(memberRepository.findAllById(List.of(2L))).thenReturn(List.of(member));

        var response = adminService.externalApiUsages(0, 10);

        assertThat(response.content()).singleElement()
                .extracting("memberNickname")
                .isEqualTo(member.getNickname());
    }

    private Member member(Long id) {
        Member member = Member.create("user" + id + "@example.com", "사용자" + id,
                null, AuthProvider.LOCAL, "user" + id + "@example.com");
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
