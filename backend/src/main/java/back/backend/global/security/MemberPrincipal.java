package back.backend.global.security;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

public final class MemberPrincipal implements UserDetails, OAuth2User {

    private final Long memberId;
    private final String email;
    private final List<GrantedAuthority> authorities;
    private final Map<String, Object> attributes;

    public MemberPrincipal(Long memberId, String email, Collection<? extends GrantedAuthority> authorities) {
        this(memberId, email, authorities, Map.of());
    }

    public MemberPrincipal(
            Long memberId,
            String email,
            Collection<? extends GrantedAuthority> authorities,
            Map<String, Object> attributes
    ) {
        this.memberId = Objects.requireNonNull(memberId, "memberId must not be null");
        this.email = Objects.requireNonNull(email, "email must not be null");
        this.authorities = List.copyOf(authorities);
        this.attributes = Map.copyOf(attributes);
    }

    public Long getMemberId() {
        return memberId;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public String getName() {
        return email;
    }
}
