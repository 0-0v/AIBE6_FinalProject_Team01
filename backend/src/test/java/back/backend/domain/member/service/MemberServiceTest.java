package back.backend.domain.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.config.MemberWithdrawalProperties;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.port.ProfileImageStorage;
import back.backend.domain.member.port.SocialAccountConnector;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;
import java.time.Clock;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private ProfileImageStorage profileImageStorage;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private SocialAccountConnector socialAccountConnector;

    private MemberService memberService;
    private MemberWithdrawalProperties withdrawalProperties;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 29, 12, 0);

    @BeforeEach
    void setUp() {
        withdrawalProperties = new MemberWithdrawalProperties();
        withdrawalProperties.setRetentionDays(90);
        memberService = new MemberService(
                memberRepository,
                profileImageStorage,
                refreshTokenRepository,
                socialAccountConnector,
                withdrawalProperties,
                Clock.fixed(NOW.atZone(ZoneId.of("Asia/Seoul")).toInstant(), ZoneId.of("Asia/Seoul")));
    }

    @Test
    @DisplayName("t1 존재하는 회원 식별자로 조회하면 회원 정보를 반환한다")
    void t1_getMemberReturnsMemberResponseWhenMemberExists() {
        Member member = Member.create("user@example.com", "닉네임", "https://example.com/image.png", AuthProvider.KAKAO, "kakao-1");
        ReflectionTestUtils.setField(member, "id", 1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));

        MemberResponse response = memberService.getMember(1L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.nickname()).isEqualTo("닉네임");
        assertThat(response.profileImageUrl()).isEqualTo("https://example.com/image.png");
        assertThat(response.provider()).isEqualTo(AuthProvider.KAKAO);
    }

    @Test
    @DisplayName("t2 존재하지 않는 회원 식별자로 조회하면 예외가 발생한다")
    void t2_getMemberThrowsWhenMemberNotFound() {
        when(memberRepository.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> memberService.getMember(2L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t3 닉네임을 변경하면 변경된 닉네임을 담은 회원 정보를 반환한다")
    void t3_updateNicknameReturnsUpdatedMemberResponse() {
        Member member = Member.create("user3@example.com", "기존닉네임", null, AuthProvider.KAKAO, "kakao-3");
        ReflectionTestUtils.setField(member, "id", 3L);
        when(memberRepository.findById(3L)).thenReturn(Optional.of(member));

        MemberResponse response = memberService.updateNickname(3L, "새닉네임");

        assertThat(response.nickname()).isEqualTo("새닉네임");
    }

    @Test
    @DisplayName("t4 존재하지 않는 회원의 닉네임을 변경하면 예외가 발생한다")
    void t4_updateNicknameThrowsWhenMemberNotFound() {
        when(memberRepository.findById(4L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> memberService.updateNickname(4L, "닉네임"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t5 프로필 이미지를 등록하면 저장된 이미지 URL을 담은 회원 정보를 반환한다")
    void t5_updateProfileImageReturnsUpdatedMemberResponse() {
        Member member = Member.create("user5@example.com", "닉네임5", null, AuthProvider.KAKAO, "kakao-5");
        ReflectionTestUtils.setField(member, "id", 5L);
        MockMultipartFile file =
                new MockMultipartFile("file", "profile.png", "image/png", "image-content".getBytes());
        when(memberRepository.findById(5L)).thenReturn(Optional.of(member));
        when(profileImageStorage.store(5L, file)).thenReturn("/uploads/profile-images/5-uuid.png");

        MemberResponse response = memberService.updateProfileImage(5L, file);

        assertThat(response.profileImageUrl()).isEqualTo("/uploads/profile-images/5-uuid.png");
    }

    @Test
    @DisplayName("t6 존재하지 않는 회원의 프로필 이미지를 등록하면 예외가 발생한다")
    void t6_updateProfileImageThrowsWhenMemberNotFound() {
        MockMultipartFile file =
                new MockMultipartFile("file", "profile.png", "image/png", "image-content".getBytes());
        when(memberRepository.findById(6L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> memberService.updateProfileImage(6L, file))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t7 회원 탈퇴 시 작성 데이터는 유지하고 회원 상태 변경과 세션 폐기를 수행한다")
    void t7_withdrawMemberChangesStatusAndRevokesSession() {
        Member member = Member.create(
                "withdraw@example.com", "탈퇴전닉네임", null, AuthProvider.LOCAL, "withdraw@example.com");
        ReflectionTestUtils.setField(member, "id", 7L);
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));

        memberService.withdraw(7L);

        assertThat(member.getStatus()).isEqualTo(back.backend.domain.member.entity.MemberStatus.WITHDRAWN);
        assertThat(member.getPersonalInfoExpiresAt()).isEqualTo(NOW.plusDays(90));
        assertThat(member.getEmail()).isEqualTo("withdraw@example.com");
        verify(refreshTokenRepository).deleteByMemberId(7L);
        verify(memberRepository, org.mockito.Mockito.never()).delete(member);
        verify(socialAccountConnector, org.mockito.Mockito.never()).unlink(member);
    }

    @Test
    @DisplayName("t8 개인정보 보관 만료 회원을 파기하면 작성 데이터는 유지하고 식별정보와 프로필 파일만 제거한다")
    void t8_purgeExpiredPersonalInfoAnonymizesMemberAndDeletesProfileFile() {
        Member member = Member.create(
                "expired@example.com", "기존닉네임", "/uploads/profile-images/8.png",
                AuthProvider.GOOGLE, "google-8");
        ReflectionTestUtils.setField(member, "id", 8L);
        LocalDateTime now = LocalDateTime.of(2027, 7, 29, 12, 0);
        member.withdraw(now.minusYears(1), now);
        when(memberRepository
                .findAllByStatusAndPersonalInfoExpiresAtLessThanEqualAndPersonalInfoDeletedAtIsNull(
                        back.backend.domain.member.entity.MemberStatus.WITHDRAWN, now))
                .thenReturn(List.of(member));

        int purgedCount = memberService.purgeExpiredPersonalInfo(now);

        assertThat(purgedCount).isEqualTo(1);
        assertThat(member.getEmail()).isEqualTo("withdrawn-8@deleted.invalid");
        verify(profileImageStorage).delete("/uploads/profile-images/8.png");
        verify(memberRepository, org.mockito.Mockito.never()).delete(member);
    }

    @Test
    @DisplayName("t9 보관기간이 0일이면 탈퇴 즉시 개인정보를 익명화하여 동일 이메일 재가입을 허용한다")
    void t9_withdrawImmediatelyAnonymizesPersonalInfoWhenRetentionIsZero() {
        withdrawalProperties.setRetentionDays(0);
        Member member = Member.create(
                "local@example.com", "로컬회원", "/uploads/profile-images/9.png",
                AuthProvider.LOCAL, "local@example.com");
        ReflectionTestUtils.setField(member, "id", 9L);
        when(memberRepository.findById(9L)).thenReturn(Optional.of(member));

        memberService.withdraw(9L);

        assertThat(member.getEmail()).isEqualTo("withdrawn-9@deleted.invalid");
        assertThat(member.getProviderId()).isEqualTo("withdrawn-9");
        assertThat(member.getPersonalInfoDeletedAt()).isEqualTo(NOW);
        verify(profileImageStorage).delete("/uploads/profile-images/9.png");
    }

    @Test
    @DisplayName("t10 소셜 회원 탈퇴 시 제공자 연결을 해제한 뒤 회원 상태와 세션을 정리한다")
    void t10_withdrawSocialMemberUnlinksProviderBeforeWithdrawal() {
        Member member = Member.create(
                "social@example.com", "소셜회원", null, AuthProvider.GOOGLE, "google-10");
        ReflectionTestUtils.setField(member, "id", 10L);
        when(memberRepository.findById(10L)).thenReturn(Optional.of(member));

        memberService.withdraw(10L);

        var inOrder = org.mockito.Mockito.inOrder(socialAccountConnector, refreshTokenRepository);
        inOrder.verify(socialAccountConnector).unlink(member);
        inOrder.verify(refreshTokenRepository).deleteByMemberId(10L);
        assertThat(member.getStatus()).isEqualTo(back.backend.domain.member.entity.MemberStatus.WITHDRAWN);
    }

    @Test
    @DisplayName("t11 소셜 제공자 연결 해제에 실패하면 회원 상태와 서비스 세션을 변경하지 않는다")
    void t11_withdrawSocialMemberDoesNotWithdrawWhenUnlinkFails() {
        Member member = Member.create(
                "social-fail@example.com", "소셜회원", null, AuthProvider.KAKAO, "kakao-11");
        ReflectionTestUtils.setField(member, "id", 11L);
        when(memberRepository.findById(11L)).thenReturn(Optional.of(member));
        org.mockito.Mockito.doThrow(new IllegalStateException("unlink failed"))
                .when(socialAccountConnector).unlink(member);

        assertThatThrownBy(() -> memberService.withdraw(11L))
                .isInstanceOf(IllegalStateException.class);

        assertThat(member.getStatus()).isEqualTo(back.backend.domain.member.entity.MemberStatus.ACTIVE);
        verify(refreshTokenRepository, org.mockito.Mockito.never()).deleteByMemberId(11L);
    }
}
