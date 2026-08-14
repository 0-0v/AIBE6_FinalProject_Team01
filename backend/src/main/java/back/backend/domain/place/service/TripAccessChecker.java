package back.backend.domain.place.service;

import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
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

    private final TripMemberRepository tripMemberRepository;
    private final TripRepository tripRepository;
    private final SecurityContextAccessor securityContextAccessor;
    private final GuestTripAccessService guestTripAccessService;
    private final HttpServletRequest request;

    public Long requireView(Long tripId) {
        var principal = securityContextAccessor.getCurrentPrincipal();
        if (principal.isPresent()) {
            Long memberId = principal.get().getMemberId();
            if (tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
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
        Long memberId = requireRecordEdit(tripId);
        TripStatus status = tripRepository.findById(tripId)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND))
                .getStatus();
        if (status == TripStatus.COMPLETED || status == TripStatus.CANCELLED) {
            throw new BusinessException(TripErrorCode.TRIP_ALREADY_FINISHED);
        }
        return memberId;
    }

    public Long requireRecordEdit(Long tripId) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
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
