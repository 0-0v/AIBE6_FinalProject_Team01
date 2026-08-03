package back.backend.global.security.oauth2;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

@ExtendWith(MockitoExtension.class)
class SocialOAuthAccountConnectorTest {

    @Mock
    private OAuth2TokenRepository tokenRepository;

    @Test
    @DisplayName("t1 Google 회원 연결 해제 시 OAuth 리프레시 토큰을 폐기하고 저장 토큰을 삭제한다")
    void t1_unlinkGoogleRevokesRefreshTokenAndDeletesStoredToken() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OAuth2TokenProperties properties = new OAuth2TokenProperties();
        SocialOAuthAccountConnector connector =
                new SocialOAuthAccountConnector(builder, tokenRepository, properties);
        Member member = socialMember(21L, AuthProvider.GOOGLE, "google-21");
        when(tokenRepository.find(21L, AuthProvider.GOOGLE))
                .thenReturn(Optional.of(new OAuth2ProviderToken(
                        "google-access",
                        "google-refresh",
                        Instant.parse("2026-07-31T01:00:00Z"))));
        server.expect(requestTo("https://oauth2.googleapis.com/revoke"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string("token=google-refresh"))
                .andRespond(withSuccess());

        connector.unlink(member);

        server.verify();
        verify(tokenRepository).delete(21L, AuthProvider.GOOGLE);
    }

    @Test
    @DisplayName("t2 Kakao 회원 연결 해제 시 Admin Key와 제공자 회원 식별자를 사용한다")
    void t2_unlinkKakaoUsesAdminKeyAndProviderId() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OAuth2TokenProperties properties = new OAuth2TokenProperties();
        properties.setKakaoAdminKey("kakao-admin-key");
        SocialOAuthAccountConnector connector =
                new SocialOAuthAccountConnector(builder, tokenRepository, properties);
        Member member = socialMember(22L, AuthProvider.KAKAO, "123456789");
        server.expect(requestTo("https://kapi.kakao.com/v1/user/unlink"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "KakaoAK kakao-admin-key"))
                .andExpect(content().string("target_id_type=user_id&target_id=123456789"))
                .andRespond(withSuccess());

        connector.unlink(member);

        server.verify();
        verify(tokenRepository).delete(22L, AuthProvider.KAKAO);
    }

    private Member socialMember(Long id, AuthProvider provider, String providerId) {
        Member member = Member.create(
                provider.name().toLowerCase() + "@example.com",
                "소셜회원",
                null,
                provider,
                providerId);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
