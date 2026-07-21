package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.security.MemberPrincipal;
import java.util.Map;
import java.util.Optional;
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

    @BeforeEach
    void setUp() {
        service = new CustomOAuth2UserService(memberRepository);
    }

    private OAuth2User kakaoOAuth2User() {
        OAuth2User oAuth2User = mock(OAuth2User.class);
        when(oAuth2User.getAttributes()).thenReturn(KAKAO_ATTRIBUTES);
        return oAuth2User;
    }

    @Test
    @DisplayName("t1 카카오가 아닌 제공자면 인증 예외가 발생한다")
    void t1_nonKakaoRegistrationThrowsAuthenticationException() {
        OAuth2User oAuth2User = mock(OAuth2User.class);

        assertThatThrownBy(() -> service.mapToPrincipal("google", oAuth2User))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }

    @Test
    @DisplayName("t2 신규 카카오 회원이면 회원을 새로 등록하고 principal을 반환한다")
    void t2_newKakaoMemberIsRegistered() {
        when(memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "12345")).thenReturn(Optional.empty());
        Member saved = Member.create("user@example.com", "닉네임", "https://example.com/image.png", AuthProvider.KAKAO, "12345");
        ReflectionTestUtils.setField(saved, "id", 10L);
        when(memberRepository.save(org.mockito.ArgumentMatchers.any(Member.class))).thenReturn(saved);

        MemberPrincipal principal = (MemberPrincipal) service.mapToPrincipal("kakao", kakaoOAuth2User());

        assertThat(principal.getMemberId()).isEqualTo(10L);
        assertThat(principal.getUsername()).isEqualTo("user@example.com");
        assertThat(principal.getAttributes()).isEqualTo(KAKAO_ATTRIBUTES);
    }

    @Test
    @DisplayName("t3 기존 카카오 회원이면 로그인 정보를 갱신하고 저장하지 않은 채 principal을 반환한다")
    void t3_existingKakaoMemberRecordsLoginWithoutInsert() {
        Member existing = Member.create("old@example.com", "예전닉네임", null, AuthProvider.KAKAO, "12345");
        ReflectionTestUtils.setField(existing, "id", 20L);
        when(memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "12345")).thenReturn(Optional.of(existing));

        MemberPrincipal principal = (MemberPrincipal) service.mapToPrincipal("kakao", kakaoOAuth2User());

        assertThat(principal.getMemberId()).isEqualTo(20L);
        assertThat(existing.getNickname()).isEqualTo("닉네임");
        assertThat(existing.getLastLoginAt()).isNotNull();
        verify(memberRepository, org.mockito.Mockito.never()).save(org.mockito.ArgumentMatchers.any());
    }
}
