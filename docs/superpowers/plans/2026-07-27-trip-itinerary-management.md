# Trip Itinerary Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SAVED 상태 장소를 여행 날짜별 Day에 드래그앤드롭으로 배치하고, 시간·메모·이동정보를 기록하며 Day를 확정할 수 있는 일정 관리 기능을 백엔드와 프런트엔드 모두 구현한다.

**Architecture:** 백엔드는 `domain/itinerary` 패키지 신규 구현(Entity→Repository→Service→Controller, TDD), DB는 기존 `itinerary_days`/`itinerary_items` 테이블 사용 + `transport_meters` 컬럼 추가 마이그레이션. 프런트엔드는 `@dnd-kit` 기반 드래그앤드롭 UI를 `widgets/trip-room/ui/schedule-panel.tsx`로 신규 작성하고, 기존 `itinerary-panel.tsx`(날짜 투표)를 `date-vote-panel.tsx`로 리네임한 뒤 `room-detail-panel.tsx`에서 날짜 확정 여부에 따라 두 패널을 분기 표시한다.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, JUnit 5 + Mockito (BDD), Next.js 19, TypeScript, Zustand 5, @dnd-kit/core + @dnd-kit/sortable

## Global Constraints

- 모든 테스트는 `@DisplayName("tN behavior and expected result")` + `void tN_methodName()` 형식을 따른다 (N은 클래스 내 순번).
- AssertJ(`assertThat`, `assertThatThrownBy`) 사용 필수. JUnit5 assertions 사용 금지.
- Controller 테스트는 `MockMvcBuilders.standaloneSetup(...).setControllerAdvice(new GlobalExceptionHandler()).build()` 사용.
- Service 테스트는 `@ExtendWith(MockitoExtension.class)` + `@Mock`/`@InjectMocks`.
- API 응답 형식: `ApiResponse.success(data)` / `ApiResponse.ok()`.
- 에러 코드: `ItineraryErrorCode implements ErrorCode` enum 패턴 (PlaceErrorCode 참고).
- FSD 계층 준수: `entities → features → widgets` 방향으로만 import.
- 기존 파일 수정 전 반드시 현재 파일 내용 확인.
- Flyway 마이그레이션 파일은 이미 적용된 것 수정 금지, 신규 파일만 추가.

---

### Task 1: DB 마이그레이션 — transport_meters 컬럼 추가

**Files:**
- Create: `backend/src/main/resources/db/migration/V2026_07_27_1000__add_itinerary_transport_meters.sql`

**Interfaces:**
- Produces: `itinerary_items.transport_meters INT NULL` 컬럼

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
ALTER TABLE itinerary_items
    ADD COLUMN transport_meters INT NULL COMMENT '이동 거리(미터)' AFTER transport_minutes;
```

- [ ] **Step 2: 파일명 형식 확인**

기존 마이그레이션 파일 목록(`backend/src/main/resources/db/migration/`)과 비교해 `V{YYYY_MM_DD_HHMM}__description.sql` 형식이 맞는지 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add backend/src/main/resources/db/migration/V2026_07_27_1000__add_itinerary_transport_meters.sql
git commit -m "chore: itinerary_items에 transport_meters 컬럼 추가"
```

---

### Task 2: 백엔드 — Entities, Enum, ErrorCode

**Files:**
- Create: `backend/src/main/java/back/backend/domain/itinerary/entity/ItineraryDayStatus.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/entity/ItineraryDay.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/entity/ItineraryItem.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/exception/ItineraryErrorCode.java`

**Interfaces:**
- Produces:
  - `ItineraryDayStatus.DRAFT`, `ItineraryDayStatus.CONFIRMED`
  - `ItineraryDay.create(Long tripId, LocalDate date, int dayNumber): ItineraryDay`
  - `ItineraryDay.updateStatus(ItineraryDayStatus): void`
  - `ItineraryDay.getTripId()`, `getItineraryDate()`, `getDayNumber()`, `getStatus()`, `getItems()`
  - `ItineraryItem.create(ItineraryDay day, Long tripPlaceId, int sortOrder): ItineraryItem`
  - `ItineraryItem.updateDay(ItineraryDay): void`
  - `ItineraryItem.updateSortOrder(int): void`
  - `ItineraryItem.updateDetails(LocalTime, LocalTime, String, Integer, Integer): void`
  - `ItineraryItem.getId()`, `getTripPlaceId()`, `getItineraryDay()`, `getSortOrder()`, `getStartTime()`, `getEndTime()`, `getMemo()`, `getTransportMinutes()`, `getTransportMeters()`
  - `ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND`, `ITINERARY_ITEM_NOT_FOUND`, `ITINERARY_PLACE_NOT_SAVED`, `ITINERARY_ITEM_ALREADY_EXISTS`

- [ ] **Step 1: ItineraryDayStatus 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/entity/ItineraryDayStatus.java
package back.backend.domain.itinerary.entity;

public enum ItineraryDayStatus {
    DRAFT, CONFIRMED
}
```

- [ ] **Step 2: ItineraryDay 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/entity/ItineraryDay.java
package back.backend.domain.itinerary.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "itinerary_days")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItineraryDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "itinerary_date", nullable = false)
    private LocalDate itineraryDate;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItineraryDayStatus status;

    @OneToMany(mappedBy = "itineraryDay", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ItineraryItem> items = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static ItineraryDay create(Long tripId, LocalDate itineraryDate, int dayNumber) {
        ItineraryDay day = new ItineraryDay();
        day.tripId = tripId;
        day.itineraryDate = itineraryDate;
        day.dayNumber = dayNumber;
        day.status = ItineraryDayStatus.DRAFT;
        return day;
    }

    public void updateStatus(ItineraryDayStatus status) {
        this.status = status;
    }
}
```

- [ ] **Step 3: ItineraryItem 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/entity/ItineraryItem.java
package back.backend.domain.itinerary.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "itinerary_items")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItineraryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "itinerary_day_id", nullable = false)
    private ItineraryDay itineraryDay;

    @Column(name = "trip_place_id")
    private Long tripPlaceId;

    @Column(length = 100)
    private String title;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "transport_minutes")
    private Integer transportMinutes;

    @Column(name = "transport_meters")
    private Integer transportMeters;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static ItineraryItem create(ItineraryDay day, Long tripPlaceId, int sortOrder) {
        ItineraryItem item = new ItineraryItem();
        item.itineraryDay = day;
        item.tripPlaceId = tripPlaceId;
        item.sortOrder = sortOrder;
        return item;
    }

    public void updateDay(ItineraryDay day) {
        this.itineraryDay = day;
    }

    public void updateSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void updateDetails(LocalTime startTime, LocalTime endTime, String memo,
                               Integer transportMinutes, Integer transportMeters) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.memo = memo;
        this.transportMinutes = transportMinutes;
        this.transportMeters = transportMeters;
    }
}
```

- [ ] **Step 4: ItineraryErrorCode 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/exception/ItineraryErrorCode.java
package back.backend.domain.itinerary.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ItineraryErrorCode implements ErrorCode {

    ITINERARY_DAY_NOT_FOUND(HttpStatus.NOT_FOUND, "ITINERARY_DAY_NOT_FOUND", "일정 날짜를 찾을 수 없습니다."),
    ITINERARY_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "ITINERARY_ITEM_NOT_FOUND", "일정 항목을 찾을 수 없습니다."),
    ITINERARY_PLACE_NOT_SAVED(HttpStatus.FORBIDDEN, "ITINERARY_PLACE_NOT_SAVED", "확정된 장소만 일정에 배치할 수 있습니다."),
    ITINERARY_ITEM_ALREADY_EXISTS(HttpStatus.CONFLICT, "ITINERARY_ITEM_ALREADY_EXISTS", "같은 날에 이미 배치된 장소입니다."),
    ITINERARY_TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "ITINERARY_TRIP_NOT_FOUND", "여행방을 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ItineraryErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}
```

- [ ] **Step 5: 컴파일 확인**

