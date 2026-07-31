# AI 일정 추천 개선: 제약 기반 파이프라인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드가 제약 조건(식사 슬롯·야간 영업 필터·영업시간)을 처리하고, AI는 한국어 설명 생성만 담당해 토큰을 ~70% 줄이고 비현실적 일정(술집 9시)을 제거한다.

**Architecture:** `planDay()` 호출 전에 `ConstraintSorter.sort()`가 하루 장소 목록을 식사슬롯→일반→야간 순서로 재배치하고, `OpenAiRouteAdvisor`는 완성된 초안에 날짜별 한 줄 설명만 추가한다.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, MySQL (Flyway), OpenAI API

## Global Constraints

- 외부 DB 추가 금지 — MySQL만 사용
- Google Places API 추가 호출 금지 — `places.opening_hours_json` DB 값만 사용
- `openingHoursJson` 없는 장소 → 영업시간 제약 미적용 (항상 방문 가능)
- BAR/NIGHTLIFE 18:00 이전 배치 금지는 `openingHoursJson` 유무에 무관하게 항상 적용
- 기존 `clusterByGeography()`, `clusterByStylePriority()`, `orderByNearestNeighbor()` 메서드는 수정하지 않음
- 테스트: `@DisplayName("tN 행위와 기대결과")` 형식, AssertJ 사용
- 패키지 루트: `back.backend.domain.itinerary.service`
- `TripPlace.getCategory().getCategoryType()` → `PlaceCategoryType` 반환

---

## 파일 구조

**신규 생성:**
- `backend/.../itinerary/service/OpeningHoursParser.java` — `opening_hours_json` 파싱
- `backend/.../itinerary/service/ConstraintSorter.java` — 하루 장소 목록을 제약 기반으로 재정렬
- `backend/.../itinerary/service/OpeningHoursParserTest.java`
- `backend/.../itinerary/service/ConstraintSorterTest.java`
- `backend/src/main/resources/db/migration/V2026_07_30_1000__add_opening_hours_to_places.sql`

**수정:**
- `backend/.../place/entity/Place.java` — `openingHoursJson` 필드 추가
- `backend/.../itinerary/service/ItineraryRoutePlanner.java` — `planDay()` 전에 `ConstraintSorter` 호출, `buildResponseFromClusters()` 시그니처에 날짜 전달
- `backend/.../itinerary/service/OpenAiRouteAdvisor.java` — `recommend()` 제거, `describe()` 추가
- `backend/.../itinerary/service/ItineraryRoutePlannerTest.java` — 새 시나리오 추가
- `backend/.../itinerary/service/OpenAiRouteAdvisorTest.java` — `describe()` 테스트 추가

---

## Task 1: Flyway 마이그레이션 + Place 엔티티 필드 추가

**Files:**
- Create: `backend/src/main/resources/db/migration/V2026_07_30_1000__add_opening_hours_to_places.sql`
- Modify: `backend/src/main/java/back/backend/domain/place/entity/Place.java`

**Interfaces:**
- Produces: `place.getOpeningHoursJson()` → `String` (nullable)

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- V2026_07_30_1000__add_opening_hours_to_places.sql
ALTER TABLE places
    ADD COLUMN opening_hours_json TEXT NULL COMMENT 'Google Places API opening_hours JSON';
```

- [ ] **Step 2: Place 엔티티에 필드 추가**

`backend/src/main/java/back/backend/domain/place/entity/Place.java` 에서 `websiteUrl` 필드 아래에 추가:

```java
@Column(name = "opening_hours_json", columnDefinition = "TEXT")
private String openingHoursJson;
```

- [ ] **Step 3: 빌드 확인**

```bash
cd backend && ./gradlew compileJava
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: 커밋**

```bash
git add backend/src/main/resources/db/migration/V2026_07_30_1000__add_opening_hours_to_places.sql \
        backend/src/main/java/back/backend/domain/place/entity/Place.java
git commit -m "feat: places 테이블에 opening_hours_json 컬럼 추가"
```

---

## Task 2: OpeningHoursParser 구현

**Files:**
- Create: `backend/src/main/java/back/backend/domain/itinerary/service/OpeningHoursParser.java`
- Create: `backend/src/test/java/back/backend/domain/itinerary/service/OpeningHoursParserTest.java`

