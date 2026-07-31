# AI 일정 추천 개선: 제약 기반 파이프라인 설계

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 토큰 사용량을 ~70% 줄이면서, 영업시간·식사슬롯·동선을 현실적으로 반영한 여행 일정을 생성한다.

**Architecture:** 코드가 지리 클러스터링·제약 필터링·동선 정렬을 담당하고, AI는 완성된 초안에 대한 한 줄 설명 생성과 선택적 swap 제안만 수행하는 3단계 파이프라인.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, MySQL, OpenAI API (gpt-5-nano), Google Places API (기존 PlaceSearchService), GoogleRoutesClient

---

## Global Constraints

- 외부 DB(Graph DB 등) 추가 금지 — MySQL만 사용
- Google Places API 추가 호출 금지 — `places.opening_hours_json` DB 컬럼 값만 사용
- 영업시간 정보가 없는 장소는 "항상 방문 가능"으로 처리 (제약 미적용)
- 기존 `ItineraryRoutePlanner.clusterByGeography()` 폴백 로직을 1단계로 승격 (재작성 금지)
- AI 호출 실패 시 AI 설명 없이 코드 산출 일정만 반환 (기존 폴백 정책 유지)
- 테스트: Controller·Service·Repository 레이어별 TDD, `@DisplayName("tN 설명")` 형식

---

## 핵심 문제 정의

현재 `OpenAiRouteAdvisor`가 클러스터링 + 순서 결정 + 스타일 적용을 전부 AI에 위임하여:
- 영업 전 시간대에 BAR 배치 (오전 9시 술집)
- 하루 일정에 식사 슬롯 누락
- 장소 수 증가 시 중복 배치 또는 누락
- 토큰 과다 사용

---

## 파이프라인 설계 (3단계)

```
[TripPlace 목록 + TravelStyle + ItineraryDay 수]
        ↓
[1단계] ConstraintScheduler (Java)
  - opening_hours_json 파싱 → 장소별 가용 시간대 도출
  - 식사 슬롯 보장 (아침/점심/저녁)
  - 영업시간 위반 필터 (opening_hours 없으면 통과)
  - BAR/NIGHTLIFE → 18:00 이전 배치 금지 (opening_hours 없어도 적용)
  - 기존 clusterByGeography() → 일별 장소 배정
  - Nearest Neighbor → 하루 동선 정렬
        ↓
[2단계] OpenAiRouteAdvisor (AI, 최소화)
  - 입력: 코드 산출 초안 (정렬된 ID 목록) + TravelStyle
  - 요청: 날짜별 한 줄 테마 설명 생성 + swap 제안 (선택, 최대 1개/일)
  - 실패 시: 설명 없이 코드 초안 그대로 반환
        ↓
[최종 일정 반환]
```

---

## 컴포넌트 설계

### 1. PlaceConstraint (새 Value Object)

**파일:** `domain/itinerary/service/PlaceConstraint.java`

```java
record PlaceConstraint(
    Long tripPlaceId,
    LocalTime openFrom,   // null = 제약 없음
    LocalTime openUntil,  // null = 제약 없음
    boolean isNightlifeOnly  // BAR/NIGHTLIFE → true (opening_hours 무관하게 적용)
) {
    boolean isAvailableAt(LocalTime time) {
        if (isNightlifeOnly && time.isBefore(LocalTime.of(18, 0))) return false;
        if (openFrom == null) return true;
        return !time.isBefore(openFrom) && !time.isAfter(openUntil);
    }
}
```

### 2. OpeningHoursParser (새 유틸)

**파일:** `domain/itinerary/service/OpeningHoursParser.java`

- `places.opening_hours_json` 컬럼 파싱
- Google Places API 응답 형식: `{"periods": [{"open": {"day":1,"time":"0900"}, "close": {"day":1,"time":"2100"}}]}`
- 해당 요일(dayOfWeek)의 open/close 시간 추출
- 파싱 실패 또는 null → `PlaceConstraint(id, null, null, false)` 반환

### 3. MealSlotAssigner (새 서비스)

**파일:** `domain/itinerary/service/MealSlotAssigner.java`

식사 슬롯 보장 규칙:
- **아침** (08:00~10:00): CAFE 또는 FOOD 카테고리 중 해당 시간 가용한 장소 1개 우선 배치
- **점심** (12:00~14:00): FOOD 카테고리 중 해당 시간 가용한 장소 1개 우선 배치  
- **저녁** (18:00~20:00): FOOD 또는 BAR 카테고리 중 해당 시간 가용한 장소 1개 우선 배치

슬롯에 해당하는 장소가 없으면 → 해당 슬롯 비워둠 (강제 미배치, AI에게도 알리지 않음)

### 4. ConstraintScheduler (새 서비스, 핵심)

**파일:** `domain/itinerary/service/ConstraintScheduler.java`

```
입력: List<TripPlace>, List<ItineraryDay>, Set<TravelStyle>
출력: Map<Long dayId, List<Long tripPlaceId>> (정렬된 일정 초안)
```

처리 순서:
1. 각 TripPlace의 `place.opening_hours_json` + 카테고리로 `PlaceConstraint` 생성
2. `MealSlotAssigner`로 식사 슬롯 먼저 확정
3. 남은 장소를 `clusterByGeography()`로 일별 배정 (기존 로직 재사용)
4. 각 날 내부를 Nearest Neighbor로 정렬 (기존 로직 재사용)
5. BAR/NIGHTLIFE가 18:00 이전에 배치되면 → 저녁 슬롯 이후로 이동 또는 다음 날로 밀기