```bash
cd backend && ./gradlew compileJava
```

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/
git commit -m "feat: ItineraryDay, ItineraryItem 엔티티와 에러 코드 추가"
```

---

### Task 3: 백엔드 — Repositories + DTOs

**Files:**
- Create: `backend/src/main/java/back/backend/domain/itinerary/repository/ItineraryDayRepository.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/repository/ItineraryItemRepository.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/dto/request/AddItineraryItemRequest.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/dto/request/UpdateItineraryItemRequest.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/dto/request/MoveItineraryItemRequest.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/dto/request/ReorderItineraryItemsRequest.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/dto/request/UpdateItineraryDayStatusRequest.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/dto/response/ItineraryItemResponse.java`
- Create: `backend/src/main/java/back/backend/domain/itinerary/dto/response/ItineraryDayResponse.java`

**Interfaces:**
- Consumes: `ItineraryDay`, `ItineraryItem` (Task 2), `TripPlace`, `Place`, `PlaceCategory`
- Produces:
  - `ItineraryDayRepository.findAllWithItemsByTripId(Long tripId): List<ItineraryDay>`
  - `ItineraryDayRepository.findByIdAndTripId(Long id, Long tripId): Optional<ItineraryDay>`
  - `ItineraryItemRepository.findByIdAndTripId(Long itemId, Long tripId): Optional<ItineraryItem>`
  - `ItineraryItemRepository.existsByItineraryDayAndTripPlaceId(ItineraryDay, Long): boolean`
  - `ItineraryItemResponse.from(ItineraryItem, TripPlace): ItineraryItemResponse`
  - `ItineraryDayResponse.from(ItineraryDay, Map<Long,TripPlace>): ItineraryDayResponse`

- [ ] **Step 1: ItineraryDayRepository 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/repository/ItineraryDayRepository.java
package back.backend.domain.itinerary.repository;

import back.backend.domain.itinerary.entity.ItineraryDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ItineraryDayRepository extends JpaRepository<ItineraryDay, Long> {

    @Query("SELECT DISTINCT d FROM ItineraryDay d LEFT JOIN FETCH d.items WHERE d.tripId = :tripId ORDER BY d.dayNumber ASC")
    List<ItineraryDay> findAllWithItemsByTripId(@Param("tripId") Long tripId);

    Optional<ItineraryDay> findByIdAndTripId(Long id, Long tripId);

    boolean existsByTripIdAndItineraryDate(Long tripId, LocalDate itineraryDate);
}
```

- [ ] **Step 2: ItineraryItemRepository 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/repository/ItineraryItemRepository.java
package back.backend.domain.itinerary.repository;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, Long> {

    @Query("SELECT i FROM ItineraryItem i JOIN i.itineraryDay d WHERE i.id = :itemId AND d.tripId = :tripId")
    Optional<ItineraryItem> findByIdAndTripId(@Param("itemId") Long itemId, @Param("tripId") Long tripId);

    boolean existsByItineraryDayAndTripPlaceId(ItineraryDay itineraryDay, Long tripPlaceId);
}
```

- [ ] **Step 3: Request DTOs 작성**

```java
// AddItineraryItemRequest.java
package back.backend.domain.itinerary.dto.request;
import jakarta.validation.constraints.NotNull;

public record AddItineraryItemRequest(
    @NotNull Long tripPlaceId,
    int sortOrder
) {}
```

```java
// UpdateItineraryItemRequest.java
package back.backend.domain.itinerary.dto.request;

public record UpdateItineraryItemRequest(
    String startTime,
    String endTime,
    String memo,
    Integer transportMinutes,
    Integer transportMeters
) {}
```

```java
// MoveItineraryItemRequest.java
package back.backend.domain.itinerary.dto.request;
import jakarta.validation.constraints.NotNull;

public record MoveItineraryItemRequest(
    @NotNull Long targetDayId,
    int sortOrder
) {}
```

```java
// ReorderItineraryItemsRequest.java
package back.backend.domain.itinerary.dto.request;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ReorderItineraryItemsRequest(
    @NotNull List<Long> itemIds
) {}
```

```java
// UpdateItineraryDayStatusRequest.java
package back.backend.domain.itinerary.dto.request;
import jakarta.validation.constraints.NotNull;

public record UpdateItineraryDayStatusRequest(
    @NotNull String status
) {}
```

- [ ] **Step 4: ItineraryItemResponse 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/dto/response/ItineraryItemResponse.java
package back.backend.domain.itinerary.dto.response;

import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.place.entity.TripPlace;

import java.time.format.DateTimeFormatter;

public record ItineraryItemResponse(
    Long id,
    Long tripPlaceId,
    String placeName,
    String placeAddress,
    String categoryName,
    String categoryColor,
    String categoryIcon,
    double lat,
    double lng,
    String startTime,
    String endTime,
    int sortOrder,
    Integer transportMinutes,
    Integer transportMeters,
    String memo
) {
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public static ItineraryItemResponse from(ItineraryItem item, TripPlace tripPlace) {
        String placeName = tripPlace != null ? tripPlace.getPlace().getName() : null;
        String placeAddress = tripPlace != null ? tripPlace.getPlace().getAddress() : null;
        String catName = tripPlace != null ? tripPlace.getCategory().getName() : null;
        String catColor = tripPlace != null ? tripPlace.getCategory().getColor() : null;
        String catIcon = tripPlace != null ? tripPlace.getCategory().getIcon().name() : null;
        double lat = tripPlace != null ? tripPlace.getPlace().getLatitude().doubleValue() : 0;
        double lng = tripPlace != null ? tripPlace.getPlace().getLongitude().doubleValue() : 0;

        return new ItineraryItemResponse(
            item.getId(),
            item.getTripPlaceId(),
            placeName,
            placeAddress,
            catName,
            catColor,
            catIcon,
            lat,
            lng,
            item.getStartTime() != null ? item.getStartTime().format(TIME_FMT) : null,
            item.getEndTime() != null ? item.getEndTime().format(TIME_FMT) : null,
            item.getSortOrder(),
            item.getTransportMinutes(),
            item.getTransportMeters(),
            item.getMemo()
        );
    }
}
```

- [ ] **Step 5: ItineraryDayResponse 작성**

```java
// backend/src/main/java/back/backend/domain/itinerary/dto/response/ItineraryDayResponse.java
package back.backend.domain.itinerary.dto.response;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.TripPlace;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ItineraryDayResponse(
    Long id,
    LocalDate itineraryDate,
    int dayNumber,
    String title,
    String status,
    List<ItineraryItemResponse> items
) {
    public static ItineraryDayResponse from(ItineraryDay day, Map<Long, TripPlace> tripPlaceMap) {
        List<ItineraryItemResponse> itemResponses = day.getItems().stream()
            .map(item -> {
                TripPlace tp = item.getTripPlaceId() != null
                    ? tripPlaceMap.get(item.getTripPlaceId())
                    : null;
                return ItineraryItemResponse.from(item, tp);
            })
            .toList();

        return new ItineraryDayResponse(
            day.getId(),
            day.getItineraryDate(),
            day.getDayNumber(),
            day.getTitle(),
            day.getStatus().name(),
            itemResponses
        );
    }
}
```

- [ ] **Step 6: 컴파일 확인**

```bash
cd backend && ./gradlew compileJava
```

