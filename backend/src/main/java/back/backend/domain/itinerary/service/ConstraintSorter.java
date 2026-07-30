package back.backend.domain.itinerary.service;

import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.TripPlace;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 하루 장소 목록을 제약 조건에 따라 재정렬한다.
 *
 * 정렬 우선순위:
 * 1. 오전에 방문 가능한 FOOD/CAFE (식사 슬롯 - 아침/점심)
 * 2. 일반 장소 (ATTRACTION, NATURE, SHOPPING, ACTIVITY 등)
 * 3. 야간 장소 (BAR 또는 영업 시작이 18:00 이후인 장소)
 *
 * BAR 카테고리는 opening_hours_json 유무에 무관하게 항상 야간 그룹에 배치된다.
 */
@Component
@RequiredArgsConstructor
public class ConstraintSorter {

    private static final LocalTime NIGHTLIFE_THRESHOLD = LocalTime.of(18, 0);

    private final OpeningHoursParser openingHoursParser;

    /**
     * @param places  하루에 배정된 장소 목록 (클러스터링 결과)
     * @param date    방문 날짜 (요일 계산용)
     * @return 제약 조건에 따라 재정렬된 장소 목록
     */
    public List<TripPlace> sort(List<TripPlace> places, LocalDate date) {
        if (places.isEmpty()) return List.of();

        DayOfWeek dayOfWeek = date.getDayOfWeek();

        List<TripPlace> mealGroup    = new ArrayList<>(); // FOOD/CAFE
        List<TripPlace> generalGroup = new ArrayList<>(); // 일반 장소
        List<TripPlace> nightGroup   = new ArrayList<>(); // BAR/야간

        for (TripPlace place : places) {
            PlaceCategoryType type = place.getCategory().getCategoryType();

            if (type == PlaceCategoryType.BAR) {
                nightGroup.add(place);
                continue;
            }

            Optional<LocalTime[]> hours = openingHoursParser.parse(
                    place.getPlace().getOpeningHoursJson(), dayOfWeek);

            if (hours.isPresent() && hours.get()[0].isAfter(NIGHTLIFE_THRESHOLD)) {
                // 영업 시작이 18시 이후 → 야간 그룹
                nightGroup.add(place);
            } else if (type == PlaceCategoryType.FOOD || type == PlaceCategoryType.CAFE) {
                mealGroup.add(place);
            } else {
                generalGroup.add(place);
            }
        }

        List<TripPlace> result = new ArrayList<>();
        result.addAll(mealGroup);
        result.addAll(generalGroup);
        result.addAll(nightGroup);
        return result;
    }
}
