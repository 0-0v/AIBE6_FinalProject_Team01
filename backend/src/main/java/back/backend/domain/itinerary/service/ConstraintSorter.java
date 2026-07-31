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
 * 하루 장소 목록을 현실적인 여행 동선으로 재정렬한다.
 *
 * 정렬 전략:
 * 1. 장소를 3개 그룹으로 분류 — mealGroup(FOOD/CAFE), generalGroup(관광·쇼핑 등), nightGroup(BAR/야간)
 * 2. generalGroup 내 같은 카테고리가 연속되지 않도록 분산 (안 2)
 * 3. 식사를 점심·저녁 슬롯에 끼워 넣어 관광 사이에 배치 (안 1)
 *    - 점심 슬롯: generalGroup의 1/3 지점 이후
 *    - 저녁 슬롯: generalGroup의 2/3 지점 이후
 *    - 초과 식사(3개+): 저녁 슬롯 이후 추가
 * 4. nightGroup은 항상 마지막
 *
 * BAR 카테고리는 opening_hours_json 유무에 무관하게 항상 nightGroup에 배치된다.
 */
@Component
@RequiredArgsConstructor
public class ConstraintSorter {

    private static final LocalTime NIGHTLIFE_THRESHOLD = LocalTime.of(18, 0);

    private final OpeningHoursParser openingHoursParser;

    /**
     * @param places 하루에 배정된 장소 목록 (클러스터링 결과)
     * @param date   방문 날짜 (요일 계산용), null 이면 정렬 없이 원본 반환
     * @return 현실적인 여행 동선으로 재정렬된 장소 목록
     */
    public List<TripPlace> sort(List<TripPlace> places, LocalDate date) {
        if (places.isEmpty()) return List.of();
        if (date == null) return new ArrayList<>(places);

        DayOfWeek dayOfWeek = date.getDayOfWeek();

        List<TripPlace> mealGroup    = new ArrayList<>();
        List<TripPlace> generalGroup = new ArrayList<>();
        List<TripPlace> nightGroup   = new ArrayList<>();

        for (TripPlace place : places) {
            PlaceCategoryType type = place.getCategory().getCategoryType();

            if (type == PlaceCategoryType.BAR) {
                nightGroup.add(place);
                continue;
            }

            Optional<LocalTime[]> hours = openingHoursParser.parse(
                    place.getPlace().getOpeningHoursJson(), dayOfWeek);

            if (hours.isPresent() && !hours.get()[0].isBefore(NIGHTLIFE_THRESHOLD)) {
                nightGroup.add(place);
            } else if (type == PlaceCategoryType.FOOD || type == PlaceCategoryType.CAFE) {
                mealGroup.add(place);
            } else {
                generalGroup.add(place);
            }
        }

        // 안 2: generalGroup 내 같은 카테고리 연속 방지
        List<TripPlace> spreadGeneral = spreadSameCategory(generalGroup);

        // 안 1: 식사를 점심·저녁 슬롯에 인터리빙
        return interleaveWithMeals(spreadGeneral, mealGroup, nightGroup);
    }

    /**
     * 식사(mealGroup)를 일반 장소(general) 사이 점심·저녁 위치에 끼워 넣는다.
     *
     * - 점심(1st meal): general의 1/3 지점 뒤
     * - 저녁(2nd meal): general의 2/3 지점 뒤
     * - 초과 식사(3개+): general 끝 이후 추가
     * - general이 없으면 점심 → 저녁 → 초과 순으로만 나열
     */
    private List<TripPlace> interleaveWithMeals(
            List<TripPlace> general,
            List<TripPlace> meals,
            List<TripPlace> night
    ) {
        TripPlace lunch  = meals.size() > 0 ? meals.get(0) : null;
        TripPlace dinner = meals.size() > 1 ? meals.get(1) : null;
        List<TripPlace> extraMeals = meals.size() > 2
                ? meals.subList(2, meals.size())
                : List.of();

        List<TripPlace> result = new ArrayList<>();

        if (general.isEmpty()) {
            if (lunch  != null) result.add(lunch);
            if (dinner != null) result.add(dinner);
            result.addAll(extraMeals);
        } else {
            int size = general.size();
            // 점심은 최소 관광 1곳 이후(lunchPos >= 1)
            int lunchPos  = Math.max(1, size / 3);
            // 저녁은 점심 이후 최소 1칸, 최대 general 끝
            int dinnerPos = Math.min(size, Math.max(lunchPos + 1, size * 2 / 3));

            result.addAll(general.subList(0, lunchPos));
            if (lunch  != null) result.add(lunch);
            result.addAll(general.subList(lunchPos, dinnerPos));
            if (dinner != null) result.add(dinner);
            result.addAll(general.subList(dinnerPos, size));
            result.addAll(extraMeals);
        }

        result.addAll(night);
        return result;
    }

    /**
     * 같은 카테고리가 인접하면 뒤에서 다른 카테고리 장소를 당겨와 끼운다.
     * 지리적 순서를 최대한 보존하면서 연속 동일 카테고리만 교환한다.
     */
    private List<TripPlace> spreadSameCategory(List<TripPlace> places) {
        if (places.size() <= 1) return new ArrayList<>(places);

        List<TripPlace> result = new ArrayList<>(places);
        for (int i = 0; i < result.size() - 1; i++) {
            PlaceCategoryType cur  = result.get(i).getCategory().getCategoryType();
            PlaceCategoryType next = result.get(i + 1).getCategory().getCategoryType();
            if (cur == next) {
                for (int j = i + 2; j < result.size(); j++) {
                    if (result.get(j).getCategory().getCategoryType() != cur) {
                        TripPlace tmp = result.get(i + 1);
                        result.set(i + 1, result.get(j));
                        result.set(j, tmp);
                        break;
                    }
                }
            }
        }
        return result;
    }
}
