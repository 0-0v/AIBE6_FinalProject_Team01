package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.security.MemberPrincipal;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CustomOAuth2UserServiceTest {

    @Mock
    private MemberRepository memberRepository;

    private CustomOAuth2UserService service;

    private static final Map<String, Object> KAKAO_ATTRIBUTES = Map.of(
            "id", 12345L,
            "kakao_account", Map.of(
                    "email", "user@example.com",
                    "profile", Map.of(
                            "nickname", "닉네임",
                            "profile_image_url", "https://example.com/image.png"
                    )
            )
    );

    private static final Map<String, Object> GOOGLE_ATTRIBUTES = Map.of(
            "sub", "67890",
            "email", "user@gmail.com",
            "name", "구글유저"
    );

    @BeforeEach
    void setUp() {
        service = new CustomOAuth2UserService(memberRepository);
    }

    private OAuth2User kakaoOAuth2User() {
        OAuth2User oAuth2User = mock(OAuth2User.class);
        when(oAuth2User.getAttributes()).thenReturn(KAKAO_ATTRIBUTES);
        return oAuth2User;
    }

    private OAuth2User googleOAuth2User() {
        OAuth2User oAuth2User = mock(OAuth2User.class);
        when(oAuth2User.getAttributes()).thenReturn(GOOGLE_ATTRIBUTES);
        return oAuth2User;
    }

    @Test
    @DisplayName("t1 지원하지 않는 제공자면 인증 예외가 발생한다")
    void t1_unsupportedRegistrationThrowsAuthenticationException() {
        OAuth2User oAuth2User = mock(OAuth2User.class);

        assertThatThrownBy(() -> service.mapToPrincipal("facebook", oAuth2User))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }

    @Test
    @DisplayName("t2 신규 카카오 회원이면 회원을 새로 등록하고 principal을 반환한다")
    void t2_newKakaoMemberIsRegistered() {
        when(memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "12345")).thenReturn(Optional.empty());
        Member saved = Member.create("user@example.com", "닉네임", "https://example.com/image.png", AuthProvider.KAKAO, "12345");
        ReflectionTestUtils.setField(saved, "id", 10L);
        when(memberRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(Member.class))).thenReturn(saved);

        MemberPrincipal principal = (MemberPrincipal) service.mapToPrincipal("kakao", kakaoOAuth2User());

        assertThat(principal.getMemberId()).isEqualTo(10L);
        assertThat(principal.getUsername()).isEqualTo("user@example.com");
        assertThat(principal.getAttributes()).isEqualTo(KAKAO_ATTRIBUTES);
    }

    @Test
    @DisplayName("t3 기존 카카오 회원이면 마지막 로그인 시각만 갱신하고 직접 설정한 닉네임은 유지한 채 principal을 반환한다")
    void t3_existingKakaoMemberRecordsLoginWithoutOverwritingNickname() {
        Member existing = Member.create("old@example.com", "예전닉네임", null, AuthProvider.KAKAO, "12345");
        ReflectionTestUtils.setField(existing, "id", 20L);
        when(memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "12345")).thenReturn(Optional.of(existing));

        MemberPrincipal principal = (MemberPrincipal) service.mapToPrincipal("kakao", kakaoOAuth2User());

        assertThat(principal.getMemberId()).isEqualTo(20L);
        assertThat(existing.getNickname()).isEqualTo("예전닉네임");
        assertThat(existing.getLastLoginAt()).isNotNull();
        verify(memberRepository, org.mockito.Mockito.never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("t4 신규 구글 회원이면 회원을 새로 등록하고 principal을 반환한다")
    void t4_newGoogleMemberIsRegistered() {
        when(memberRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "67890")).thenReturn(Optional.empty());
        Member saved = Member.create("user@gmail.com", "구글유저", null, AuthProvider.GOOGLE, "67890");
        ReflectionTestUtils.setField(saved, "id", 30L);
        when(memberRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(Member.class))).thenReturn(saved);

        MemberPrincipal principal = (MemberPrincipal) service.mapToPrincipal("google", googleOAuth2User());

        assertThat(principal.getMemberId()).isEqualTo(30L);
        assertThat(principal.getUsername()).isEqualTo("user@gmail.com");
        assertThat(principal.getAttributes()).isEqualTo(GOOGLE_ATTRIBUTES);
    }

    @Test
    @DisplayName("t5 기존 구글 회원이면 마지막 로그인 시각만 갱신하고 직접 설정한 닉네임은 유지한 채 principal을 반환한다")
    void t5_existingGoogleMemberRecordsLoginWithoutOverwritingNickname() {
        Member existing = Member.create("old@gmail.com", "예전이름", null, AuthProvider.GOOGLE, "67890");
        ReflectionTestUtils.setField(existing, "id", 40L);
        when(memberRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "67890")).thenReturn(Optional.of(existing));

        MemberPrincipal principal = (MemberPrincipal) service.mapToPrincipal("google", googleOAuth2User());

        assertThat(principal.getMemberId()).isEqualTo(40L);
        assertThat(existing.getNickname()).isEqualTo("예전이름");
        assertThat(existing.getLastLoginAt()).isNotNull();
        verify(memberRepository, org.mockito.Mockito.never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("t6 다른 로그인 방식에서 사용 중인 이메일이면 신규 소셜 회원가입을 거부한다")
    void t6_newSocialMemberWithExistingEmailIsRejected() {
        when(memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "12345"))
                .thenReturn(Optional.empty());
        Member existing = Member.create(
                "user@example.com", "기존회원", null, AuthProvider.GOOGLE, "google-existing");
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.mapToPrincipal("kakao", kakaoOAuth2User()))
                .isInstanceOf(OAuth2AuthenticationException.class)
                .hasMessageContaining("이미 다른 로그인 방식으로 가입된 이메일입니다.");

        verify(memberRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("t7 개인정보 보관기간이 남은 탈퇴 소셜 회원이면 재로그인을 거부한다")
    void t7_withdrawnSocialMemberIsRejectedWithSpecificError() {
        Member withdrawn = Member.create(
                "user@gmail.com", "탈퇴회원", null, AuthProvider.GOOGLE, "67890");
        withdrawn.withdraw(
                LocalDateTime.of(2026, 7, 29, 12, 0),
                LocalDateTime.of(2026, 7, 30, 12, 0));
        when(memberRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "67890"))
                .thenReturn(Optional.of(withdrawn));

        assertThatThrownBy(() -> service.mapToPrincipal("google", googleOAuth2User()))
                .isInstanceOf(OAuth2AuthenticationException.class)
                .satisfies(exception -> assertThat(
                        ((OAuth2AuthenticationException) exception).getError().getErrorCode())
                        .isEqualTo("withdrawn_account_retained"));

        assertThat(withdrawn.getStatus()).isEqualTo(MemberStatus.WITHDRAWN);
        assertThat(withdrawn.getLastLoginAt()).isNull();
    }

    @Test
    @DisplayName("t8 다른 소셜 제공자로 가입을 시도해도 동일 이메일의 탈퇴 계정 보관기간이 남으면 거부한다")
    void t8_withdrawnMemberEmailIsRejectedWithSpecificError() {
        Member withdrawn = Member.create(
                "user@example.com", "탈퇴회원", null, AuthProvider.GOOGLE, "google-old");
        withdrawn.withdraw(
                LocalDateTime.of(2026, 7, 29, 12, 0),
                LocalDateTime.of(2026, 7, 30, 12, 0));
        when(memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "12345"))
                .thenReturn(Optional.empty());
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(withdrawn));

        assertThatThrownBy(() -> service.mapToPrincipal("kakao", kakaoOAuth2User()))
                .isInstanceOf(OAuth2AuthenticationException.class)
                .satisfies(exception -> assertThat(
                        ((OAuth2AuthenticationException) exception).getError().getErrorCode())
                        .isEqualTo("withdrawn_account_retained"));

        verify(memberRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }
}
