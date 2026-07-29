package back.backend.global.security.oauth2;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.security.MemberPrincipal;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

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
        OAuth2UserInfo userInfo = OAuth2UserInfoFactory.of(registrationId, oAuth2User.getAttributes());
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        Member member = memberRepository.findByProviderAndProviderId(provider, userInfo.providerId())
                .map(existing -> {
                    existing.recordLogin();
                    return existing;
                })
                .orElseGet(() -> registerSocialMember(provider, userInfo));

        return new MemberPrincipal(
                member.getId(),
                member.getEmail(),
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                oAuth2User.getAttributes()
        );
    }

    private Member registerSocialMember(AuthProvider provider, OAuth2UserInfo userInfo) {
        String email = userInfo.email().strip().toLowerCase(Locale.ROOT);
        if (memberRepository.existsByEmail(email)) {
            throw emailAlreadyRegistered();
        }
        try {
            return memberRepository.saveAndFlush(Member.create(
                    email,
                    userInfo.nickname(),
                    userInfo.profileImageUrl(),
                    provider,
                    userInfo.providerId()
            ));
        } catch (DataIntegrityViolationException exception) {
            throw emailAlreadyRegistered();
        }
    }

    private OAuth2AuthenticationException emailAlreadyRegistered() {
        return new OAuth2AuthenticationException(
                new OAuth2Error("email_already_registered"),
                "이미 다른 로그인 방식으로 가입된 이메일입니다."
        );
    }
}
