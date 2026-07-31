# Trip Schedule Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여행방마다 하루 시작/종료 시간과 여행 페이스(빠름/보통/여유)를 설정하고, AI 동선 추천 시 해당 설정을 반영한다.

**Architecture:** Trip 엔티티에 `dayStartTime`, `dayEndTime`, `travelPace` 3개 필드를 추가한다. `ItineraryRoutePlanner`는 하드코딩된 상수 대신 `TripScheduleSettings` record를 받아 시작시간·종료시간·페이스 배율을 적용한다. 프론트엔드 여행방 생성/편집 모달에 설정 UI를 추가한다.

**Tech Stack:** Java 21, Spring Boot 4.1.0, JPA, Flyway, Next.js, TypeScript, Tailwind CSS

## Global Constraints

- Java 패키지: `back.backend.domain.*`
- Flyway 파일명: `V2026_07_30_NNNN__description.sql` (기존 최신: `V2026_07_30_1000__`)
- 테스트: `@DisplayName("tN 동작_결과")` 형식, AssertJ 사용
- 프론트엔드 FSD 레이어 준수: features → entities → shared 방향
- `TripRequest` / `TripResponse`는 `frontend/src/features/manage-trip/api/trip-api.ts`에 정의됨
- Jackson 3.x (`tools.jackson.*`) 사용 — `com.fasterxml` 금지

---

### Task 1: TravelPace enum + Flyway 마이그레이션

**Files:**
- Create: `backend/src/main/java/back/backend/domain/trip/entity/TravelPace.java`
- Create: `backend/src/main/resources/db/migration/V2026_07_30_1100__add_trip_schedule_settings.sql`

**Interfaces:**
- Produces: `TravelPace` enum (`FAST`, `NORMAL`, `RELAXED`) with `stayMultiplier()` method — Task 2, 3에서 사용

- [ ] **Step 1: TravelPace enum 작성**

```java
// backend/src/main/java/back/backend/domain/trip/entity/TravelPace.java
package back.backend.domain.trip.entity;

public enum TravelPace {
    FAST(0.7),
    NORMAL(1.0),
    RELAXED(1.5);

    private final double stayMultiplier;

    TravelPace(double stayMultiplier) {
        this.stayMultiplier = stayMultiplier;
    }

    public double stayMultiplier() {
        return stayMultiplier;
    }
}
```

- [ ] **Step 2: Flyway 마이그레이션 SQL 작성**

```sql
-- backend/src/main/resources/db/migration/V2026_07_30_1100__add_trip_schedule_settings.sql
ALTER TABLE trips
    ADD COLUMN day_start_time TIME NOT NULL DEFAULT '09:00:00' COMMENT '하루 일정 시작 시간',
    ADD COLUMN day_end_time   TIME NOT NULL DEFAULT '21:00:00' COMMENT '하루 일정 종료 시간',
    ADD COLUMN travel_pace    VARCHAR(20) NOT NULL DEFAULT 'NORMAL' COMMENT '여행 페이스 (FAST/NORMAL/RELAXED)';
```

- [ ] **Step 3: 빌드 확인**

```bash
cd backend && ./gradlew compileJava
```
Expected: BUILD SUCCESSFUL

---

### Task 2: Trip 엔티티 + TripRequest/Response DTO 업데이트

**Files:**
- Modify: `backend/src/main/java/back/backend/domain/trip/entity/Trip.java`
- Modify: `backend/src/main/java/back/backend/domain/trip/dto/request/TripRequest.java`
- Modify: `backend/src/main/java/back/backend/domain/trip/dto/response/TripResponse.java`
- Test: `backend/src/test/java/back/backend/domain/trip/service/TripServiceTest.java`

**Interfaces:**
- Consumes: `TravelPace` enum (Task 1)
- Produces:
  - `trip.getDayStartTime()` → `LocalTime`
  - `trip.getDayEndTime()` → `LocalTime`
  - `trip.getTravelPace()` → `TravelPace`
  - `TripResponse.dayStartTime()` → `String` ("HH:mm")
  - `TripResponse.dayEndTime()` → `String` ("HH:mm")
  - `TripResponse.travelPace()` → `String` ("FAST"/"NORMAL"/"RELAXED")