### 5. OpenAiRouteAdvisor (기존, 역할 축소)

**변경 전:** 모든 장소의 클러스터링 + 순서 결정  
**변경 후:** 코드 산출 초안을 받아 날짜별 테마 설명 + 선택적 swap 제안만 수행

프롬프트 변경:
```
// 기존 (~500토큰)
"다음 장소들을 N일 일정으로 나눠서 배치해줘. [30개 장소 JSON]"

// 변경 후 (~150토큰)
"아래 일정 초안의 각 날에 한 줄 테마 설명을 붙여줘. 
 이상한 배치가 있으면 같은 날 내에서 딱 1개 swap만 제안해줘.
 Day1: [id1, id2, id3], Day2: [id4, id5, id6] ..."
```

응답 스키마:
```json
{
  "days": [
    { "dayId": 1, "summary": "아라시야마 자연 탐방 후 니시키 시장", "swap": null },
    { "dayId": 2, "summary": "교토 역사 지구 산책", "swap": {"from": 5, "to": 7} }
  ]
}
```

### 6. ItineraryRoutePlanner (기존, 오케스트레이터 역할 변경)

```
기존: TripPlace → [AI 클러스터링] → 일정
변경: TripPlace → [ConstraintScheduler] → [AI 설명] → 일정
```

AI 호출 임계값(현재 60개) 제거 — ConstraintScheduler가 항상 실행되고, AI는 장소 수 무관하게 항상 설명 생성 시도.

---

## 데이터 흐름 (상세)

```
ItineraryRoutePlanner.plan(tripPlaces, itineraryDays, travelStyles)
  │
  ├─ ConstraintScheduler.schedule(tripPlaces, itineraryDays, travelStyles)
  │     ├─ OpeningHoursParser.parse(place.openingHoursJson, dayOfWeek)
  │     │     → PlaceConstraint 목록
  │     ├─ MealSlotAssigner.assign(tripPlaces, constraints)
  │     │     → 식사 슬롯 확정 (dayId → mealPlaceIds)
  │     ├─ clusterByGeography() [기존 재사용]
  │     │     → 비식사 장소 일별 배정
  │     ├─ nearestNeighborSort() [기존 재사용]
  │     │     → 하루 동선 정렬
  │     └─ applyNightlifeConstraint()
  │           → BAR 18시 이전 배치 → 저녁 이후로 이동
  │
  ├─ [초안 완성]
  │
  └─ OpenAiRouteAdvisor.describe(draft, travelStyles)
        → 날짜별 summary + 선택적 swap
        → 실패 시: summary null, swap null으로 반환 (일정은 그대로)
```

---

## 에러 처리

| 상황 | 처리 |
|---|---|
| `opening_hours_json` null 또는 파싱 실패 | 해당 장소 제약 없음으로 처리 |
| 식사 슬롯에 FOOD 장소 없음 | 슬롯 비워둠, 사용자에게 별도 알림 없음 |
| BAR 장소뿐인 하루 | 저녁 이후 배치, 나머지 슬롯 비움 |
| AI 호출 실패 / 타임아웃 | summary null 반환, 코드 초안 그대로 사용 |
| AI가 존재하지 않는 ID로 swap 제안 | swap 무시, 코드 초안 유지 |

---

## 테스트 계획

### ConstraintSchedulerTest
- `t1 영업시간_있는_BAR이_18시_이전에_배치되면_저녁_이후로_이동한다`
- `t2 opening_hours_json이_null인_장소는_제약없이_배치된다`
- `t3 FOOD_장소가_있으면_점심슬롯에_우선배치된다`
- `t4 FOOD_장소가_없으면_점심슬롯이_비어있다`

### OpeningHoursParserTest
- `t1 정상_JSON에서_해당_요일_영업시간을_파싱한다`
- `t2 null_JSON은_제약없음_PlaceConstraint를_반환한다`
- `t3 파싱_실패_JSON은_제약없음_PlaceConstraint를_반환한다`

### OpenAiRouteAdvisorTest (기존 수정)
- `t1 초안을_받아_날짜별_summary와_swap을_반환한다`
- `t2 AI_실패시_summary_null_swap_null로_반환한다`
- `t3 AI가_존재하지않는_ID로_swap_제안시_무시한다`

---

## 변경 파일 목록

**신규 생성:**
- `domain/itinerary/service/PlaceConstraint.java`
- `domain/itinerary/service/OpeningHoursParser.java`
- `domain/itinerary/service/MealSlotAssigner.java`
- `domain/itinerary/service/ConstraintScheduler.java`
- `domain/itinerary/service/OpeningHoursParserTest.java` (test)
- `domain/itinerary/service/ConstraintSchedulerTest.java` (test)

**수정:**
- `domain/itinerary/service/ItineraryRoutePlanner.java` — ConstraintScheduler 호출로 오케스트레이션 변경
- `domain/itinerary/service/OpenAiRouteAdvisor.java` — 프롬프트 변경, 응답 스키마 변경
- `domain/itinerary/service/OpenAiRouteAdvisorTest.java` (test)
- `domain/itinerary/service/ItineraryRoutePlannerTest.java` (test)