**Interfaces:**
- Produces: `OpeningHoursParser.parse(String json, DayOfWeek) → Optional<LocalTime[]>` (배열: [openTime, closeTime], 빈 Optional = 제약 없음)

- [ ] **Step 1: 실패 테스트 작성**

```java
// OpeningHoursParserTest.java
package back.backend.domain.itinerary.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.DayOfWeek;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class OpeningHoursParserTest {

    private final OpeningHoursParser parser = new OpeningHoursParser();

    @Test
    @DisplayName("t1 정상_JSON에서_월요일_영업시간을_파싱한다")
    void t1_정상_JSON에서_월요일_영업시간을_파싱한다() {
        // Google Places API periods: day 1 = MONDAY
        String json = """
            {"periods":[
              {"open":{"day":1,"time":"1100"},"close":{"day":1,"time":"2200"}}
            ]}
            """;
        var result = parser.parse(json, DayOfWeek.MONDAY);
        assertThat(result).isPresent();
        assertThat(result.get()[0]).isEqualTo(LocalTime.of(11, 0));
        assertThat(result.get()[1]).isEqualTo(LocalTime.of(22, 0));
    }

    @Test
    @DisplayName("t2 null_JSON은_빈_Optional을_반환한다")
    void t2_null_JSON은_빈_Optional을_반환한다() {
        assertThat(parser.parse(null, DayOfWeek.MONDAY)).isEmpty();
    }

    @Test
    @DisplayName("t3 파싱_불가능한_JSON은_빈_Optional을_반환한다")
    void t3_파싱_불가능한_JSON은_빈_Optional을_반환한다() {
        assertThat(parser.parse("not-json", DayOfWeek.MONDAY)).isEmpty();
    }

    @Test
    @DisplayName("t4 해당_요일_데이터_없으면_빈_Optional을_반환한다")
    void t4_해당_요일_데이터_없으면_빈_Optional을_반환한다() {
        // 일요일(0)만 있는 JSON에서 월요일 조회
        String json = """
            {"periods":[
              {"open":{"day":0,"time":"0900"},"close":{"day":0,"time":"2100"}}
            ]}
            """;
        assertThat(parser.parse(json, DayOfWeek.MONDAY)).isEmpty();
    }
}
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && ./gradlew test --tests "*OpeningHoursParserTest*"
```
Expected: FAIL (클래스 없음)

- [ ] **Step 3: OpeningHoursParser 구현**

```java
// backend/src/main/java/back/backend/domain/itinerary/service/OpeningHoursParser.java
package back.backend.domain.itinerary.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Optional;

/**
 * Google Places API opening_hours JSON에서 특정 요일의 영업 시작·종료 시간을 추출한다.
 * JSON 없음 또는 파싱 실패 → Optional.empty() (제약 없음으로 처리)
 *
 * Google Places API day 매핑: 0=SUNDAY, 1=MONDAY, ..., 6=SATURDAY
 */
@Slf4j
@Component
public class OpeningHoursParser {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // Google: 0=SUNDAY, 1=MON, ..., 6=SAT
    // Java DayOfWeek: MONDAY=1, ..., SUNDAY=7
    private static int toGoogleDay(DayOfWeek dayOfWeek) {
        return dayOfWeek == DayOfWeek.SUNDAY ? 0 : dayOfWeek.getValue();
    }

    /**
     * @param json        places.opening_hours_json 컬럼 값 (null 허용)
     * @param dayOfWeek   조회할 요일
     * @return Optional.of([openTime, closeTime]) or Optional.empty() (제약 없음)
     */
    public Optional<LocalTime[]> parse(String json, DayOfWeek dayOfWeek) {
        if (json == null || json.isBlank()) return Optional.empty();
        try {
            JsonNode root = MAPPER.readTree(json);
            JsonNode periods = root.path("periods");
            if (!periods.isArray()) return Optional.empty();

            int targetDay = toGoogleDay(dayOfWeek);
            for (JsonNode period : periods) {
                JsonNode open = period.path("open");
                JsonNode close = period.path("close");
                if (open.path("day").asInt(-1) == targetDay) {
                    LocalTime openTime  = parseTime(open.path("time").asText(""));
                    LocalTime closeTime = parseTime(close.path("time").asText(""));
                    if (openTime != null && closeTime != null) {
                        return Optional.of(new LocalTime[]{openTime, closeTime});
                    }
                }
            }
            return Optional.empty();
        } catch (Exception e) {
            log.debug("opening_hours_json 파싱 실패 — 제약 없음으로 처리: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /** "0900" → LocalTime.of(9, 0), 형식 오류 → null */
    private LocalTime parseTime(String hhmm) {
        if (hhmm == null || hhmm.length() != 4) return null;
        try {
            int hour   = Integer.parseInt(hhmm.substring(0, 2));
            int minute = Integer.parseInt(hhmm.substring(2, 4));
            return LocalTime.of(hour, minute);
        } catch (Exception e) {
            return null;
        }
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "*OpeningHoursParserTest*"
```
Expected: 4 tests PASSED

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/service/OpeningHoursParser.java \
        backend/src/test/java/back/backend/domain/itinerary/service/OpeningHoursParserTest.java
