package back.backend.domain.agent.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class AiReplanCutoffPolicy {

    public boolean isTripInProgress(
            LocalDate startDate,
            LocalDate endDate,
            LocalDate today
    ) {
        return startDate != null
                && endDate != null
                && !today.isBefore(startDate)
                && !today.isAfter(endDate);
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

    public Set<Long> movableItemIdsFrom(
            List<ItineraryDay> days,
            LocalDateTime now,
            Long startingItemId
    ) {
        List<ItineraryItem> remainingItems = days.stream()
                .sorted(Comparator.comparing(ItineraryDay::getItineraryDate))
                .flatMap(day -> day.getItems().stream()
                        .sorted(Comparator.comparingInt(ItineraryItem::getSortOrder))
                        .filter(item -> !isFixed(day, item, now)))
                .toList();
        int startingIndex = -1;
        for (int index = 0; index < remainingItems.size(); index++) {
            if (Objects.equals(remainingItems.get(index).getId(), startingItemId)) {
                startingIndex = index;
                break;
            }
        }
        if (startingIndex < 0) return Set.of();
        return remainingItems.subList(startingIndex, remainingItems.size())
                .stream()
                .map(ItineraryItem::getId)
                .collect(Collectors.toSet());
    }

    public Optional<LocalDate> startingDayDate(
            List<ItineraryDay> days,
            Long startingItemId
    ) {
        return days.stream()
                .filter(day -> day.getItems().stream()
                        .anyMatch(item -> Objects.equals(
                                item.getId(),
                                startingItemId
                        )))
                .map(ItineraryDay::getItineraryDate)
                .findFirst();
    }

    public List<ItineraryDay> replannableDaysFrom(
            List<ItineraryDay> days,
            LocalDate startingDayDate
    ) {
        return days.stream()
                .filter(day -> !day.getItineraryDate().isBefore(startingDayDate))
                .sorted(Comparator.comparing(ItineraryDay::getItineraryDate))
                .toList();
    }
}
