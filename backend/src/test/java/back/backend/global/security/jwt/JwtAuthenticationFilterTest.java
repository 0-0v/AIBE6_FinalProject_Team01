package back.backend.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.security.MemberPrincipal;
import jakarta.servlet.FilterChain;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    private static final String SECRET = "test-only-secret-key-that-is-at-least-32-bytes";

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private FilterChain filterChain;

    private JwtProvider jwtProvider;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(SECRET);
        properties.setAccessTokenExpirationMs(60_000);
        properties.setRefreshTokenExpirationMs(1_209_600_000);
        jwtProvider = new JwtProvider(properties);
        filter = new JwtAuthenticationFilter(jwtProvider, memberRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Member activeMember(Long id) {
        Member member = Member.create("user" + id + "@example.com", "닉네임" + id, null, AuthProvider.GOOGLE, "google-" + id);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    @Test
    @DisplayName("t1 Authorization 헤더가 없으면 인증 정보를 설정하지 않고 다음 필터로 진행한다")
    void t1_noAuthorizationHeaderSkipsAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("t2 유효한 액세스 토큰과 활성 회원이면 SecurityContext에 인증 정보를 설정한다")
    void t2_validAccessTokenAndActiveMemberSetsAuthentication() throws Exception {
        Member member = activeMember(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        String token = jwtProvider.createAccessToken(1L, member.getEmail());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isInstanceOf(MemberPrincipal.class);
        assertThat(((MemberPrincipal) authentication.getPrincipal()).getMemberId()).isEqualTo(1L);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("t3 유효하지 않은 토큰이면 인증 정보를 설정하지 않는다")
    void t3_invalidTokenSkipsAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer not-a-jwt");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("t4 리프레시 토큰으로는 인증 정보를 설정하지 않는다")
    void t4_refreshTokenSkipsAuthentication() throws Exception {
        String token = jwtProvider.createRefreshToken(2L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("t5 탈퇴한 회원의 토큰이면 인증 정보를 설정하지 않는다")
    void t5_withdrawnMemberTokenSkipsAuthentication() throws Exception {
        Member member = activeMember(3L);
        ReflectionTestUtils.setField(member, "status", MemberStatus.WITHDRAWN);
        when(memberRepository.findById(3L)).thenReturn(Optional.of(member));
        String token = jwtProvider.createAccessToken(3L, member.getEmail());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("t6 토큰의 회원이 존재하지 않으면 인증 정보를 설정하지 않는다")
    void t6_memberNotFoundSkipsAuthentication() throws Exception {
        when(memberRepository.findById(4L)).thenReturn(Optional.empty());
        String token = jwtProvider.createAccessToken(4L, "user4@example.com");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("t7 Bearer 접두사가 없는 Authorization 헤더는 인증 정보를 설정하지 않는다")
    void t7_nonBearerAuthorizationHeaderSkipsAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("t8 관리자 회원의 토큰이면 관리자와 사용자 권한을 모두 설정한다")
    void t8_adminMemberTokenSetsAdminAndUserAuthorities() throws Exception {
        Member member = activeMember(5L);
        member.promoteToAdmin();
        when(memberRepository.findById(5L)).thenReturn(Optional.of(member));
        String token = jwtProvider.createAccessToken(5L, member.getEmail());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting("authority")
                .containsExactlyInAnyOrder("ROLE_USER", "ROLE_ADMIN");
    }

    @Test
    @DisplayName("t9 정지 회원의 토큰이면 인증 정보를 설정하지 않는다")
    void t9_suspendedMemberTokenSkipsAuthentication() throws Exception {
        Member member = activeMember(6L);
        ReflectionTestUtils.setField(member, "status", MemberStatus.SUSPENDED);
        when(memberRepository.findById(6L)).thenReturn(Optional.of(member));
        String token = jwtProvider.createAccessToken(6L, member.getEmail());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
