package back.backend.domain.place.service;

import back.backend.domain.place.repository.TripAccessRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.domain.trip.service.GuestAccessCookieProvider;
import back.backend.domain.trip.service.GuestTripAccessService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TripAccessChecker {

    private final TripAccessRepository tripAccessRepository;
    private final SecurityContextAccessor securityContextAccessor;
    private final GuestTripAccessService guestTripAccessService;
    private final HttpServletRequest request;

    public Long requireView(Long tripId) {
        var principal = securityContextAccessor.getCurrentPrincipal();
        if (principal.isPresent()) {
            Long memberId = principal.get().getMemberId();
            if (tripAccessRepository.canView(tripId, memberId)) {
                return memberId;
            }
        }
        String guestToken = guestToken();
        if (guestToken == null && principal.isEmpty()) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        }
        if (guestTripAccessService.canView(tripId, guestToken)) {
            return null;
        }
        throw new BusinessException(CommonErrorCode.FORBIDDEN);
    }

    public Long requireEdit(Long tripId) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        if (!tripAccessRepository.canEdit(tripId, memberId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
        return memberId;
    }

    private String guestToken() {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (GuestAccessCookieProvider.COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
