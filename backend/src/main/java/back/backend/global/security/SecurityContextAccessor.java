package back.backend.global.security;

import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityContextAccessor {

    public Long getCurrentMemberId() {
        return getCurrentPrincipal()
                .map(MemberPrincipal::getMemberId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
    }

    public Optional<MemberPrincipal> getCurrentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        if (authentication.getPrincipal() instanceof MemberPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }
}