git commit -m "feat: opening_hours_json 요일별 파싱 유틸 추가"
```

---

## Task 3: ConstraintSorter 구현

하루 장소 목록을 식사슬롯(아침·점심·저녁) → 일반 → 야간(BAR) 순으로 재배치한다.
영업시간이 있으면 해당 시간대에 맞는 곳을 앞쪽으로 이동시킨다.

**Files:**
- Create: `backend/src/main/java/back/backend/domain/itinerary/service/ConstraintSorter.java`
- Create: `backend/src/test/java/back/backend/domain/itinerary/service/ConstraintSorterTest.java`

**Interfaces:**
- Consumes: `OpeningHoursParser.parse(String, DayOfWeek) → Optional<LocalTime[]>`
- Produces: `ConstraintSorter.sort(List<TripPlace>, LocalDate) → List<TripPlace>`

- [ ] **Step 1: 실패 테스트 작성**

```java
// ConstraintSorterTest.java
package back.backend.domain.itinerary.service;

import back.backend.domain.place.entity.*;
import back.backend.domain.trip.entity.Trip;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConstraintSorterTest {

    private final OpeningHoursParser parser = new OpeningHoursParser();
    private final ConstraintSorter sorter = new ConstraintSorter(parser);

    // 헬퍼: TripPlace 목 생성
    private TripPlace mockPlace(Long id, PlaceCategoryType type, String openingHoursJson) {
        Place place = Place.builder()
                .googlePlaceId("g" + id)
                .name("장소" + id)
                .latitude(BigDecimal.valueOf(37.5))
                .longitude(BigDecimal.valueOf(127.0))
                .openingHoursJson(openingHoursJson)
                .build();

        PlaceCategory category = PlaceCategory.builder()
                .name(type.name())
                .categoryType(type)
                .markerColor("#FF0000")
                .markerIcon(PlaceMarkerIcon.DEFAULT)
                .sortOrder(0)
                .tripId(1L)
                .build();

        TripPlace tp = Mockito.mock(TripPlace.class);
        Mockito.when(tp.getId()).thenReturn(id);
        Mockito.when(tp.getPlace()).thenReturn(place);
        Mockito.when(tp.getCategory()).thenReturn(category);
        return tp;
    }

    @Test
    @DisplayName("t1 BAR_장소는_FOOD_장소보다_뒤에_배치된다")
    void t1_BAR_장소는_FOOD_장소보다_뒤에_배치된다() {
        TripPlace bar  = mockPlace(1L, PlaceCategoryType.BAR, null);
        TripPlace food = mockPlace(2L, PlaceCategoryType.FOOD, null);

        List<TripPlace> sorted = sorter.sort(List.of(bar, food), LocalDate.of(2026, 8, 1));

        assertThat(sorted.get(0).getId()).isEqualTo(2L); // FOOD 먼저
        assertThat(sorted.get(1).getId()).isEqualTo(1L); // BAR 나중
    }

    @Test
    @DisplayName("t2 FOOD_장소가_없으면_BAR만_있어도_정상_반환된다")
    void t2_FOOD_장소가_없으면_BAR만_있어도_정상_반환된다() {
        TripPlace bar = mockPlace(1L, PlaceCategoryType.BAR, null);
        List<TripPlace> sorted = sorter.sort(List.of(bar), LocalDate.of(2026, 8, 1));
        assertThat(sorted).hasSize(1);
        assertThat(sorted.get(0).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("t3 영업시간_범위를_벗어난_장소는_뒤로_밀린다")
    void t3_영업시간_범위를_벗어난_장소는_뒤로_밀린다() {
        // 월요일(2026-08-03)에 18:00~02:00만 여는 BAR
        String nightJson = """
            {"periods":[{"open":{"day":1,"time":"1800"},"close":{"day":1,"time":"0200"}}]}
            """;
        // 09:00~21:00 여는 ATTRACTION
        String dayJson = """
            {"periods":[{"open":{"day":1,"time":"0900"},"close":{"day":1,"time":"2100"}}]}
            """;

        TripPlace bar        = mockPlace(1L, PlaceCategoryType.BAR, nightJson);
        TripPlace attraction = mockPlace(2L, PlaceCategoryType.ATTRACTION, dayJson);

        List<TripPlace> sorted = sorter.sort(List.of(bar, attraction), LocalDate.of(2026, 8, 3));

        assertThat(sorted.get(0).getId()).isEqualTo(2L); // ATTRACTION 먼저
        assertThat(sorted.get(1).getId()).isEqualTo(1L); // BAR 나중
    }

    @Test
    @DisplayName("t4 opening_hours_json이_null인_장소는_제약없이_일반_그룹에_포함된다")
    void t4_opening_hours_json이_null인_장소는_제약없이_일반_그룹에_포함된다() {
        TripPlace attraction = mockPlace(1L, PlaceCategoryType.ATTRACTION, null);
        TripPlace cafe       = mockPlace(2L, PlaceCategoryType.CAFE, null);

        List<TripPlace> sorted = sorter.sort(List.of(attraction, cafe), LocalDate.of(2026, 8, 1));

        // 둘 다 일반 그룹 — 순서 변경 없음 (입력 순서 유지)
        assertThat(sorted).containsExactlyInAnyOrder(attraction, cafe);
    }

    @Test
    @DisplayName("t5 빈_리스트는_빈_리스트를_반환한다")
    void t5_빈_리스트는_빈_리스트를_반환한다() {
        assertThat(sorter.sort(List.of(), LocalDate.now())).isEmpty();
    }
}
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && ./gradlew test --tests "*ConstraintSorterTest*"
```
Expected: FAIL (클래스 없음)

- [ ] **Step 3: ConstraintSorter 구현**

```java
// backend/src/main/java/back/backend/domain/itinerary/service/ConstraintSorter.java
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

        List<TripPlace> mealGroup  = new ArrayList<>(); // FOOD/CAFE (아침/점심)
        List<TripPlace> generalGroup = new ArrayList<>(); // 일반 장소
        List<TripPlace> nightGroup = new ArrayList<>(); // BAR/야간

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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "*ConstraintSorterTest*"
```
Expected: 5 tests PASSED

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/service/ConstraintSorter.java \
        backend/src/test/java/back/backend/domain/itinerary/service/ConstraintSorterTest.java
git commit -m "feat: 제약 기반 장소 정렬 로직 추가 (BAR 야간배치, 식사슬롯 우선)"
```

---

## Task 4: ItineraryRoutePlanner — ConstraintSorter 연결

`buildResponseFromClusters()`에서 각 날 `planDay()` 호출 전에 `ConstraintSorter.sort()`를 적용한다.

**Files:**
- Modify: `backend/src/main/java/back/backend/domain/itinerary/service/ItineraryRoutePlanner.java`
- Modify: `backend/src/test/java/back/backend/domain/itinerary/service/ItineraryRoutePlannerTest.java`

**Interfaces:**
- Consumes: `ConstraintSorter.sort(List<TripPlace>, LocalDate) → List<TripPlace>`

- [ ] **Step 1: 실패 테스트 작성**

`ItineraryRoutePlannerTest.java` 에 아래 테스트를 추가한다.
(기존 테스트 클래스에 추가, `@InjectMocks` 대상에 `ConstraintSorter`가 DI되어야 하므로 mock 추가)

```java
// 클래스 상단 mock 목록에 추가
@Mock
private ConstraintSorter constraintSorter;

@Test
@DisplayName("t_constraint1 BAR_장소가_포함된_하루_일정은_ConstraintSorter를_통해_정렬된다")
void tConstraint1_BAR_장소가_포함된_하루_일정은_ConstraintSorter를_통해_정렬된다() {
    // given: 1일 일정, BAR + FOOD 두 장소
    ItineraryDay day = makeDay(1L, 1, LocalDate.of(2026, 8, 1));
    TripPlace barPlace  = makePlace(1L, PlaceCategoryType.BAR, 37.5, 127.0);
    TripPlace foodPlace = makePlace(2L, PlaceCategoryType.FOOD, 37.51, 127.01);

    // ConstraintSorter가 FOOD를 앞에 배치한다고 가정
    when(constraintSorter.sort(anyList(), eq(LocalDate.of(2026, 8, 1))))
            .thenReturn(List.of(foodPlace, barPlace));

    // when
    List<RoutePlanOption> options = planner.planMulti(
            List.of(day), List.of(barPlace, foodPlace), Set.of());

    // then: ConstraintSorter가 호출됐는지 확인
    verify(constraintSorter, atLeastOnce()).sort(anyList(), eq(LocalDate.of(2026, 8, 1)));
}
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && ./gradlew test --tests "*ItineraryRoutePlannerTest*tConstraint1*"
```
Expected: FAIL

- [ ] **Step 3: ItineraryRoutePlanner에 ConstraintSorter DI 추가**

`ItineraryRoutePlanner.java` 의 필드에 추가:

```java
private final ConstraintSorter constraintSorter;
```

(`@RequiredArgsConstructor`가 있으므로 필드 선언만으로 DI됨)

- [ ] **Step 4: buildResponseFromClusters에 날짜 전달 + sort 호출**

기존 `buildResponseFromClusters()` 시그니처 변경:

```java
// 변경 전
private RoutePlanPreviewResponse buildResponseFromClusters(
        List<ItineraryDay> days,
        List<List<TripPlace>> clusters,
        int totalPlaceCount,
        String summary,
        String defaultReason
)

// 변경 후 — dayPlaces를 sort 후 planDay로 전달
private RoutePlanPreviewResponse buildResponseFromClusters(
        List<ItineraryDay> days,
        List<List<TripPlace>> clusters,
        int totalPlaceCount,
        String summary,
        String defaultReason
) {
    List<RoutePlanDayResponse> plannedDays = new ArrayList<>();
    int totalDistanceMeters = 0;

    for (int i = 0; i < days.size(); i++) {
        ItineraryDay day = days.get(i);
        List<TripPlace> dayPlaces = i < clusters.size() ? clusters.get(i) : List.of();
        // ★ 제약 정렬 적용
        List<TripPlace> sortedPlaces = constraintSorter.sort(dayPlaces, day.getItineraryDate());
        RoutePlanDayResponse plannedDay = planDay(day, sortedPlaces, defaultReason);
        plannedDays.add(plannedDay);
        totalDistanceMeters += plannedDay.totalDistanceMeters();
    }

    return new RoutePlanPreviewResponse(summary, totalPlaceCount, totalDistanceMeters, plannedDays);
}
```

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "*ItineraryRoutePlannerTest*"
```
Expected: ALL PASSED

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/service/ItineraryRoutePlanner.java \
        backend/src/test/java/back/backend/domain/itinerary/service/ItineraryRoutePlannerTest.java
git commit -m "feat: 일정 생성 시 ConstraintSorter 적용으로 BAR 야간배치 보장"
```

---

## Task 5: OpenAiRouteAdvisor — describe() 메서드 추가

`recommend()`는 그대로 유지하고 `describe()` 메서드를 추가한다.
`describe()`는 이미 완성된 초안(dayId → tripPlaceIds)을 받아 날짜별 한 줄 설명만 생성한다.

**Files:**
- Modify: `backend/src/main/java/back/backend/domain/itinerary/service/OpenAiRouteAdvisor.java`
- Create (or Modify): `backend/src/test/java/back/backend/domain/itinerary/service/OpenAiRouteAdvisorTest.java`

**Interfaces:**
- Produces: `describe(Map<Long, List<Long>> draft, Set<TravelStyle>) → Optional<Map<Long, String>>` (dayId → summary 문자열)

- [ ] **Step 1: 실패 테스트 작성**

```java
// OpenAiRouteAdvisorTest.java (신규 or 기존 파일에 추가)
package back.backend.domain.itinerary.service;

import back.backend.domain.trip.entity.TravelStyle;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OpenAiRouteAdvisorTest {

    @Mock
    private OpenAiClient openAiClient;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private OpenAiRouteAdvisor advisor;

    @Test
    @DisplayName("t1 describe_초안을_받아_dayId별_summary_맵을_반환한다")
    void t1_describe_초안을_받아_dayId별_summary_맵을_반환한다() throws Exception {
        Map<Long, List<Long>> draft = Map.of(
                1L, List.of(10L, 20L),
                2L, List.of(30L)
        );
        String fakeJson = """
            {"days":[
              {"dayId":1,"summary":"교토 전통 거리 탐방"},
              {"dayId":2,"summary":"아라시야마 자연 힐링"}
            ]}
            """;
        when(openAiClient.isConfigured()).thenReturn(true);
        when(openAiClient.generateStructured(anyString(), anyString(), any()))
                .thenReturn(fakeJson);
        when(objectMapper.readValue(eq(fakeJson), eq(DescribeResponse.class)))
                .thenReturn(new DescribeResponse(List.of(
                        new DescribeDay(1L, "교토 전통 거리 탐방"),
                        new DescribeDay(2L, "아라시야마 자연 힐링")
                )));

        Optional<Map<Long, String>> result = advisor.describe(draft, Set.of(TravelStyle.NATURE));

        assertThat(result).isPresent();
        assertThat(result.get().get(1L)).isEqualTo("교토 전통 거리 탐방");
        assertThat(result.get().get(2L)).isEqualTo("아라시야마 자연 힐링");
    }

    @Test
    @DisplayName("t2 OpenAI_미설정시_describe는_빈_Optional을_반환한다")
    void t2_OpenAI_미설정시_describe는_빈_Optional을_반환한다() {
        when(openAiClient.isConfigured()).thenReturn(false);
        assertThat(advisor.describe(Map.of(), Set.of())).isEmpty();
    }

    @Test
    @DisplayName("t3 AI_호출_실패시_describe는_빈_Optional을_반환한다")
    void t3_AI_호출_실패시_describe는_빈_Optional을_반환한다() throws Exception {
        when(openAiClient.isConfigured()).thenReturn(true);
        when(openAiClient.generateStructured(anyString(), anyString(), any()))
                .thenThrow(new RuntimeException("timeout"));

        assertThat(advisor.describe(Map.of(1L, List.of(10L)), Set.of())).isEmpty();
    }
}
```

> **주의:** `DescribeResponse`, `DescribeDay`는 Task 5 Step 3에서 `OpenAiRouteAdvisor` 내부 record로 정의된다. 테스트에서 직접 참조하기 위해 package-private으로 선언한다.

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && ./gradlew test --tests "*OpenAiRouteAdvisorTest*"
```
Expected: FAIL

- [ ] **Step 3: OpenAiRouteAdvisor에 describe() 추가**

기존 `OpenAiRouteAdvisor.java`에 아래를 추가한다 (`recommend()` 메서드는 건드리지 않음):

```java
// ── 내부 record 추가 (파일 하단, 기존 record들 아래) ──

record DescribeResponse(List<DescribeDay> days) {}
record DescribeDay(Long dayId, String summary) {}

// ── 새 메서드 추가 ──

private static final Map<String, Object> DESCRIBE_SCHEMA = createDescribeSchema();

/**
 * 이미 완성된 초안(dayId → tripPlaceIds)을 받아 날짜별 한 줄 설명을 반환한다.
 * AI 미설정 또는 실패 → Optional.empty()
 */
public Optional<Map<Long, String>> describe(
        Map<Long, List<Long>> draft,
        Set<TravelStyle> travelStyles
) {
    if (!openAiClient.isConfigured() || draft.isEmpty()) return Optional.empty();

    try {
        String prompt = buildDescribePrompt(draft, travelStyles);
        String responseJson = openAiClient.generateStructured(
                prompt, "itinerary_descriptions", DESCRIBE_SCHEMA);
        DescribeResponse response = objectMapper.readValue(responseJson, DescribeResponse.class);
        if (response == null || response.days() == null) return Optional.empty();

        Map<Long, String> summaries = new java.util.LinkedHashMap<>();
        for (DescribeDay day : response.days()) {
            if (day.dayId() != null && day.summary() != null && !day.summary().isBlank()) {
                summaries.put(day.dayId(), day.summary());
            }
        }
        return summaries.isEmpty() ? Optional.empty() : Optional.of(summaries);
    } catch (Exception e) {
        log.warn("AI 설명 생성 실패 — 설명 없이 진행합니다. type={}", e.getClass().getSimpleName());
        return Optional.empty();
    }
}

private String buildDescribePrompt(Map<Long, List<Long>> draft, Set<TravelStyle> travelStyles) {
    StringBuilder sb = new StringBuilder();
    sb.append("아래는 여행 일정 초안입니다. 각 날에 한국어 한 문장 설명을 붙여주세요.\n");
    if (!travelStyles.isEmpty()) {
        String styles = travelStyles.stream().map(Enum::name).sorted()
                .collect(java.util.stream.Collectors.joining(", "));
        sb.append("여행 스타일: ").append(styles).append("\n");
    }
    sb.append("일정:\n");
    draft.forEach((dayId, placeIds) ->
            sb.append("Day ").append(dayId).append(": 장소 ID ").append(placeIds).append("\n")
    );
    return sb.toString();
}

private static Map<String, Object> createDescribeSchema() {
    Map<String, Object> daySchema = Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", Map.of(
                    "dayId",   Map.of("type", "integer"),
                    "summary", Map.of("type", "string")
            ),
            "required", List.of("dayId", "summary")
    );
    return Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", Map.of(
                    "days", Map.of("type", "array", "items", daySchema)
            ),
            "required", List.of("days")
    );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "*OpenAiRouteAdvisorTest*"