- [ ] **Step 1: 실패하는 테스트 작성**

`TripServiceTest.java`에 아래 테스트 추가 (기존 테스트 번호 이후로 번호 부여, 예: `t15`):

```java
@Test
@DisplayName("t15 여행방_생성시_기본_페이스는_NORMAL이고_시작시간은_09_00이다")
void t15_여행방_생성시_기본_페이스는_NORMAL이고_시작시간은_09_00이다() {
    // given
    TripRequest request = new TripRequest("제목", null, List.of(), null, null, null);

    // when
    TripResponse response = tripService.create(memberId, request);

    // then
    assertThat(response.travelPace()).isEqualTo("NORMAL");
    assertThat(response.dayStartTime()).isEqualTo("09:00");
    assertThat(response.dayEndTime()).isEqualTo("21:00");
}

@Test
@DisplayName("t16 여행방_수정시_페이스와_시간이_반영된다")
void t16_여행방_수정시_페이스와_시간이_반영된다() {
    // given
    TripResponse created = tripService.create(memberId, new TripRequest("제목", null, List.of(), null, null, null));
    TripRequest updateRequest = new TripRequest(
        "제목", null, List.of(), null, null, null,
        LocalTime.of(8, 0), LocalTime.of(23, 0), TravelPace.FAST
    );

    // when
    TripResponse updated = tripService.update(memberId, created.id(), updateRequest);

    // then
    assertThat(updated.travelPace()).isEqualTo("FAST");
    assertThat(updated.dayStartTime()).isEqualTo("08:00");
    assertThat(updated.dayEndTime()).isEqualTo("23:00");
}
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.trip.service.TripServiceTest.t15*" 2>&1 | tail -5
```
Expected: FAIL (컴파일 오류 또는 assertion 실패)

- [ ] **Step 3: Trip 엔티티에 필드 추가**

`Trip.java`에 아래 필드 추가:
```java
import java.time.LocalTime;
import back.backend.domain.trip.entity.TravelPace;

// 필드 (기존 필드들 아래에 추가)
@Column(name = "day_start_time", nullable = false)
private LocalTime dayStartTime = LocalTime.of(9, 0);

@Column(name = "day_end_time", nullable = false)
private LocalTime dayEndTime = LocalTime.of(21, 0);

@Enumerated(EnumType.STRING)
@Column(name = "travel_pace", nullable = false, length = 20)
private TravelPace travelPace = TravelPace.NORMAL;
```

`Trip.create()` 팩토리 메서드에 파라미터 추가 (기존 시그니처 유지 위해 오버로딩):
```java
// 기존 create() 메서드는 그대로 두고, 내부에서 기본값 적용하도록 수정
// create() 내 새 필드 초기화:
trip.dayStartTime = request.dayStartTime() != null ? request.dayStartTime() : LocalTime.of(9, 0);
trip.dayEndTime   = request.dayEndTime()   != null ? request.dayEndTime()   : LocalTime.of(21, 0);
trip.travelPace   = request.travelPace()   != null ? request.travelPace()   : TravelPace.NORMAL;
```

`Trip.update()` 메서드에 수정 로직 추가:
```java
if (request.dayStartTime() != null) this.dayStartTime = request.dayStartTime();
if (request.dayEndTime()   != null) this.dayEndTime   = request.dayEndTime();
if (request.travelPace()   != null) this.travelPace   = request.travelPace();
```

- [ ] **Step 4: TripRequest에 필드 추가**

`TripRequest.java`에 아래 필드 추가 (record면 record 컴포넌트, class면 필드):
```java
import java.time.LocalTime;
import back.backend.domain.trip.entity.TravelPace;

// 기존 필드들 아래에 추가 (nullable — 없으면 기본값 유지)
LocalTime dayStartTime;   // nullable
LocalTime dayEndTime;     // nullable
TravelPace travelPace;    // nullable
```

