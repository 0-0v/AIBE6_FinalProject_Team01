package back.backend.domain.agent.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class AiReplanCutoffPolicy {

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