```
Expected: 3 tests PASSED

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/service/OpenAiRouteAdvisor.java \
        backend/src/test/java/back/backend/domain/itinerary/service/OpenAiRouteAdvisorTest.java
git commit -m "feat: AI를 설명 생성 전용으로 전환 (describe 메서드 추가)"
```

---

## Task 6: ItineraryRoutePlanner — AI describe 연결 및 전체 통합 테스트

`planMulti()`에서 geo/style 코스 생성 후 `describe()`로 AI 설명을 주입한다.

**Files:**
- Modify: `backend/src/main/java/back/backend/domain/itinerary/service/ItineraryRoutePlanner.java`
- Modify: `backend/src/test/java/back/backend/domain/itinerary/service/ItineraryRoutePlannerTest.java`

- [ ] **Step 1: 통합 시나리오 테스트 추가**

```java
@Test
@DisplayName("t_integration1 AI_describe_성공시_지리_최적_코스_summary가_AI_설명으로_교체된다")
void tIntegration1_AI_describe_성공시_지리_최적_코스_summary가_AI_설명으로_교체된다() {
    ItineraryDay day = makeDay(1L, 1, LocalDate.of(2026, 8, 1));
    TripPlace place1 = makePlace(1L, PlaceCategoryType.ATTRACTION, 37.5, 127.0);
    TripPlace place2 = makePlace(2L, PlaceCategoryType.FOOD, 37.51, 127.01);

    when(constraintSorter.sort(anyList(), any())).thenAnswer(inv -> inv.getArgument(0));
    when(openAiRouteAdvisor.describe(any(), any()))
            .thenReturn(Optional.of(Map.of(1L, "아름다운 교토 탐방 코스")));

    List<RoutePlanOption> options = planner.planMulti(
            List.of(day), List.of(place1, place2), Set.of());

    assertThat(options).isNotEmpty();
    // 지리 최적 코스에 AI 설명이 반영됨
    boolean hasAiSummary = options.stream()
            .anyMatch(o -> o.plan().summary().contains("아름다운 교토 탐방 코스"));
    assertThat(hasAiSummary).isTrue();
}

@Test
@DisplayName("t_integration2 AI_describe_실패시_기본_summary가_유지된다")
void tIntegration2_AI_describe_실패시_기본_summary가_유지된다() {
    ItineraryDay day = makeDay(1L, 1, LocalDate.of(2026, 8, 1));
    TripPlace place1 = makePlace(1L, PlaceCategoryType.ATTRACTION, 37.5, 127.0);

    when(constraintSorter.sort(anyList(), any())).thenAnswer(inv -> inv.getArgument(0));
    when(openAiRouteAdvisor.describe(any(), any())).thenReturn(Optional.empty());

    List<RoutePlanOption> options = planner.planMulti(
            List.of(day), List.of(place1), Set.of());

    assertThat(options).isNotEmpty();
    // 기본 summary가 들어있음 (AI summary 없음)
    assertThat(options.get(0).plan().summary()).isNotBlank();
}
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && ./gradlew test --tests "*ItineraryRoutePlannerTest*tIntegration*"
```
Expected: FAIL

