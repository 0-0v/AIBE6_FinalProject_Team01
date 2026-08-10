package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryItem;

import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

final class ItineraryScheduleShiftPolicy {

    private ItineraryScheduleShiftPolicy() {
    }

    static boolean isAutomaticallyLinked(
            ItineraryItem item,
            ItineraryItem nextItem,
            Integer transportMinutes
    ) {
        return item.getEndTime() != null
                && nextItem.getStartTime() != null
                && transportMinutes != null
                && nextItem.getStartTime().equals(
                item.getEndTime().plusMinutes(transportMinutes)
        );
    }

    static void shiftFollowingTimesIfNeeded(
            List<ItineraryItem> followingItems,
            Integer previousTransportMinutes,
            Integer recalculatedTransportMinutes,
            boolean automaticallyLinked
    ) {
        if (!automaticallyLinked
                || previousTransportMinutes == null
                || recalculatedTransportMinutes == null) {
            return;
        }

        long difference =
                (long) recalculatedTransportMinutes - previousTransportMinutes;
        if (difference == 0 || !canShiftWithinDay(followingItems, difference)) {
            return;
        }
        followingItems.forEach(item -> item.shiftTimes(difference));
    }

    private static boolean canShiftWithinDay(
            List<ItineraryItem> items,
            long minutes
    ) {
        long seconds = minutes * 60;
        return items.stream()
                .flatMap(item -> Stream.of(
                        item.getStartTime(),
                        item.getEndTime()
                ))
                .filter(Objects::nonNull)
                .allMatch(time -> {
                    long shifted = time.toSecondOfDay() + seconds;
                    return shifted >= 0 && shifted < 24 * 60 * 60;
                });
    }
}
