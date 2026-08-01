package back.backend.domain.agent.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class AiReplanCutoffPolicy {

    public LocalDateTime resolveReferenceTime(
            LocalDateTime requested,
            boolean testOverrideAllowed,
            LocalDateTime systemNow
    ) {
        if (requested == null) return systemNow;
        if (!testOverrideAllowed) {
            throw new BusinessException(CommonErrorCode.CONFLICT);
        }
        return requested;
    }

    public boolean isFixed(
            ItineraryDay day,
            ItineraryItem item,
            LocalDateTime now
    ) {
        if (day.getItineraryDate().isBefore(now.toLocalDate())) {
            return true;
        }
        if (day.getItineraryDate().isAfter(now.toLocalDate())) {
            return false;
        }
        LocalTime cutoff = item.getEndTime() != null
                ? item.getEndTime()
                : item.getStartTime();
        return cutoff != null && !cutoff.isAfter(now.toLocalTime());
    }
}
