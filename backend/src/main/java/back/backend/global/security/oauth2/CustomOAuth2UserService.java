package back.backend.global.security.oauth2;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.security.MemberPrincipal;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final String KAKAO_REGISTRATION_ID = "kakao";

    private final MemberRepository memberRepository;

    public CustomOAuth2UserService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        return mapToPrincipal(userRequest.getClientRegistration().getRegistrationId(), oAuth2User);
    }

    OAuth2User mapToPrincipal(String registrationId, OAuth2User oAuth2User) {
        if (!KAKAO_REGISTRATION_ID.equals(registrationId)) {
            throw new OAuth2AuthenticationException("지원하지 않는 로그인 제공자입니다: " + registrationId);
        }

        KakaoOAuth2UserInfo userInfo = KakaoOAuth2UserInfo.from(oAuth2User.getAttributes());
        Member member = memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, userInfo.providerId())
                .map(existing -> {
                    existing.recordLogin(userInfo.nickname(), userInfo.profileImageUrl());
                    return existing;
                })
                .orElseGet(() -> memberRepository.save(Member.create(
                        userInfo.email(),
                        userInfo.nickname(),
                        userInfo.profileImageUrl(),
                        AuthProvider.KAKAO,
                        userInfo.providerId()
                )));

        return new MemberPrincipal(
                member.getId(),
                member.getEmail(),
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                oAuth2User.getAttributes()
        );
    }
}
