package back.backend.domain.place.service;

import back.backend.domain.place.repository.TripAccessRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.security.SecurityContextAccessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TripAccessChecker {

    private final TripAccessRepository tripAccessRepository;
    private final SecurityContextAccessor securityContextAccessor;

    public Long requireView(Long tripId) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        if (!tripAccessRepository.canView(tripId, memberId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
        return memberId;
    }

    public Long requireEdit(Long tripId) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        if (!tripAccessRepository.canEdit(tripId, memberId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
        return memberId;
    }
}
