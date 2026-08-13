package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryItem;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

final class ItineraryScheduleShiftPolicy {

    private static final int TRANSFER_BUFFER_MINUTES = 10;
    private static final int TIME_SLOT_MINUTES = 5;

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

    static void alignAppliedPlanTimes(List<ItineraryItem> items) {
        List<ItineraryItem> ordered = items.stream()
                .sorted(Comparator.comparingInt(ItineraryItem::getSortOrder))
                .toList();
        for (int index = 1; index < ordered.size(); index++) {
            ItineraryItem previous = ordered.get(index - 1);
            ItineraryItem current = ordered.get(index);
            if (previous.getEndTime() == null
                    || previous.getTransportMinutes() == null
                    || current.getStartTime() == null
                    || current.getEndTime() == null) {
                continue;
            }

            int stayMinutes = (int) java.time.Duration.between(
                    current.getStartTime(),
                    current.getEndTime()
            ).toMinutes();
            int arrivalMinutes = previous.getEndTime().getHour() * 60
                    + previous.getEndTime().getMinute()
                    + previous.getTransportMinutes()
                    + TRANSFER_BUFFER_MINUTES;
            int alignedStartMinutes = roundUp(arrivalMinutes, TIME_SLOT_MINUTES);
            int alignedEndMinutes = alignedStartMinutes + stayMinutes;
            if (stayMinutes < 0 || alignedEndMinutes >= 24 * 60) {
                clearScheduleFrom(ordered, index);
                continue;
            }
            current.updateSchedule(
                    java.time.LocalTime.of(
                            alignedStartMinutes / 60,
                            alignedStartMinutes % 60
                    ),
                    java.time.LocalTime.of(
                            alignedEndMinutes / 60,
                            alignedEndMinutes % 60
                    )
            );
        }
    }

    private static int roundUp(int value, int unit) {
        return ((value + unit - 1) / unit) * unit;
    }

    private static void clearScheduleFrom(
            List<ItineraryItem> items,
            int startIndex
    ) {
        items.subList(startIndex, items.size())
                .forEach(item -> item.updateSchedule(null, null));
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
