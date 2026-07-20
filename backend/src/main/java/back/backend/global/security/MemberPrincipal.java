package back.backend.global.security;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public final class MemberPrincipal implements UserDetails {

    private final Long memberId;
    private final String email;
    private final List<GrantedAuthority> authorities;

    public MemberPrincipal(Long memberId, String email, Collection<? extends GrantedAuthority> authorities) {
        this.memberId = Objects.requireNonNull(memberId, "memberId must not be null");
        this.email = Objects.requireNonNull(email, "email must not be null");
        this.authorities = List.copyOf(authorities);
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
}
