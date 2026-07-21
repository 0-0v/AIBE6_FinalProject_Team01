package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

class MemberPrincipalTest {

    @Test
    @DisplayName("t1 속성 없이 생성하면 OAuth2User 속성은 빈 맵을 반환한다")
    void t1_withoutAttributesReturnsEmptyAttributeMap() {
        MemberPrincipal principal = new MemberPrincipal(1L, "user1@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")));

        assertThat(principal.getUsername()).isEqualTo("user1@example.com");
        assertThat(principal.getMemberId()).isEqualTo(1L);
        assertThat(principal.getAttributes()).isEmpty();
    }

    @Test
    @DisplayName("t2 OAuth2 속성과 함께 생성하면 OAuth2User로 사용할 수 있다")
    void t2_withAttributesActsAsOAuth2User() {
        Map<String, Object> attributes = Map.of("id", 12345L);
        MemberPrincipal principal = new MemberPrincipal(
                2L, "user2@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")), attributes);

        OAuth2User oAuth2User = principal;
        assertThat(oAuth2User.getAttributes()).isEqualTo(attributes);
        assertThat(oAuth2User.getName()).isEqualTo("user2@example.com");
    }
}