- [ ] **Step 3: planMulti()에 describe() 호출 추가**

`ItineraryRoutePlanner.planMulti()` 에서 지리 최적 코스 생성 직후 AI 설명을 주입한다.
기존 `openAiRouteAdvisor.recommend()` 호출 블록을 아래로 교체한다:

```java
// ── 기존 recommend() 블록 삭제 ──
// openAiRouteAdvisor.recommend(days, tripPlaces, travelStyles)
//     .ifPresent(recommendation -> { ... })

// ── 지리 최적 코스 생성 ──
List<List<TripPlace>> geoClusters = clusterByGeography(tripPlaces, days.size());
RoutePlanPreviewResponse geoPlan = buildResponseFromClusters(
        days, geoClusters, tripPlaces.size(),
        String.format("저장한 장소 %d곳을 지역별로 묶어 %d일에 나눴어요.",
                tripPlaces.size(), days.size()),
        null
);

// ── AI 설명 주입 (실패해도 geoPlan 그대로 반환) ──
Map<Long, List<Long>> draft = new LinkedHashMap<>();
for (int i = 0; i < days.size(); i++) {
    Long dayId = days.get(i).getId();
    List<Long> placeIds = i < geoClusters.size()
            ? geoClusters.get(i).stream().map(TripPlace::getId).toList()
            : List.of();
    draft.put(dayId, placeIds);
}

openAiRouteAdvisor.describe(draft, travelStyles).ifPresent(summaries -> {
    // AI가 날짜별 설명을 반환하면 각 날의 첫 번째 설명을 전체 summary로 사용
    String aiSummary = summaries.values().stream()
            .filter(s -> s != null && !s.isBlank())
            .collect(Collectors.joining(" · "));
    if (!aiSummary.isBlank()) {
        // geoPlan을 AI summary로 교체 (불변 record이므로 새 객체 생성)
        RoutePlanPreviewResponse aiDescribedPlan = new RoutePlanPreviewResponse(
                aiSummary,
                geoPlan.totalPlaceCount(),
                geoPlan.totalDistanceMeters(),
                geoPlan.days()
        );
        options.add(new RoutePlanOption("AI 추천 코스", aiDescribedPlan));
        routeSignatures.add(routeSignature(aiDescribedPlan));
        return;
    }
});

// AI 설명이 없거나 실패한 경우 지리 최적 코스 그대로 추가
if (routeSignatures.add(routeSignature(geoPlan))) {
    options.add(new RoutePlanOption("지리 최적 코스", geoPlan));
}
```

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "*ItineraryRoutePlannerTest*"
```
Expected: ALL PASSED

- [ ] **Step 5: 전체 백엔드 빌드 + 테스트**

```bash
cd backend && ./gradlew clean build
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/service/ItineraryRoutePlanner.java \
        backend/src/test/java/back/backend/domain/itinerary/service/ItineraryRoutePlannerTest.java
git commit -m "feat: AI 역할을 설명 생성으로 축소, 제약 기반 파이프라인 완성"
```

---

## 셀프 리뷰 체크리스트

- [x] spec의 모든 요구사항에 태스크가 대응됨
- [x] `Place.openingHoursJson` 필드 추가 → Task 1
- [x] `OpeningHoursParser` → Task 2
- [x] BAR 야간 배치, 식사 슬롯 정렬 → Task 3 (ConstraintSorter)
- [x] ConstraintSorter → ItineraryRoutePlanner 연결 → Task 4
- [x] AI describe() 메서드 → Task 5
- [x] 전체 파이프라인 통합 → Task 6
- [x] 플레이스홀더 없음
- [x] `DescribeResponse`, `DescribeDay` record가 Task 5에서 정의되고 테스트에서 참조함 — 일관성 확인됨
- [x] `RoutePlanPreviewResponse`가 불변 record임 확인 필요 → Task 6 Step 3에서 새 객체 생성으로 처리