- [ ] **Step 5: TripResponse에 필드 추가**

`TripResponse.java`에 아래 필드 추가 및 `from()` 메서드 수정:

```java
import java.time.format.DateTimeFormatter;

// 응답 필드 추가
String dayStartTime;   // "HH:mm" 형식
String dayEndTime;     // "HH:mm" 형식
String travelPace;     // "FAST" / "NORMAL" / "RELAXED"

// from() 메서드 내 매핑 추가
private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

// ...
.dayStartTime(trip.getDayStartTime().format(TIME_FMT))
.dayEndTime(trip.getDayEndTime().format(TIME_FMT))
.travelPace(trip.getTravelPace().name())
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.trip.service.TripServiceTest" 2>&1 | tail -10
```
Expected: BUILD SUCCESSFUL

---

### Task 3: TripScheduleSettings record + ItineraryRoutePlanner 리팩터링

**Files:**
- Create: `backend/src/main/java/back/backend/domain/itinerary/service/TripScheduleSettings.java`
- Modify: `backend/src/main/java/back/backend/domain/itinerary/service/ItineraryRoutePlanner.java`
- Modify: `backend/src/main/java/back/backend/domain/itinerary/service/ItineraryService.java`
- Test: `backend/src/test/java/back/backend/domain/itinerary/service/ConstraintSorterTest.java` (변경 없음)

**Interfaces:**
- Consumes: `TravelPace.stayMultiplier()` (Task 1), `trip.getDayStartTime()` (Task 2)
- Produces: `ItineraryRoutePlanner.planMulti(days, places, styles, settings)` — Task 5 프론트 호출에 영향 없음 (API 시그니처 동일)

- [ ] **Step 1: 실패하는 테스트 작성**

새 파일 `ItineraryRoutePlannerScheduleTest.java` 생성:

```java
package back.backend.domain.itinerary.service;

import back.backend.domain.place.entity.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ItineraryRoutePlannerScheduleTest {

    @Test
    @DisplayName("t1 FAST_페이스에서_ATTRACTION_체류시간은_기본의_70퍼센트다")
    void t1_FAST_페이스에서_ATTRACTION_체류시간은_기본의_70퍼센트다() {
        TripScheduleSettings fast = new TripScheduleSettings(9 * 60, 21 * 60, 0.7);
        // ATTRACTION 기본 90분 × 0.7 = 63분
        int stay = fast.stayMinutes(PlaceCategoryType.ATTRACTION);
        assertThat(stay).isEqualTo(63);
    }

    @Test
    @DisplayName("t2 RELAXED_페이스에서_FOOD_체류시간은_기본의_150퍼센트다")
    void t2_RELAXED_페이스에서_FOOD_체류시간은_기본의_150퍼센트다() {
        TripScheduleSettings relaxed = new TripScheduleSettings(9 * 60, 21 * 60, 1.5);
        // FOOD 기본 60분 × 1.5 = 90분
        int stay = relaxed.stayMinutes(PlaceCategoryType.FOOD);
        assertThat(stay).isEqualTo(90);
    }

    @Test
    @DisplayName("t3 dayEndMinutes보다_늦게_끝나는_장소는_시간_없음으로_표시된다")
    void t3_dayEndMinutes보다_늦게_끝나는_장소는_시간_없음으로_표시된다() {
        // 10시 시작 + 종료 10:30 → 끝 시간이 day_end_time(10:31) 이전이면 OK
        TripScheduleSettings settings = new TripScheduleSettings(10 * 60, 10 * 60 + 30, 1.0);
        // FOOD 60분 → 10:00 + 60 = 11:00 > 10:30 → fitsInDay = false
        boolean fits = (10 * 60 + 60) <= settings.dayEndMinutes();
        assertThat(fits).isFalse();
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.itinerary.service.ItineraryRoutePlannerScheduleTest" 2>&1 | tail -5
```
Expected: FAIL (TripScheduleSettings 없음)

- [ ] **Step 3: TripScheduleSettings record 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/service/TripScheduleSettings.java
package back.backend.domain.itinerary.service;

