package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class SecurityContextAccessorTest {

    private final SecurityContextAccessor accessor = new SecurityContextAccessor();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("t1 인증된 MemberPrincipal이 있으면 현재 회원 ID를 반환한다")
    void t1_authenticatedPrincipalReturnsCurrentMemberId() {
        MemberPrincipal principal = new MemberPrincipal(10L, "member@example.com", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));

        assertThat(accessor.getCurrentMemberId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("t2 인증 정보가 없으면 현재 회원 조회 시 UNAUTHORIZED 예외가 발생한다")
    void t2_anonymousMemberThrowsUnauthorizedException() {
        assertThatThrownBy(accessor::getCurrentMemberId)
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.UNAUTHORIZED);
    }
}