- [ ] **Step 7: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/
git commit -m "feat: Itinerary Repository와 DTO 추가"
```

---

### Task 4: 백엔드 — ItineraryService (TDD)

**Files:**
- Create: `backend/src/main/java/back/backend/domain/itinerary/service/ItineraryService.java`
- Create: `backend/src/test/java/back/backend/domain/itinerary/service/ItineraryServiceTest.java`

**Interfaces:**
- Consumes: Task 2~3 모든 결과물, `TripAccessChecker`, `TripRepository`, `TripPlaceRepository`
- Produces:
  - `ItineraryService.getItinerary(Long tripId): List<ItineraryDayResponse>`
  - `ItineraryService.addItem(Long tripId, Long dayId, AddItineraryItemRequest): ItineraryDayResponse`
  - `ItineraryService.removeItem(Long tripId, Long itemId): void`
  - `ItineraryService.updateItem(Long tripId, Long itemId, UpdateItineraryItemRequest): ItineraryItemResponse`
  - `ItineraryService.moveItem(Long tripId, Long itemId, MoveItineraryItemRequest): ItineraryItemResponse`
  - `ItineraryService.reorderItems(Long tripId, Long dayId, ReorderItineraryItemsRequest): ItineraryDayResponse`
  - `ItineraryService.updateDayStatus(Long tripId, Long dayId, UpdateItineraryDayStatusRequest): ItineraryDayResponse`

- [ ] **Step 1: 실패하는 테스트 작성**

```java
// backend/src/test/java/back/backend/domain/itinerary/service/ItineraryServiceTest.java
package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.entity.*;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.*;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class ItineraryServiceTest {

    @Mock ItineraryDayRepository dayRepository;
    @Mock ItineraryItemRepository itemRepository;
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock TripRepository tripRepository;
    @Mock TripAccessChecker accessChecker;
    @InjectMocks ItineraryService itineraryService;

    private static final Long TRIP_ID = 1L;
    private static final Long MEMBER_ID = 10L;
    private static final Long DAY_ID = 100L;
    private static final Long ITEM_ID = 200L;
    private static final Long TRIP_PLACE_ID = 300L;

    private ItineraryDay day;
    private ItineraryItem item;
    private TripPlace savedTripPlace;
    private Trip trip;

    @BeforeEach
    void setUp() {
        lenient().when(accessChecker.requireEdit(TRIP_ID)).thenReturn(MEMBER_ID);
        lenient().when(accessChecker.requireView(TRIP_ID)).thenReturn(MEMBER_ID);

        trip = mock(Trip.class);
        lenient().when(trip.getStartDate()).thenReturn(null);
        lenient().when(trip.getEndDate()).thenReturn(null);
        lenient().when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));

        day = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 1), 1);
        ReflectionTestUtils.setField(day, "id", DAY_ID);

        item = ItineraryItem.create(day, TRIP_PLACE_ID, 0);
        ReflectionTestUtils.setField(item, "id", ITEM_ID);

        Place place = Place.builder()
                .googlePlaceId("google123")
                .name("테스트 장소")
                .address("서울시")
                .latitude(new BigDecimal("37.5665"))
                .longitude(new BigDecimal("126.9780"))
                .build();

        PlaceCategory category = PlaceCategory.builder()
                .tripId(TRIP_ID)
                .name("음식점")
                .color("#dc2626")
                .icon(PlaceMarkerIcon.UTENSILS)
                .build();

        savedTripPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(place)
                .category(category)
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(savedTripPlace, "id", TRIP_PLACE_ID);
    }

    @Test
    @DisplayName("t1 일정 목록을 dayNumber 순서로 반환한다")
    void t1_getItineraryReturnsDaysOrderedByDayNumber() {
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));

        List<ItineraryDayResponse> result = itineraryService.getItinerary(TRIP_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).dayNumber()).isEqualTo(1);
        assertThat(result.get(0).status()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("t2 여행 날짜가 확정되면 없는 날짜의 Day를 자동 생성한다")
    void t2_getItineraryAutoCreatesMissingDays() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 8, 2));
        given(dayRepository.existsByTripIdAndItineraryDate(TRIP_ID, LocalDate.of(2026, 8, 1))).willReturn(false);
        given(dayRepository.existsByTripIdAndItineraryDate(TRIP_ID, LocalDate.of(2026, 8, 2))).willReturn(false);
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());

        itineraryService.getItinerary(TRIP_ID);

        then(dayRepository).should().saveAll(argThat((Iterable<ItineraryDay> days) -> {
            List<ItineraryDay> list = new ArrayList<>();
            days.forEach(list::add);
            return list.size() == 2
                    && list.get(0).getDayNumber() == 1
                    && list.get(1).getDayNumber() == 2;
        }));
    }

    @Test
    @DisplayName("t3 여행 날짜가 없으면 Day를 자동 생성하지 않는다")
    void t3_getItinerarySkipsAutoCreateWhenNoDates() {
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());

        itineraryService.getItinerary(TRIP_ID);

        then(dayRepository).should(never()).saveAll(any());
    }

    @Test
    @DisplayName("t4 SAVED 장소를 일정에 배치한다")
    void t4_addItemPlacesSavedTripPlace() {
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID)).willReturn(Optional.of(savedTripPlace));
        given(itemRepository.existsByItineraryDayAndTripPlaceId(day, TRIP_PLACE_ID)).willReturn(false);
        given(itemRepository.save(any(ItineraryItem.class))).willAnswer(inv -> inv.getArgument(0));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(any())).willReturn(List.of(savedTripPlace));

        ItineraryDayResponse result = itineraryService.addItem(TRIP_ID, DAY_ID,
                new AddItineraryItemRequest(TRIP_PLACE_ID, 0));

        assertThat(result.id()).isEqualTo(DAY_ID);
        then(itemRepository).should().save(any(ItineraryItem.class));
    }

    @Test
    @DisplayName("t5 SAVED가 아닌 장소는 배치할 수 없다")
    void t5_addItemRejectsNonSavedPlace() {
        TripPlace holdPlace = TripPlace.builder()
                .tripId(TRIP_ID).place(savedTripPlace.getPlace())
                .category(savedTripPlace.getCategory()).addedBy(MEMBER_ID)
                .status(TripPlaceStatus.HOLD).build();
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID)).willReturn(Optional.of(holdPlace));

        assertThatThrownBy(() -> itineraryService.addItem(TRIP_ID, DAY_ID,
                new AddItineraryItemRequest(TRIP_PLACE_ID, 0)))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(ItineraryErrorCode.ITINERARY_PLACE_NOT_SAVED));
    }

    @Test
    @DisplayName("t6 같은 날에 이미 배치된 장소는 중복 배치할 수 없다")
    void t6_addItemRejectsDuplicatePlaceInSameDay() {
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID)).willReturn(Optional.of(savedTripPlace));
        given(itemRepository.existsByItineraryDayAndTripPlaceId(day, TRIP_PLACE_ID)).willReturn(true);

        assertThatThrownBy(() -> itineraryService.addItem(TRIP_ID, DAY_ID,
                new AddItineraryItemRequest(TRIP_PLACE_ID, 0)))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(ItineraryErrorCode.ITINERARY_ITEM_ALREADY_EXISTS));
    }

    @Test
    @DisplayName("t7 일정 항목을 삭제한다")
    void t7_removeItemDeletesItem() {
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID)).willReturn(Optional.of(item));

        itineraryService.removeItem(TRIP_ID, ITEM_ID);

        then(itemRepository).should().delete(item);
    }

    @Test
    @DisplayName("t8 일정 항목을 다른 Day로 이동한다")
    void t8_moveItemTransfersToTargetDay() {
        ItineraryDay targetDay = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 2), 2);
        Long targetDayId = 101L;
        ReflectionTestUtils.setField(targetDay, "id", targetDayId);

        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID)).willReturn(Optional.of(item));
        given(dayRepository.findByIdAndTripId(targetDayId, TRIP_ID)).willReturn(Optional.of(targetDay));
        given(itemRepository.save(any(ItineraryItem.class))).willAnswer(inv -> inv.getArgument(0));
        given(tripPlaceRepository.findAllById(any())).willReturn(List.of(savedTripPlace));

        itineraryService.moveItem(TRIP_ID, ITEM_ID, new MoveItineraryItemRequest(targetDayId, 0));

        then(itemRepository).should().save(item);
    }

    @Test
    @DisplayName("t9 Day 내 항목 순서를 변경한다")
    void t9_reorderItemsUpdatesAllSortOrders() {
        ItineraryItem item2 = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(item2, "id", 201L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(item, item2)));

        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(itemRepository.findById(ITEM_ID)).willReturn(Optional.of(item));
        given(itemRepository.findById(201L)).willReturn(Optional.of(item2));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(any())).willReturn(List.of(savedTripPlace));

        itineraryService.reorderItems(TRIP_ID, DAY_ID, new ReorderItineraryItemsRequest(List.of(201L, ITEM_ID)));

        then(itemRepository).should().save(item2);
        then(itemRepository).should().save(item);
    }

    @Test
    @DisplayName("t10 Day 상태를 CONFIRMED로 전환한다")
    void t10_updateDayStatusConfirmsDay() {
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(dayRepository.save(any(ItineraryDay.class))).willAnswer(inv -> inv.getArgument(0));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(any())).willReturn(List.of());

        ItineraryDayResponse result = itineraryService.updateDayStatus(TRIP_ID, DAY_ID,
                new UpdateItineraryDayStatusRequest("CONFIRMED"));

        assertThat(result.status()).isEqualTo("CONFIRMED");
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.itinerary.service.ItineraryServiceTest" 2>&1 | tail -20
```

Expected: 컴파일 에러 — `ItineraryService` 클래스 없음

- [ ] **Step 3: ItineraryService 구현**

```java
// backend/src/main/java/back/backend/domain/itinerary/service/ItineraryService.java
package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.entity.*;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItineraryService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final ItineraryDayRepository dayRepository;
    private final ItineraryItemRepository itemRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final TripRepository tripRepository;
    private final TripAccessChecker accessChecker;

    @Transactional(readOnly = true)
    public List<ItineraryDayResponse> getItinerary(Long tripId) {
        accessChecker.requireView(tripId);
        initializeMissingDays(tripId);
        return buildDayResponses(tripId);
    }

    @Transactional
    public ItineraryDayResponse addItem(Long tripId, Long dayId, AddItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);

        ItineraryDay day = dayRepository.findByIdAndTripId(dayId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));

        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(request.tripPlaceId(), tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));

        if (tripPlace.getStatus() != TripPlaceStatus.SAVED) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_PLACE_NOT_SAVED);
        }
        if (itemRepository.existsByItineraryDayAndTripPlaceId(day, request.tripPlaceId())) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_ALREADY_EXISTS);
        }

        ItineraryItem item = ItineraryItem.create(day, request.tripPlaceId(), request.sortOrder());
        itemRepository.save(item);

        return buildDayResponses(tripId).stream()
                .filter(d -> d.id().equals(dayId))
                .findFirst()
                .orElseThrow();
    }

    @Transactional
    public void removeItem(Long tripId, Long itemId) {
        accessChecker.requireEdit(tripId);
        ItineraryItem item = itemRepository.findByIdAndTripId(itemId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));
        itemRepository.delete(item);
    }

    @Transactional
    public ItineraryItemResponse updateItem(Long tripId, Long itemId, UpdateItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);
        ItineraryItem item = itemRepository.findByIdAndTripId(itemId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));

        LocalTime startTime = request.startTime() != null ? LocalTime.parse(request.startTime(), TIME_FMT) : null;
        LocalTime endTime = request.endTime() != null ? LocalTime.parse(request.endTime(), TIME_FMT) : null;
        item.updateDetails(startTime, endTime, request.memo(), request.transportMinutes(), request.transportMeters());
        itemRepository.save(item);

        TripPlace tp = item.getTripPlaceId() != null
                ? tripPlaceRepository.findByIdAndTripId(item.getTripPlaceId(), tripId).orElse(null)
                : null;
        return ItineraryItemResponse.from(item, tp);
    }

    @Transactional
    public ItineraryItemResponse moveItem(Long tripId, Long itemId, MoveItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);
        ItineraryItem item = itemRepository.findByIdAndTripId(itemId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));
        ItineraryDay targetDay = dayRepository.findByIdAndTripId(request.targetDayId(), tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));

        item.updateDay(targetDay);
        item.updateSortOrder(request.sortOrder());
        itemRepository.save(item);

        TripPlace tp = item.getTripPlaceId() != null
                ? tripPlaceRepository.findByIdAndTripId(item.getTripPlaceId(), tripId).orElse(null)
                : null;
        return ItineraryItemResponse.from(item, tp);
    }

    @Transactional
    public ItineraryDayResponse reorderItems(Long tripId, Long dayId, ReorderItineraryItemsRequest request) {
        accessChecker.requireEdit(tripId);
        dayRepository.findByIdAndTripId(dayId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));

        List<Long> itemIds = request.itemIds();
        for (int i = 0; i < itemIds.size(); i++) {
            ItineraryItem item = itemRepository.findById(itemIds.get(i))
                    .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));
            item.updateSortOrder(i);
            itemRepository.save(item);
        }

        return buildDayResponses(tripId).stream()
                .filter(d -> d.id().equals(dayId))
                .findFirst()
                .orElseThrow();
    }

    @Transactional
    public ItineraryDayResponse updateDayStatus(Long tripId, Long dayId, UpdateItineraryDayStatusRequest request) {
        accessChecker.requireEdit(tripId);
        ItineraryDay day = dayRepository.findByIdAndTripId(dayId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));

        ItineraryDayStatus status = ItineraryDayStatus.valueOf(request.status());
        day.updateStatus(status);
        dayRepository.save(day);

        return buildDayResponses(tripId).stream()
                .filter(d -> d.id().equals(dayId))
                .findFirst()
                .orElseThrow();
    }

    private void initializeMissingDays(Long tripId) {
        tripRepository.findById(tripId).ifPresent(trip -> {
            LocalDate startDate = trip.getStartDate();
            LocalDate endDate = trip.getEndDate();
            if (startDate == null || endDate == null) return;

            List<LocalDate> dates = startDate.datesUntil(endDate.plusDays(1)).toList();
            List<ItineraryDay> toCreate = new ArrayList<>();
            for (int i = 0; i < dates.size(); i++) {
                LocalDate date = dates.get(i);
                if (!dayRepository.existsByTripIdAndItineraryDate(tripId, date)) {
                    toCreate.add(ItineraryDay.create(tripId, date, i + 1));
                }
            }
            if (!toCreate.isEmpty()) {
                dayRepository.saveAll(toCreate);
            }
        });
    }

    private List<ItineraryDayResponse> buildDayResponses(Long tripId) {
        List<ItineraryDay> days = dayRepository.findAllWithItemsByTripId(tripId);
        Set<Long> tripPlaceIds = days.stream()
                .flatMap(d -> d.getItems().stream())
                .map(ItineraryItem::getTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, TripPlace> tripPlaceMap = tripPlaceIds.isEmpty() ? Map.of() :
                tripPlaceRepository.findAllById(tripPlaceIds).stream()
                        .collect(Collectors.toMap(TripPlace::getId, tp -> tp));

        return days.stream()
                .map(day -> ItineraryDayResponse.from(day, tripPlaceMap))
                .toList();
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.itinerary.service.ItineraryServiceTest"
```

Expected: BUILD SUCCESSFUL, 10 tests passed

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/service/
git add backend/src/test/java/back/backend/domain/itinerary/service/
git commit -m "feat: ItineraryService TDD 구현 (장소 배치, 순서 변경, Day 확정)"
```

---

### Task 5: 백엔드 — ItineraryController (TDD)

**Files:**
- Create: `backend/src/main/java/back/backend/domain/itinerary/controller/ItineraryController.java`
- Create: `backend/src/test/java/back/backend/domain/itinerary/controller/ItineraryControllerTest.java`

**Interfaces:**
- Consumes: `ItineraryService` (Task 4), `ApiResponse`, `GlobalExceptionHandler`
- Produces: REST API endpoints at `/api/trips/{tripId}/itinerary/**`

- [ ] **Step 1: 실패하는 Controller 테스트 작성**

```java
// backend/src/test/java/back/backend/domain/itinerary/controller/ItineraryControllerTest.java
package back.backend.domain.itinerary.controller;

import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.service.ItineraryService;
import back.backend.global.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ItineraryControllerTest {

    @Mock ItineraryService itineraryService;
    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private ItineraryDayResponse dayResponse;
    private ItineraryItemResponse itemResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new ItineraryController(itineraryService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        dayResponse = new ItineraryDayResponse(100L, LocalDate.of(2026, 8, 1), 1, null, "DRAFT", List.of());
        itemResponse = new ItineraryItemResponse(200L, 300L, "테스트 장소", "서울시",
                "음식점", "#dc2626", "UTENSILS", 37.5665, 126.9780,
                null, null, 0, null, null, null);
    }

    @Test
    @DisplayName("t1 여행 일정을 조회하면 200과 day 목록을 반환한다")
    void t1_getItineraryReturns200WithDays() throws Exception {
        given(itineraryService.getItinerary(1L)).willReturn(List.of(dayResponse));

        mockMvc.perform(get("/api/trips/1/itinerary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].dayNumber").value(1))
                .andExpect(jsonPath("$.data[0].status").value("DRAFT"));
    }

    @Test
    @DisplayName("t2 일정에 장소를 배치하면 200과 업데이트된 Day를 반환한다")
    void t2_addItemReturns200WithUpdatedDay() throws Exception {
        given(itineraryService.addItem(eq(1L), eq(100L), any(AddItineraryItemRequest.class)))
                .willReturn(dayResponse);

        mockMvc.perform(post("/api/trips/1/itinerary/days/100/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AddItineraryItemRequest(300L, 0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(100));
    }

    @Test
    @DisplayName("t3 일정 항목을 삭제하면 204를 반환한다")
    void t3_removeItemReturns204() throws Exception {
        willDoNothing().given(itineraryService).removeItem(1L, 200L);

        mockMvc.perform(delete("/api/trips/1/itinerary/items/200"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("t4 일정 항목을 수정하면 200과 업데이트된 item을 반환한다")
    void t4_updateItemReturns200() throws Exception {
        given(itineraryService.updateItem(eq(1L), eq(200L), any(UpdateItineraryItemRequest.class)))
                .willReturn(itemResponse);

        mockMvc.perform(patch("/api/trips/1/itinerary/items/200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateItineraryItemRequest("09:00", "10:00", "메모", 30, 500))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(200));
    }

    @Test
    @DisplayName("t5 일정 항목을 다른 Day로 이동하면 200을 반환한다")
    void t5_moveItemReturns200() throws Exception {
        given(itineraryService.moveItem(eq(1L), eq(200L), any(MoveItineraryItemRequest.class)))
                .willReturn(itemResponse);

        mockMvc.perform(patch("/api/trips/1/itinerary/items/200/move")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MoveItineraryItemRequest(101L, 0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(200));
    }

    @Test
    @DisplayName("t6 Day 내 항목 순서를 변경하면 200과 업데이트된 Day를 반환한다")
    void t6_reorderItemsReturns200() throws Exception {
        given(itineraryService.reorderItems(eq(1L), eq(100L), any(ReorderItineraryItemsRequest.class)))
                .willReturn(dayResponse);

        mockMvc.perform(patch("/api/trips/1/itinerary/days/100/items/reorder")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReorderItineraryItemsRequest(List.of(201L, 200L)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(100));
    }

    @Test
    @DisplayName("t7 Day 상태를 변경하면 200과 업데이트된 Day를 반환한다")
    void t7_updateDayStatusReturns200() throws Exception {
        ItineraryDayResponse confirmed = new ItineraryDayResponse(100L, LocalDate.of(2026, 8, 1), 1, null, "CONFIRMED", List.of());
        given(itineraryService.updateDayStatus(eq(1L), eq(100L), any(UpdateItineraryDayStatusRequest.class)))
                .willReturn(confirmed);

        mockMvc.perform(patch("/api/trips/1/itinerary/days/100/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateItineraryDayStatusRequest("CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.itinerary.controller.ItineraryControllerTest" 2>&1 | tail -10
```

Expected: 컴파일 에러 — `ItineraryController` 없음

- [ ] **Step 3: ItineraryController 구현**

```java
// backend/src/main/java/back/backend/domain/itinerary/controller/ItineraryController.java
package back.backend.domain.itinerary.controller;

import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.service.ItineraryService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/itinerary")
@RequiredArgsConstructor
public class ItineraryController {

    private final ItineraryService itineraryService;

    @GetMapping
    public ApiResponse<List<ItineraryDayResponse>> getItinerary(@PathVariable Long tripId) {
        return ApiResponse.success(itineraryService.getItinerary(tripId));
    }

    @PostMapping("/days/{dayId}/items")
    public ApiResponse<ItineraryDayResponse> addItem(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid AddItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.addItem(tripId, dayId, request));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> removeItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId) {
        itineraryService.removeItem(tripId, itemId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/items/{itemId}")
    public ApiResponse<ItineraryItemResponse> updateItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId,
            @RequestBody UpdateItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.updateItem(tripId, itemId, request));
    }

    @PatchMapping("/items/{itemId}/move")
    public ApiResponse<ItineraryItemResponse> moveItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId,
            @RequestBody @Valid MoveItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.moveItem(tripId, itemId, request));
    }

    @PatchMapping("/days/{dayId}/items/reorder")
    public ApiResponse<ItineraryDayResponse> reorderItems(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid ReorderItineraryItemsRequest request) {
        return ApiResponse.success(itineraryService.reorderItems(tripId, dayId, request));
    }

    @PatchMapping("/days/{dayId}/status")
    public ApiResponse<ItineraryDayResponse> updateDayStatus(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid UpdateItineraryDayStatusRequest request) {
        return ApiResponse.success(itineraryService.updateDayStatus(tripId, dayId, request));
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && ./gradlew test --tests "back.backend.domain.itinerary.controller.ItineraryControllerTest"
```

Expected: BUILD SUCCESSFUL, 7 tests passed

- [ ] **Step 5: 전체 테스트 실행**

```bash
cd backend && ./gradlew test
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/back/backend/domain/itinerary/controller/
git add backend/src/test/java/back/backend/domain/itinerary/controller/
git commit -m "feat: ItineraryController TDD 구현 (일정 CRUD API 7개)"
```

---

### Task 6: 프런트엔드 — 타입 추가, API 클라이언트, dnd-kit 설치

**Files:**
- Modify: `frontend/src/entities/trip/model/types.ts` (ItineraryDay, ItineraryItem 타입 추가)
- Create: `frontend/src/entities/trip/api/itineraryApi.ts`
- Modify: `frontend/src/entities/trip/index.ts` (신규 export 추가)
- Install: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Interfaces:**
- Consumes: 백엔드 API `GET/POST/PATCH/DELETE /api/trips/{tripId}/itinerary/**`
- Produces:
  - `ItineraryDay`, `ItineraryItem`, `ItineraryDayStatus` 타입
  - `getItinerary(tripId): Promise<ItineraryDay[]>`
  - `addItineraryItem(tripId, dayId, tripPlaceId, sortOrder): Promise<ItineraryDay>`
  - `removeItineraryItem(tripId, itemId): Promise<void>`
  - `updateItineraryItem(tripId, itemId, data): Promise<ItineraryItem>`
  - `moveItineraryItem(tripId, itemId, targetDayId, sortOrder): Promise<ItineraryItem>`
  - `reorderItineraryItems(tripId, dayId, itemIds): Promise<ItineraryDay>`
  - `updateItineraryDayStatus(tripId, dayId, status): Promise<ItineraryDay>`

- [ ] **Step 1: dnd-kit 설치**

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: types.ts에 Itinerary 타입 추가**

`frontend/src/entities/trip/model/types.ts` 파일을 열고 맨 아래에 추가:

```typescript
export type ItineraryDayStatus = 'DRAFT' | 'CONFIRMED'

export type ItineraryItem = {
  id: string
  tripPlaceId: string | null
  placeName: string | null
  placeAddress: string | null
  categoryName: string | null
  categoryColor: string | null
  categoryIcon: string | null
  lat: number
  lng: number
  startTime: string | null
  endTime: string | null
  sortOrder: number
  transportMinutes: number | null
  transportMeters: number | null
  memo: string | null
}

export type ItineraryDay = {
  id: string
  itineraryDate: string
  dayNumber: number
  title: string | null
  status: ItineraryDayStatus
  items: ItineraryItem[]
}
```

- [ ] **Step 3: itineraryApi.ts 작성**

```typescript
// frontend/src/entities/trip/api/itineraryApi.ts
import { apiClient } from '@/shared/api/client'
import type { ItineraryDay, ItineraryDayStatus, ItineraryItem } from '../model/types'

type UpdateItineraryItemData = {
  startTime?: string | null
  endTime?: string | null
  memo?: string | null
  transportMinutes?: number | null
  transportMeters?: number | null
}

export async function getItinerary(tripId: number): Promise<ItineraryDay[]> {
  const res = await apiClient.get<ItineraryDay[]>(`/api/trips/${tripId}/itinerary`)
  return res.data
}

export async function addItineraryItem(
  tripId: number,
  dayId: number,
  tripPlaceId: number,
  sortOrder: number,
): Promise<ItineraryDay> {
  const res = await apiClient.post<ItineraryDay>(
    `/api/trips/${tripId}/itinerary/days/${dayId}/items`,
    { tripPlaceId, sortOrder },
  )
  return res.data
}

export async function removeItineraryItem(tripId: number, itemId: number): Promise<void> {
  await apiClient.delete(`/api/trips/${tripId}/itinerary/items/${itemId}`)
}

export async function updateItineraryItem(
  tripId: number,
  itemId: number,
  data: UpdateItineraryItemData,
): Promise<ItineraryItem> {
  const res = await apiClient.patch<ItineraryItem>(
    `/api/trips/${tripId}/itinerary/items/${itemId}`,
    data,
  )
  return res.data
}

export async function moveItineraryItem(
  tripId: number,
  itemId: number,
  targetDayId: number,
  sortOrder: number,
): Promise<ItineraryItem> {
  const res = await apiClient.patch<ItineraryItem>(
    `/api/trips/${tripId}/itinerary/items/${itemId}/move`,
    { targetDayId, sortOrder },
  )
  return res.data
}

export async function reorderItineraryItems(
  tripId: number,
  dayId: number,
  itemIds: number[],
): Promise<ItineraryDay> {
  const res = await apiClient.patch<ItineraryDay>(
    `/api/trips/${tripId}/itinerary/days/${dayId}/items/reorder`,
    { itemIds },
  )
  return res.data
}

export async function updateItineraryDayStatus(
  tripId: number,
  dayId: number,
  status: ItineraryDayStatus,
): Promise<ItineraryDay> {
  const res = await apiClient.patch<ItineraryDay>(
    `/api/trips/${tripId}/itinerary/days/${dayId}/status`,
    { status },
  )
  return res.data
}
```

- [ ] **Step 4: apiClient 패턴 확인 후 필요 시 수정**

기존 `frontend/src/shared/api/client.ts` 파일을 읽어 `apiClient.get<T>()` 등 메서드 이름이 맞는지 확인하고, 필요하면 패턴에 맞게 `itineraryApi.ts` 수정.

- [ ] **Step 5: entities/trip/index.ts에 export 추가**

`frontend/src/entities/trip/index.ts` 파일을 열어 기존 export 목록 끝에 추가:

```typescript
export {
  getItinerary,
  addItineraryItem,
  removeItineraryItem,
  updateItineraryItem,
  moveItineraryItem,
  reorderItineraryItems,
  updateItineraryDayStatus,
} from './api/itineraryApi'
export type { ItineraryDay, ItineraryItem, ItineraryDayStatus } from './model/types'
```

- [ ] **Step 6: TypeScript 타입 체크**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: 새로 추가한 파일에서 타입 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/entities/trip/ frontend/package.json frontend/package-lock.json
git commit -m "feat: Itinerary 타입, API 클라이언트, dnd-kit 추가"
```

---

### Task 7: 프런트엔드 — date-vote-panel 리네임 + SchedulePanel 골격

**Files:**
- Rename: `widgets/trip-room/ui/itinerary-panel.tsx` → `widgets/trip-room/ui/date-vote-panel.tsx` (export 이름도 `DateVotePanel`로 변경)
- Create: `frontend/src/widgets/trip-room/ui/schedule-panel.tsx`
- Modify: `frontend/src/widgets/trip-room/index.ts` (export 갱신)
- Modify: `frontend/src/widgets/trip-room/ui/room-detail-panel.tsx` (import 수정)

**Interfaces:**
- Consumes: `getItinerary`, `ItineraryDay`, `Room` (room.startDate, room.endDate)
- Produces: `<SchedulePanel tripId canWrite room>` — 날짜 있으면 Day 목록, 없으면 "날짜를 먼저 확정해주세요" 안내
- Produces: `<DateVotePanel>` — 기존 날짜 투표 UI (내용 변경 없음)

- [ ] **Step 1: itinerary-panel.tsx를 date-vote-panel.tsx로 복사**

파일 이름을 바꾸고 컴포넌트 이름도 변경:
- `export function ItineraryPanel(` → `export function DateVotePanel(`
- 파일 경로: `widgets/trip-room/ui/date-vote-panel.tsx`

```bash
cp frontend/src/widgets/trip-room/ui/itinerary-panel.tsx \
   frontend/src/widgets/trip-room/ui/date-vote-panel.tsx
```

그 다음 `date-vote-panel.tsx`를 열고 `ItineraryPanel` → `DateVotePanel` 로 export 이름 수정.

- [ ] **Step 2: schedule-panel.tsx 작성**

```tsx
// frontend/src/widgets/trip-room/ui/schedule-panel.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { getItinerary } from '@/entities/trip'
import type { ItineraryDay, Place, Room } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { DayColumn } from './day-column'

type Props = {
  tripId: number
  room: Room
  places: Place[]
  canWrite: boolean
}

export function SchedulePanel({ tripId, room, places, canWrite }: Props) {
  const [days, setDays] = useState<ItineraryDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getItinerary(tripId)
      .then((data) => {
        if (!active) return
        setDays(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(getApiErrorMessage(err, '일정을 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [tripId])

  if (!room.startDate || !room.endDate) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">
        여행 날짜를 먼저 확정해주세요.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">
        일정을 불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-red-500">
        {error}
      </div>
    )
  }

  const savedPlaceIds = new Set(
    days.flatMap((d) => d.items.map((i) => i.tripPlaceId)).filter(Boolean),
  )
  const unplacedPlaces = places.filter(
    (p) => p.status === 'saved' && !savedPlaceIds.has(p.id),
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      {unplacedPlaces.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-bold text-slate-500">배치 가능한 장소</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unplacedPlaces.map((place) => (
              <div
                key={place.id}
                className="flex min-w-[120px] flex-col rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm"
              >
                <span className="truncate font-semibold text-slate-700">{place.name}</span>
                <span className="truncate text-slate-400">{place.address}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {days.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          일정이 없습니다.
        </div>
      ) : (
        days.map((day) => (
          <DayColumn
            key={day.id}
            day={day}
            tripId={tripId}
            canWrite={canWrite}
            onDaysChange={setDays}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 3: day-column.tsx 작성 (드래그 없는 기초 버전)**

```tsx
// frontend/src/widgets/trip-room/ui/day-column.tsx
'use client'

import React, { useState } from 'react'
import { CheckCircleIcon, CircleIcon } from 'lucide-react'
import { updateItineraryDayStatus } from '@/entities/trip'
import type { ItineraryDay } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { ScheduleItemCard } from './schedule-item-card'

type Props = {
  day: ItineraryDay
  tripId: number
  canWrite: boolean
  onDaysChange: (updater: (prev: ItineraryDay[]) => ItineraryDay[]) => void
}

export function DayColumn({ day, tripId, canWrite, onDaysChange }: Props) {
  const [error, setError] = useState<string | null>(null)

  const isConfirmed = day.status === 'CONFIRMED'
  const dateLabel = new Date(day.itineraryDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  async function toggleStatus() {
    if (!canWrite) return
    const next = isConfirmed ? 'DRAFT' : 'CONFIRMED'
    try {
      const updated = await updateItineraryDayStatus(tripId, Number(day.id), next)
      onDaysChange((prev) => prev.map((d) => (d.id === day.id ? updated : d)))
      setError(null)
    } catch (err) {
      setError(getApiErrorMessage(err, '상태 변경에 실패했습니다.'))
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <span className="text-xs font-extrabold text-brand">Day {day.dayNumber}</span>
          <span className="ml-2 text-xs text-slate-500">{dateLabel}</span>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => void toggleStatus()}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition hover:bg-slate-100"
          >
            {isConfirmed ? (
              <><CheckCircleIcon size={14} className="text-brand" /> 확정됨</>
            ) : (
              <><CircleIcon size={14} className="text-slate-400" /> 확정하기</>
            )}
          </button>
        )}
      </div>

      {error && <p className="px-3 pb-1 text-xs text-red-500">{error}</p>}

      <div className="flex flex-col gap-1 px-3 pb-3">
        {day.items.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            장소를 여기에 배치하세요
          </p>
        ) : (
          day.items.map((item) => (
            <ScheduleItemCard
              key={item.id}
              item={item}
              tripId={tripId}
              dayId={day.id}
              canWrite={canWrite}
              onDaysChange={onDaysChange}
            />
          ))
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: schedule-item-card.tsx 작성**

```tsx
// frontend/src/widgets/trip-room/ui/schedule-item-card.tsx
'use client'

import React, { useState } from 'react'
import { Trash2Icon } from 'lucide-react'
import { removeItineraryItem, updateItineraryItem, getItinerary } from '@/entities/trip'
import type { ItineraryDay, ItineraryItem } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'

type Props = {
  item: ItineraryItem
  tripId: number
  dayId: string
  canWrite: boolean
  onDaysChange: (updater: (prev: ItineraryDay[]) => ItineraryDay[]) => void
}

export function ScheduleItemCard({ item, tripId, canWrite, onDaysChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [startTime, setStartTime] = useState(item.startTime ?? '')
  const [endTime, setEndTime] = useState(item.endTime ?? '')
  const [memo, setMemo] = useState(item.memo ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!canWrite) return
    try {
      await removeItineraryItem(tripId, Number(item.id))
      const updated = await getItinerary(tripId)
      onDaysChange(() => updated)
    } catch (err) {
      setError(getApiErrorMessage(err, '삭제에 실패했습니다.'))
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateItineraryItem(tripId, Number(item.id), {
        startTime: startTime || null,
        endTime: endTime || null,
        memo: memo || null,
      })
      const updated = await getItinerary(tripId)
      onDaysChange(() => updated)
      setEditing(false)
      setError(null)
    } catch (err) {
      setError(getApiErrorMessage(err, '저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-slate-700">
            {item.placeName ?? '(제목 없음)'}
          </span>
          {(item.startTime || item.endTime) && (
            <span className="text-slate-400">
              {item.startTime ?? '--:--'} ~ {item.endTime ?? '--:--'}
            </span>
          )}
          {item.memo && <span className="truncate text-slate-500">{item.memo}</span>}
        </div>
        {canWrite && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="rounded px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              {editing ? '닫기' : '편집'}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2Icon size={12} />
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-0.5">
              <span className="text-slate-400">시작</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded border border-slate-200 px-1 py-0.5 text-xs"
              />
            </label>
            <label className="flex flex-1 flex-col gap-0.5">
              <span className="text-slate-400">종료</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded border border-slate-200 px-1 py-0.5 text-xs"
              />
            </label>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 입력..."
            rows={2}
            className="rounded border border-slate-200 px-1 py-0.5 text-xs resize-none"
          />
          {error && <p className="text-red-500">{error}</p>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-brand py-1 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: room-detail-panel.tsx import 수정**

`room-detail-panel.tsx` 파일 상단의 import를 수정:

```typescript
// 변경 전
import { ItineraryPanel } from './itinerary-panel'

// 변경 후
import { DateVotePanel } from './date-vote-panel'
import { SchedulePanel } from './schedule-panel'
```

그리고 `planTab === 'itinerary'` 렌더링 부분 수정:

```tsx
// 변경 전
{mode === 'plan' && planTab === 'itinerary' && (
    <ItineraryPanel
        tripId={tripId}
        canWrite={canPlanWrite}
        onDirtyChange={setDateAvailabilityDirty}
        onCollaborationChanged={refreshCollaborationData}
        onTripDatesChanged={onTripDatesChanged}
    />
)}

// 변경 후
{mode === 'plan' && planTab === 'itinerary' && room.startDate && room.endDate && (
    <SchedulePanel
        tripId={tripId}
        room={room}
        places={places}
        canWrite={canPlanWrite}
    />
)}
{mode === 'plan' && planTab === 'itinerary' && !(room.startDate && room.endDate) && (
    <DateVotePanel
        tripId={tripId}
        canWrite={canPlanWrite}
        onDirtyChange={setDateAvailabilityDirty}
        onCollaborationChanged={refreshCollaborationData}
        onTripDatesChanged={onTripDatesChanged}
    />
)}
```

- [ ] **Step 6: 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: 타입 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/widgets/trip-room/ui/
git commit -m "feat: SchedulePanel 기초 UI 추가, date-vote-panel 리네임"
```

---

### Task 8: 프런트엔드 — 드래그앤드롭 (place 배치 + day 내 순서 변경 + day 간 이동)

**Files:**
- Modify: `frontend/src/widgets/trip-room/ui/schedule-panel.tsx` (DnD 컨텍스트 추가)
- Modify: `frontend/src/widgets/trip-room/ui/day-column.tsx` (droppable 적용)
- Modify: `frontend/src/widgets/trip-room/ui/schedule-item-card.tsx` (draggable 적용)

**Interfaces:**
- Consumes: `@dnd-kit/core` (`DndContext`, `DragOverlay`, `closestCenter`), `@dnd-kit/sortable` (`SortableContext`, `useSortable`, `verticalListSortingStrategy`)
- Produces: 장소를 Day에 드롭하면 `addItineraryItem` 호출, Day 내 순서 변경 시 `reorderItineraryItems` 호출, Day 간 이동 시 `moveItineraryItem` 호출

- [ ] **Step 1: schedule-panel.tsx에 DnD 컨텍스트 추가**

`schedule-panel.tsx` 전체를 아래로 교체:

```tsx
// frontend/src/widgets/trip-room/ui/schedule-panel.tsx
'use client'

import React, { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  addItineraryItem,
  getItinerary,
  moveItineraryItem,
  reorderItineraryItems,
} from '@/entities/trip'
import type { ItineraryDay, ItineraryItem, Place, Room } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { DayColumn } from './day-column'

type Props = {
  tripId: number
  room: Room
  places: Place[]
  canWrite: boolean
}

export function SchedulePanel({ tripId, room, places, canWrite }: Props) {
  const [days, setDays] = useState<ItineraryDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<ItineraryItem | null>(null)
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    let active = true
    setLoading(true)
    getItinerary(tripId)
      .then((data) => { if (active) { setDays(data); setError(null) } })
      .catch((err: unknown) => { if (active) setError(getApiErrorMessage(err, '일정을 불러오지 못했습니다.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tripId])

  if (!room.startDate || !room.endDate) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">
        여행 날짜를 먼저 확정해주세요.
      </div>
    )
  }
  if (loading) return <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">일정을 불러오는 중...</div>
  if (error) return <div className="flex flex-1 items-center justify-center p-6 text-sm text-red-500">{error}</div>

  const savedPlaceIds = new Set(days.flatMap((d) => d.items.map((i) => i.tripPlaceId)).filter(Boolean))
  const unplacedPlaces = places.filter((p) => p.status === 'saved' && !savedPlaceIds.has(p.id))

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const idStr = String(active.id)
    if (idStr.startsWith('place-')) {
      setActivePlaceId(idStr.replace('place-', ''))
      return
    }
    for (const day of days) {
      const found = day.items.find((i) => i.id === idStr)
      if (found) { setActiveItem(found); return }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveItem(null)
    setActivePlaceId(null)
    if (!over || !canWrite) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // 미배치 장소 → Day에 드롭
    if (activeId.startsWith('place-')) {
      const placeId = activeId.replace('place-', '')
      const targetDay = days.find((d) => d.id === overId || d.items.some((i) => i.id === overId))
      if (!targetDay) return
      const sortOrder = targetDay.items.length
      try {
        const updated = await addItineraryItem(tripId, Number(targetDay.id), Number(placeId), sortOrder)
        setDays((prev) => prev.map((d) => (d.id === targetDay.id ? updated : d)))
      } catch (err) {
        setError(getApiErrorMessage(err, '장소 배치에 실패했습니다.'))
      }
      return
    }

    // item → item (같은 Day 내 순서 변경 또는 다른 Day로 이동)
    const sourceDay = days.find((d) => d.items.some((i) => i.id === activeId))
    const targetDay = days.find((d) => d.id === overId || d.items.some((i) => i.id === overId))
    if (!sourceDay || !targetDay) return

    if (sourceDay.id === targetDay.id) {
      // 같은 Day 내 순서 변경
      const oldIndex = sourceDay.items.findIndex((i) => i.id === activeId)
      const newIndex = sourceDay.items.findIndex((i) => i.id === overId)
      if (oldIndex === newIndex) return

      const reordered = [...sourceDay.items]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      const itemIds = reordered.map((i) => Number(i.id))

      setDays((prev) =>
        prev.map((d) =>
          d.id === sourceDay.id
            ? { ...d, items: reordered.map((item, idx) => ({ ...item, sortOrder: idx })) }
            : d,
        ),
      )

      try {
        await reorderItineraryItems(tripId, Number(sourceDay.id), itemIds)
      } catch (err) {
        setError(getApiErrorMessage(err, '순서 변경에 실패했습니다.'))
        const restored = await getItinerary(tripId)
        setDays(restored)
      }
    } else {
      // 다른 Day로 이동
      const sortOrder = targetDay.items.length
      setDays((prev) =>
        prev.map((d) => {
          if (d.id === sourceDay.id) return { ...d, items: d.items.filter((i) => i.id !== activeId) }
          if (d.id === targetDay.id) return { ...d, items: [...d.items, { ...sourceDay.items.find((i) => i.id === activeId)!, sortOrder }] }
          return d
        }),
      )

      try {
        await moveItineraryItem(tripId, Number(activeId), Number(targetDay.id), sortOrder)
      } catch (err) {
        setError(getApiErrorMessage(err, '이동에 실패했습니다.'))
        const restored = await getItinerary(tripId)
        setDays(restored)
      }
    }
  }

  const activeDragPlace = activePlaceId ? unplacedPlaces.find((p) => p.id === activePlaceId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={(e) => void handleDragEnd(e)}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {unplacedPlaces.length > 0 && (
          <section>
            <p className="mb-2 text-xs font-bold text-slate-500">배치 가능한 장소</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {unplacedPlaces.map((place) => (
                <UnplacedPlaceChip key={place.id} place={place} />
              ))}
            </div>
          </section>
        )}
        {days.map((day) => (
          <DayColumn
            key={day.id}
            day={day}
            tripId={tripId}
            canWrite={canWrite}
            onDaysChange={setDays}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem && (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-lg">
            {activeItem.placeName}
          </div>
        )}
        {activeDragPlace && (
          <div className="rounded-lg border border-brand bg-white px-3 py-2 text-xs font-semibold shadow-lg">
            {activeDragPlace.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function UnplacedPlaceChip({ place }: { place: Place }) {
  const { attributes, listeners, setNodeRef, isDragging } = require('@dnd-kit/sortable').useDraggable
    ? { attributes: {}, listeners: {}, setNodeRef: () => {}, isDragging: false }
    : { attributes: {}, listeners: {}, setNodeRef: () => {}, isDragging: false }
  // useDraggable은 @dnd-kit/core에서 import
  return (
    <div
      className={`flex min-w-[120px] cursor-grab flex-col rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <span className="truncate font-semibold text-slate-700">{place.name}</span>
      <span className="truncate text-slate-400">{place.address}</span>
    </div>
  )
}
```

> **Note:** `UnplacedPlaceChip`의 `useDraggable`은 `@dnd-kit/core`에서 import해야 한다. 위 코드에서 임시로 처리된 부분을 아래 Step 2에서 올바르게 수정한다.

- [ ] **Step 2: UnplacedPlaceChip을 useDraggable로 올바르게 구현**

`schedule-panel.tsx`의 `UnplacedPlaceChip`을 다음으로 교체:

```tsx
import { useDraggable } from '@dnd-kit/core'

function UnplacedPlaceChip({ place }: { place: Place }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `place-${place.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex min-w-[120px] cursor-grab flex-col rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <span className="truncate font-semibold text-slate-700">{place.name}</span>
      <span className="truncate text-slate-400">{place.address}</span>
    </div>
  )
}
```

- [ ] **Step 3: day-column.tsx에 SortableContext + useDroppable 추가**

`day-column.tsx` 전체를 아래로 교체:

```tsx
// frontend/src/widgets/trip-room/ui/day-column.tsx
'use client'

import React, { useState } from 'react'
import { CheckCircleIcon, CircleIcon } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { updateItineraryDayStatus } from '@/entities/trip'
import type { ItineraryDay } from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'
import { ScheduleItemCard } from './schedule-item-card'

type Props = {
  day: ItineraryDay
  tripId: number
  canWrite: boolean
  onDaysChange: (days: ItineraryDay[]) => void
}

export function DayColumn({ day, tripId, canWrite, onDaysChange }: Props) {
  const [error, setError] = useState<string | null>(null)
  const { setNodeRef, isOver } = useDroppable({ id: day.id })

  const isConfirmed = day.status === 'CONFIRMED'
  const dateLabel = new Date(day.itineraryDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

  async function toggleStatus() {
    if (!canWrite) return
    const next = isConfirmed ? 'DRAFT' : 'CONFIRMED'
    try {
      const updated = await updateItineraryDayStatus(tripId, Number(day.id), next)
      onDaysChange(([] as ItineraryDay[]).concat()) // onDaysChange receives ItineraryDay[]
      // reload from parent via callback — parent holds the full list
      setError(null)
    } catch (err) {
      setError(getApiErrorMessage(err, '상태 변경에 실패했습니다.'))
    }
  }

  return (
    <section
      className={`rounded-xl border bg-white shadow-sm transition ${isOver ? 'border-brand bg-brand/5' : 'border-slate-200'}`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <span className="text-xs font-extrabold text-brand">Day {day.dayNumber}</span>
          <span className="ml-2 text-xs text-slate-500">{dateLabel}</span>
        </div>
        {canWrite && (
          <button type="button" onClick={() => void toggleStatus()}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-slate-100">
            {isConfirmed
              ? <><CheckCircleIcon size={14} className="text-brand" /> 확정됨</>
              : <><CircleIcon size={14} className="text-slate-400" /> 확정하기</>}
          </button>
        )}
      </div>
      {error && <p className="px-3 pb-1 text-xs text-red-500">{error}</p>}

      <div ref={setNodeRef} className="flex min-h-[48px] flex-col gap-1 px-3 pb-3">
        <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {day.items.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">장소를 여기에 드롭하세요</p>
          ) : (
            day.items.map((item) => (
              <ScheduleItemCard
                key={item.id}
                item={item}
                tripId={tripId}
                dayId={day.id}
                canWrite={canWrite}
                onDaysChange={onDaysChange}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  )
}
```

> **Note:** `onDaysChange` 타입이 Task 7과 달라졌다 (`(updater: ...) => void` → `(days: ItineraryDay[]) => void`). Task 7의 `schedule-item-card.tsx`도 아래 Step 4에서 함께 수정한다.

- [ ] **Step 4: schedule-item-card.tsx의 onDaysChange 타입 수정 + useSortable 추가**

`schedule-item-card.tsx`의 Props 타입과 draggable 부분을 수정:

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Props 타입 변경
type Props = {
  item: ItineraryItem
  tripId: number
  dayId: string
  canWrite: boolean
  onDaysChange: (days: ItineraryDay[]) => void  // updater 대신 직접 days 배열
}

// 컴포넌트 내부 맨 위에 추가
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
const style = { transform: CSS.Transform.toString(transform), transition }

// 최상위 div에 ref/style 적용
<div
  ref={setNodeRef}
  style={style}
  {...attributes}
  className={`rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
>
  {/* drag handle */}
  <div {...listeners} className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-slate-300 active:cursor-grabbing">⠿</div>
  ...
```

또한 `handleDelete`와 `handleSave` 안의 `onDaysChange(() => updated)` → `onDaysChange(updated)` 로 변경.

- [ ] **Step 5: 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: 타입 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/widgets/trip-room/ui/
git commit -m "feat: 일정 드래그앤드롭 구현 (장소 배치, 순서 변경, Day 간 이동)"
```

---

## 스펙 검토 체크리스트

| 스펙 요구사항 | 담당 Task |
|---|---|
| 여행 시작일~종료일 기준 Day 자동 생성 | Task 4 (Service: initializeMissingDays) |
| SAVED 장소만 배치 가능 | Task 4 (t5 테스트) |
| 드래그앤드롭으로 Day·순서 배치 | Task 8 |
| 시간·메모·이동시간·이동거리 기록 | Task 3 (DTO), Task 7 (ScheduleItemCard) |
| 순서 변경 시 Day 내 전체 재계산 | Task 4 (reorderItems), Task 8 (handleDragEnd) |
| 다른 Day로 이동 지원 | Task 4 (moveItem), Task 8 |
| Day "확정" 상태 전환 | Task 4 (t10), Task 7 (DayColumn toggleStatus) |
| 같은 시간대 중복 경고 (강제 차단 아님) | 미구현 — 추후 ScheduleItemCard 편집 시 endTime > startTime 검증으로 추가 가능 |
| 영업시간 외 경고 | 미구현 — 영업시간 데이터 없음, 추후 과제 |
| transport_meters 컬럼 | Task 1 |