import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TravelPace;

import java.util.Map;

public record TripScheduleSettings(
        int dayStartMinutes,
        int dayEndMinutes,
        double paceMultiplier
) {
    private static final Map<PlaceCategoryType, Integer> BASE_STAY = Map.ofEntries(
            Map.entry(PlaceCategoryType.FOOD,        60),
            Map.entry(PlaceCategoryType.CAFE,        45),
            Map.entry(PlaceCategoryType.BAR,         90),
            Map.entry(PlaceCategoryType.ATTRACTION,  90),
            Map.entry(PlaceCategoryType.NATURE,     120),
            Map.entry(PlaceCategoryType.LODGING,     30),
            Map.entry(PlaceCategoryType.SHOPPING,    60),
            Map.entry(PlaceCategoryType.ACTIVITY,   120),
            Map.entry(PlaceCategoryType.TRANSPORT,   15),
            Map.entry(PlaceCategoryType.OTHER,       60)
    );

    private static final int DEFAULT_STAY = 60;

    public static TripScheduleSettings defaults() {
        return new TripScheduleSettings(9 * 60, 21 * 60, 1.0);
    }

    public static TripScheduleSettings from(Trip trip) {
        int startMinutes = trip.getDayStartTime().getHour() * 60 + trip.getDayStartTime().getMinute();
        int endMinutes   = trip.getDayEndTime().getHour()   * 60 + trip.getDayEndTime().getMinute();
        return new TripScheduleSettings(startMinutes, endMinutes, trip.getTravelPace().stayMultiplier());
    }

    /** 카테고리별 체류 시간(분) — 페이스 배율 적용, 최소 10분 */
    public int stayMinutes(PlaceCategoryType type) {
        int base = BASE_STAY.getOrDefault(type, DEFAULT_STAY);
        return Math.max(10, (int) Math.round(base * paceMultiplier));
    }
}
```

- [ ] **Step 4: ItineraryRoutePlanner 리팩터링**

`ItineraryRoutePlanner.java`에서:

1. 상단 상수 제거:
```java
// 제거할 상수들
private static final int DAY_START_MINUTES = 9 * 60;
private static final int DAY_END_CUTOFF_MINUTES = 21 * 60;
private static final int DEFAULT_STAY_MINUTES = 60;
private static final Map<PlaceCategoryType, Integer> CATEGORY_STAY_MINUTES = ...
```

2. `planMulti` 시그니처 변경:
```java
public List<RoutePlanOption> planMulti(
        List<ItineraryDay> itineraryDays,
        List<TripPlace> tripPlaces,
        Set<TravelStyle> travelStyles,
        TripScheduleSettings settings          // 추가
) {
```

3. `planMulti` 내부에서 `settings`를 `buildResponseFromClusters`와 `planDay`에 전달.

4. `buildResponseFromClusters` 시그니처에 `TripScheduleSettings settings` 파라미터 추가, `planDay` 호출 시 전달.

5. `planDay` 시그니처 변경:
```java
private RoutePlanDayResponse planDay(
        ItineraryDay day,
        List<TripPlace> places,
        String defaultReason,
        TripScheduleSettings settings         // 추가
) {
    List<RoutePlanItemResponse> items = new ArrayList<>();
    int cursorMinutes = settings.dayStartMinutes();    // DAY_START_MINUTES 대체
    int totalDistanceMeters = 0;
    boolean timeSchedulingClosed = false;

    for (int index = 0; index < places.size(); index++) {
        TripPlace current = places.get(index);
        TripPlace next = index + 1 < places.size() ? places.get(index + 1) : null;

        int stayMinutes = settings.stayMinutes(current.getCategory().getCategoryType()); // 대체
        int endMinutes = cursorMinutes + stayMinutes;
        boolean fitsInDay = !timeSchedulingClosed
                && endMinutes <= settings.dayEndMinutes();   // DAY_END_CUTOFF_MINUTES 대체
        // ... 나머지 동일
    }
```

6. 기존 `plan()` 호환 메서드 수정:
```java
public RoutePlanPreviewResponse plan(
        List<ItineraryDay> itineraryDays,
        List<TripPlace> tripPlaces
) {
    List<RoutePlanOption> options = planMulti(
            itineraryDays, tripPlaces, Set.of(), TripScheduleSettings.defaults());
    return options.isEmpty() ? emptyResponse(itineraryDays, tripPlaces) : options.get(0).plan();
}
```

- [ ] **Step 5: ItineraryService.previewRoutePlan 수정**

```java
@Transactional(readOnly = true)
public List<RoutePlanOption> previewRoutePlan(Long tripId) {
    accessChecker.requireView(tripId);
    Trip trip = tripRepository.findById(tripId)
            .orElseThrow(() -> new CustomException(TripErrorCode.INVALID_TRIP));
    TripScheduleSettings settings = TripScheduleSettings.from(trip);
    return routePlanner.planMulti(
            dayRepository.findAllWithItemsByTripId(tripId),
            findSavedTripPlaces(tripId),
            trip.getTravelStyles(),
            settings
    );
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.itinerary.service.ItineraryRoutePlannerScheduleTest" 2>&1 | tail -10
```
Expected: BUILD SUCCESSFUL (t1, t2, t3 모두 PASS)

- [ ] **Step 7: 전체 itinerary 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.itinerary.*" 2>&1 | tail -10
```
Expected: BUILD SUCCESSFUL

---

### Task 4: 프론트엔드 타입 + API 업데이트

**Files:**
- Modify: `frontend/src/features/manage-trip/api/trip-api.ts`

**Interfaces:**
- Produces:
  - `TravelPace` type: `'FAST' | 'NORMAL' | 'RELAXED'`
  - `TripRequest.travelPace?: TravelPace | null`
  - `TripRequest.dayStartTime?: string | null` ("HH:mm")
  - `TripRequest.dayEndTime?: string | null` ("HH:mm")
  - `TripResponse.travelPace: TravelPace`
  - `TripResponse.dayStartTime: string`
  - `TripResponse.dayEndTime: string`

- [ ] **Step 1: trip-api.ts에 타입 및 필드 추가**

`frontend/src/features/manage-trip/api/trip-api.ts`에서:

```typescript
// 추가할 타입
export type TravelPace = 'FAST' | 'NORMAL' | 'RELAXED'

// TripRequest에 추가 (선택 필드 — 없으면 서버 기본값 유지)
export interface TripRequest {
    title: string
    companionType: CompanionType | null
    travelStyles: TravelStyle[]
    destination: string | null
    startDate: string | null
    endDate: string | null
    dayStartTime?: string | null   // "HH:mm" 예: "09:00"
    dayEndTime?: string | null     // "HH:mm" 예: "21:00"
    travelPace?: TravelPace | null
}

// TripResponse에 추가
export interface TripResponse {
    // ... 기존 필드들 ...
    dayStartTime: string    // "HH:mm"
    dayEndTime: string      // "HH:mm"
    travelPace: TravelPace
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: 타입 오류 없이 빌드 성공 (새 필드는 optional이라 기존 코드 영향 없음)

---

### Task 5: 프론트엔드 UI — 페이스 + 시간 설정

**Files:**
- Modify: `frontend/src/features/manage-trip/ui/manage-trip-modal.tsx`
- Modify: `frontend/src/features/manage-trip/ui/create-trip-modal.tsx`

**Interfaces:**
- Consumes: `TravelPace` type, `TripRequest` 확장 필드 (Task 4)

- [ ] **Step 1: manage-trip-modal.tsx에 상태 추가**

기존 state 선언부 아래에:
```typescript
const [travelPace, setTravelPace] = useState<TravelPace>(trip.travelPace ?? 'NORMAL')
const [dayStartTime, setDayStartTime] = useState(trip.dayStartTime ?? '09:00')
const [dayEndTime, setDayEndTime] = useState(trip.dayEndTime ?? '21:00')
```

- [ ] **Step 2: manage-trip-modal.tsx updateTrip 호출에 필드 추가**

```typescript
await updateTrip(trip.id, {
    title: title.trim(),
    companionType: companionType || null,
    travelStyles: styles,
    destination: destination.trim() || null,
    startDate: startDate || null,
    endDate: endDate || null,
    travelPace,           // 추가
    dayStartTime,         // 추가
    dayEndTime,           // 추가
})
```

- [ ] **Step 3: manage-trip-modal.tsx에 UI 추가**

기존 폼 마지막 입력 항목 아래에 추가:

```tsx
{/* 여행 페이스 */}
<div className="space-y-2">
    <label className="text-sm font-medium text-slate-700">여행 페이스</label>
    <div className="flex gap-2">
        {([
            { value: 'FAST',    label: '🐇 빠름',  desc: '많은 장소 빠르게' },
            { value: 'NORMAL',  label: '🚶 보통',  desc: '균형 있게' },
            { value: 'RELAXED', label: '🐢 여유',  desc: '적은 장소 오래' },
        ] as const).map((pace) => (
            <button
                key={pace.value}
                type="button"
                onClick={() => setTravelPace(pace.value)}
                className={`flex-1 rounded-xl border-2 px-2 py-2 text-center text-xs transition-colors ${
                    travelPace === pace.value
                        ? 'border-brand bg-brand/10 font-bold text-brand'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
            >
                <div className="font-medium">{pace.label}</div>
                <div className="mt-0.5 text-[10px] text-slate-400">{pace.desc}</div>
            </button>
        ))}
    </div>
</div>

{/* 일정 시간 */}
<div className="flex gap-3">
    <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-slate-700">시작 시간</label>
        <input
            type="time"
            value={dayStartTime}
            onChange={(e) => setDayStartTime(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
    </div>
    <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-slate-700">종료 시간</label>
        <input
            type="time"
            value={dayEndTime}
            onChange={(e) => setDayEndTime(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
    </div>
</div>
```

- [ ] **Step 4: create-trip-modal.tsx에도 동일하게 적용**

`manage-trip-modal.tsx`에서 추가한 것과 동일하게 `create-trip-modal.tsx`에도:

1. state 추가:
```typescript
const [travelPace, setTravelPace] = useState<TravelPace>('NORMAL')
const [dayStartTime, setDayStartTime] = useState('09:00')
const [dayEndTime, setDayEndTime] = useState('21:00')
```

2. `createTrip` 호출에 필드 추가:
```typescript
title: normalizedTitle,
companionType: companionType || null,
travelStyles,
destination: destination.trim() || null,
startDate: startDate || null,
endDate: endDate || null,
travelPace,       // 추가
dayStartTime,     // 추가
dayEndTime,       // 추가
```

3. 폼 UI: manage-trip-modal.tsx Step 3과 동일한 JSX 추가.

- [ ] **Step 5: 프론트엔드 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: 빌드 성공

- [ ] **Step 6: 백엔드 전체 테스트 확인**

```bash
cd backend && ./gradlew test 2>&1 | tail -15
```
Expected: BUILD SUCCESSFUL

---

## 셀프 리뷰

### Spec 커버리지
- [x] TravelPace enum (FAST/NORMAL/RELAXED) — Task 1
- [x] day_start_time, day_end_time DB 컬럼 — Task 1
- [x] Trip 엔티티 필드 — Task 2
- [x] DTO 필드 추가 — Task 2, 4
- [x] ItineraryRoutePlanner 하드코딩 제거 — Task 3
- [x] 프론트엔드 UI — Task 5

### 타입 일관성
- `TripScheduleSettings.stayMinutes(PlaceCategoryType)` — Task 3 정의, 테스트에서 사용
- `TripScheduleSettings.from(Trip)` — Task 3 정의, ItineraryService에서 사용
- `TravelPace.stayMultiplier()` — Task 1 정의, TripScheduleSettings에서 사용
- 프론트 `TravelPace` 타입 — Task 4 정의, Task 5 UI에서 사용
