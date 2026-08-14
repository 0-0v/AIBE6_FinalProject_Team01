package back.backend.domain.itinerary.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.*;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.*;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.place.service.GooglePlaceContentRefreshService;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.inOrder;

@ExtendWith(MockitoExtension.class)
class ItineraryServiceTest {

    @Mock ItineraryDayRepository dayRepository;
    @Mock ItineraryItemRepository itemRepository;
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock TripRepository tripRepository;
    @Mock TripAccessChecker accessChecker;
    @Mock ItineraryRoutePlanner routePlanner;
    @Mock ItineraryTravelEstimator travelEstimator;
    @Mock EntityManager entityManager;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock ActivityLogService activityLogService;
    @Mock GooglePlaceContentRefreshService googlePlaceContentRefreshService;
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
        lenient().when(accessChecker.requireMember(TRIP_ID)).thenReturn(MEMBER_ID);
        lenient().when(accessChecker.requireView(TRIP_ID)).thenReturn(MEMBER_ID);
        lenient().when(googlePlaceContentRefreshService.ensureFresh(any(Place.class)))
                .thenReturn(true);

        trip = mock(Trip.class);
        lenient().when(trip.getStartDate()).thenReturn(null);
        lenient().when(trip.getEndDate()).thenReturn(null);
        lenient().when(tripRepository.findByIdForItineraryInitialization(TRIP_ID))
                .thenReturn(Optional.of(trip));
        lenient().when(tripRepository.findById(TRIP_ID))
                .thenReturn(Optional.of(trip));
        lenient().when(tripRepository.findByIdForUpdate(TRIP_ID))
                .thenReturn(Optional.of(trip));
        lenient().when(trip.getTravelStyles()).thenReturn(Set.of());

        day = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 1), 1);
        ReflectionTestUtils.setField(day, "id", DAY_ID);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>());

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
                .markerColor("#dc2626")
                .markerIcon(PlaceMarkerIcon.UTENSILS)
                .sortOrder(0)
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
    @DisplayName("t2 여행 날짜가 확정되면 없는 날짜의 Day를 자동 생성하고 dayNumber를 재부여한다")
    void t2_initializeItineraryAutoCreatesMissingDays() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 8, 2));
        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID)).willReturn(new ArrayList<>());
        given(dayRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());

        itineraryService.initializeItinerary(TRIP_ID);

        ArgumentCaptor<Iterable<ItineraryDay>> daysCaptor = ArgumentCaptor.forClass(Iterable.class);
        then(dayRepository).should().saveAll(daysCaptor.capture());
        assertThat(daysCaptor.getValue())
                .extracting(ItineraryDay::getDayNumber)
                .containsExactly(1, 2);
    }

    @Test
    @DisplayName("t3 여행 날짜가 없으면 Day를 자동 생성하지 않는다")
    void t3_initializeItinerarySkipsAutoCreateWhenNoDates() {
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());

        itineraryService.initializeItinerary(TRIP_ID);

        then(dayRepository).should(never()).saveAll(any());
    }

    @Test
    @DisplayName("t4 SAVED 장소를 일정에 배치한다")
    void t4_addItemPlacesSavedTripPlace() {
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID)).willReturn(Optional.of(savedTripPlace));
        given(itemRepository.existsByItineraryDayTripIdAndTripPlaceId(TRIP_ID, TRIP_PLACE_ID))
                .willReturn(false);
        given(itemRepository.save(any(ItineraryItem.class))).willAnswer(inv -> inv.getArgument(0));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));

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
        given(itemRepository.existsByItineraryDayTripIdAndTripPlaceId(TRIP_ID, TRIP_PLACE_ID))
                .willReturn(true);

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
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID)).willReturn(Optional.of(savedTripPlace));

        ItineraryItemResponse result = itineraryService.moveItem(TRIP_ID, ITEM_ID,
                new MoveItineraryItemRequest(targetDayId, 0));

        assertThat(result.id()).isEqualTo(ITEM_ID);
        assertThat(item.getItineraryDay()).isEqualTo(targetDay);
    }

    @Test
    @DisplayName("t9 Day 내 항목 순서를 변경한다")
    void t9_reorderItemsUpdatesAllSortOrders() {
        ItineraryItem item2 = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(item2, "id", 201L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(item, item2)));

        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item, item2));
        given(itemRepository.saveAllAndFlush(anyList())).willAnswer(inv -> inv.getArgument(0));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(any())).willReturn(List.of(savedTripPlace));

        ItineraryDayResponse result = itineraryService.reorderItems(TRIP_ID, DAY_ID,
                new ReorderItineraryItemsRequest(List.of(201L, ITEM_ID)));

        assertThat(result.id()).isEqualTo(DAY_ID);
        then(itemRepository).should(times(2)).saveAllAndFlush(anyList());
    }

    @Test
    @DisplayName("t10 Day 상태를 CONFIRMED로 전환하면 활동 로그가 기록된다")
    void t10_updateDayStatusConfirmsDayAndLogsActivity() {
        given(accessChecker.requireMember(TRIP_ID)).willReturn(MEMBER_ID);
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));

        ItineraryDayResponse result = itineraryService.updateDayStatus(TRIP_ID, DAY_ID,
                new UpdateItineraryDayStatusRequest(ItineraryDayStatus.CONFIRMED));

        assertThat(result.status()).isEqualTo("CONFIRMED");
        ArgumentCaptor<ActivityLogCreateCommand> captor = ArgumentCaptor.forClass(ActivityLogCreateCommand.class);
        then(activityLogService).should().create(captor.capture());
        ActivityLogCreateCommand logged = captor.getValue();
        assertThat(logged.tripId()).isEqualTo(TRIP_ID);
        assertThat(logged.memberId()).isEqualTo(MEMBER_ID);
        assertThat(logged.actionType()).isEqualTo("ITINERARY_DAY_CONFIRMED");
        assertThat(logged.targetType()).isEqualTo("ITINERARY_DAY");
        assertThat(logged.targetId()).isEqualTo(DAY_ID);
    }

    @Test
    @DisplayName("t11 다른 Day의 항목이 순서 변경 요청에 포함되면 예외가 발생한다")
    void t11_reorderItemsRejectsItemFromAnotherDay() {
        ItineraryDay otherDay = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 2), 2);
        ReflectionTestUtils.setField(otherDay, "id", 101L);
        ItineraryItem otherItem = ItineraryItem.create(otherDay, 301L, 0);
        ReflectionTestUtils.setField(otherItem, "id", 201L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(item)));

        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day)).willReturn(List.of(item));

        assertThatThrownBy(() -> itineraryService.reorderItems(
                TRIP_ID,
                DAY_ID,
                new ReorderItineraryItemsRequest(List.of(201L))
        ))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ItineraryErrorCode.ITINERARY_INVALID_ITEM_ORDER));
    }

    @Test
    @DisplayName("t12 일부 항목이 누락된 순서 변경 요청은 거부한다")
    void t12_reorderItemsRejectsIncompleteItemList() {
        ItineraryItem item2 = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(item2, "id", 201L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(item, item2)));

        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item, item2));

        assertThatThrownBy(() -> itineraryService.reorderItems(
                TRIP_ID,
                DAY_ID,
                new ReorderItineraryItemsRequest(List.of(ITEM_ID))
        ))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ItineraryErrorCode.ITINERARY_INVALID_ITEM_ORDER));
    }

    @Test
    @DisplayName("t13 순서 변경 시 임시 순번을 저장한 후 최종 순번을 저장한다")
    void t13_reorderItemsUsesTwoPhaseSortOrderUpdate() {
        ItineraryItem item2 = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(item2, "id", 201L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(item, item2)));

        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item, item2));
        given(itemRepository.saveAllAndFlush(anyList())).willAnswer(inv -> inv.getArgument(0));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(any())).willReturn(List.of(savedTripPlace));

        itineraryService.reorderItems(
                TRIP_ID,
                DAY_ID,
                new ReorderItineraryItemsRequest(List.of(201L, ITEM_ID))
        );

        then(itemRepository).should(times(2)).saveAllAndFlush(anyList());
        assertThat(item2.getSortOrder()).isZero();
        assertThat(item.getSortOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("t14 대상 Day에 같은 장소가 있으면 항목을 이동할 수 없다")
    void t14_moveItemRejectsDuplicatePlaceInTargetDay() {
        ItineraryDay targetDay = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 2), 2);
        ReflectionTestUtils.setField(targetDay, "id", 101L);
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID)).willReturn(Optional.of(item));
        given(dayRepository.findByIdAndTripId(101L, TRIP_ID)).willReturn(Optional.of(targetDay));
        given(itemRepository.existsByItineraryDayAndTripPlaceIdAndIdNot(
                targetDay,
                TRIP_PLACE_ID,
                ITEM_ID
        )).willReturn(true);

        assertThatThrownBy(() -> itineraryService.moveItem(
                TRIP_ID,
                ITEM_ID,
                new MoveItineraryItemRequest(101L, 0)
        ))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ItineraryErrorCode.ITINERARY_ITEM_ALREADY_EXISTS));
    }

    @Test
    @DisplayName("t15 종료 시간이 시작 시간보다 빠르면 항목을 수정할 수 없다")
    void t15_updateItemRejectsInvalidTimeRange() {
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID)).willReturn(Optional.of(item));

        assertThatThrownBy(() -> itineraryService.updateItem(
                TRIP_ID,
                ITEM_ID,
                new UpdateItineraryItemRequest("10:00", "09:00", null, null, null)
        ))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ItineraryErrorCode.ITINERARY_INVALID_TIME_RANGE));
    }

    @Test
    @DisplayName("t16 다른 Day에 이미 배치된 장소는 일정에 다시 추가할 수 없다")
    void t16_addItemRejectsPlaceAlreadyScheduledInTrip() {
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID)).willReturn(Optional.of(day));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));
        given(itemRepository.existsByItineraryDayTripIdAndTripPlaceId(
                TRIP_ID,
                TRIP_PLACE_ID
        )).willReturn(true);

        assertThatThrownBy(() -> itineraryService.addItem(
                TRIP_ID,
                DAY_ID,
                new AddItineraryItemRequest(TRIP_PLACE_ID, 0)
        ))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ItineraryErrorCode.ITINERARY_ITEM_ALREADY_EXISTS));

        then(itemRepository).should(never()).save(any(ItineraryItem.class));
    }

    @Test
    @DisplayName("t17 AI 동선 미리보기는 저장 장소와 Day를 계획기에 전달하고 경로 옵션 목록을 반환한다")
    void t17_previewRoutePlanDelegatesSavedPlacesAndDays() {
        RoutePlanPreviewResponse planResponse = new RoutePlanPreviewResponse(
                "추천 동선",
                1,
                0,
                List.of()
        );
        RoutePlanOption option = new RoutePlanOption("거리 최적화 코스", planResponse);
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                TRIP_ID,
                TripPlaceStatus.SAVED
        )).willReturn(List.of(savedTripPlace));
        given(routePlanner.planMulti(any(), any(), any(), any()))
                .willReturn(List.of(option));

        List<RoutePlanOption> result = itineraryService.previewRoutePlan(TRIP_ID, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isSameAs(option);
        then(accessChecker).should().requireView(TRIP_ID);
    }

    @Test
    @DisplayName("t18 AI 동선을 승인하면 계획된 Day와 시간으로 일정 항목을 저장한다")
    void t18_applyRoutePlanPersistsPlannedItems() {
        RoutePlanItemResponse plannedItem = new RoutePlanItemResponse(
                TRIP_PLACE_ID,
                "테스트 장소",
                "관광",
                "#f97316",
                "09:00",
                "10:30",
                null,
                null,
                null,
                null,
                "첫 장소"
        );
        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "추천 동선",
                1,
                0,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        0,
                        List.of(plannedItem)
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                TRIP_ID,
                TripPlaceStatus.SAVED
        )).willReturn(List.of(savedTripPlace));
        given(itemRepository.saveAllAndFlush(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));

        itineraryService.applyRoutePlan(TRIP_ID, preview);

        then(routePlanner).shouldHaveNoInteractions();
        then(itemRepository).should().saveAllAndFlush(argThat(items -> {
            ItineraryItem saved = items.iterator().next();
            return saved.getItineraryDay().equals(day)
                    && saved.getTripPlaceId().equals(TRIP_PLACE_ID)
                    && saved.getStartTime().equals(java.time.LocalTime.of(9, 0))
                    && saved.getEndTime().equals(java.time.LocalTime.of(10, 30));
        }));
    }

    @Test
    @DisplayName("t19 시간과 메모만 수정하면 기존 이동정보를 유지한다")
    void t19_updateItemPreservesTravelInformationWhenOmitted() {
        item.updateDetails(null, null, null, 25, 3200, "대중교통");
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));

        itineraryService.updateItem(
                TRIP_ID,
                ITEM_ID,
                new UpdateItineraryItemRequest(
                        "09:00",
                        "10:30",
                        "수정 메모",
                        null,
                        null
                )
        );

        assertThat(item.getTransportMinutes()).isEqualTo(25);
        assertThat(item.getTransportMeters()).isEqualTo(3200);
        assertThat(item.getMemo()).isEqualTo("수정 메모");
    }

    @Test
    @DisplayName("t20 일정 조회는 Day를 생성하지 않는다")
    void t20_getItineraryDoesNotCreateDays() {
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));

        itineraryService.getItinerary(TRIP_ID);

        then(tripRepository).shouldHaveNoInteractions();
        then(dayRepository).should(never()).saveAll(anyList());
    }

    @Test
    @DisplayName("t21 일정 초기화는 여행 기간에 누락된 Day를 생성한다")
    void t21_initializeItineraryCreatesMissingDays() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 8, 2));
        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID))
                .willReturn(new ArrayList<>());
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());

        itineraryService.initializeItinerary(TRIP_ID);

        then(dayRepository).should().saveAll(argThat(days ->
                ((List<ItineraryDay>) days).size() == 2
                        && ((List<ItineraryDay>) days).get(0).getDayNumber() == 1
                        && ((List<ItineraryDay>) days).get(1).getDayNumber() == 2
        ));
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("t22 미리보기 이후 저장 장소가 바뀌면 오래된 AI 계획을 적용하지 않는다")
    void t22_applyRoutePlanRejectsStalePreview() {
        RoutePlanPreviewResponse stalePreview = new RoutePlanPreviewResponse(
                "오래된 추천",
                1,
                0,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        0,
                        List.of(new RoutePlanItemResponse(
                                999L,
                                "삭제된 장소",
                                "관광",
                                "#f97316",
                                "09:00",
                                "10:00",
                                null,
                                null,
                                null,
                                null,
                                "추천"
                        ))
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                TRIP_ID,
                TripPlaceStatus.SAVED
        )).willReturn(List.of(savedTripPlace));

        assertThatThrownBy(() ->
                itineraryService.applyRoutePlan(TRIP_ID, stalePreview))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(
                        ((BusinessException) error).getErrorCode()
                ).isEqualTo(ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN));

        then(itemRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("t23 일정 초기화는 Trip 행을 잠근 후 기존 Day를 조회한다")
    void t23_initializeItineraryLocksTripBeforeReadingDays() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID))
                .willReturn(List.of(day));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));

        itineraryService.initializeItinerary(TRIP_ID);

        var ordered = inOrder(tripRepository, dayRepository);
        ordered.verify(tripRepository)
                .findByIdForItineraryInitialization(TRIP_ID);
        ordered.verify(dayRepository)
                .findAllByTripIdOrderByItineraryDateAsc(TRIP_ID);
    }

    @Test
    @DisplayName("t24 AI 동선 미리보기는 Day를 변경하지 않고 현재 상태 그대로 계획기에 전달한다")
    void t24_previewRoutePlanDoesNotModifyDays() {
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                TRIP_ID,
                TripPlaceStatus.SAVED
        )).willReturn(List.of(savedTripPlace));
        given(routePlanner.planMulti(any(), any(), any(), any()))
                .willReturn(List.of(new RoutePlanOption(
                        "거리 최적화 코스",
                        new RoutePlanPreviewResponse("추천 동선", 1, 0, List.of())
                )));

        itineraryService.previewRoutePlan(TRIP_ID, null);

        then(dayRepository).should(never()).deleteAll(any());
        then(dayRepository).should(never()).flush();
        then(tripRepository).should(never()).findByIdForItineraryInitialization(any());
    }

    @Test
    @DisplayName("t25 다른 Day의 원하는 위치로 이동하면 양쪽 Day 순서를 한 번에 재정렬한다")
    void t25_moveItemInsertsAtRequestedPositionAndReordersBothDays() {
        ItineraryDay targetDay = ItineraryDay.create(
                TRIP_ID,
                LocalDate.of(2026, 8, 2),
                2
        );
        ReflectionTestUtils.setField(targetDay, "id", 101L);
        ItineraryItem targetFirst = ItineraryItem.create(targetDay, 301L, 0);
        ItineraryItem targetSecond = ItineraryItem.create(targetDay, 302L, 1);
        ReflectionTestUtils.setField(targetFirst, "id", 201L);
        ReflectionTestUtils.setField(targetSecond, "id", 202L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(item)));
        ReflectionTestUtils.setField(
                targetDay,
                "items",
                new ArrayList<>(List.of(targetFirst, targetSecond))
        );

        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));
        given(dayRepository.findByIdAndTripId(101L, TRIP_ID))
                .willReturn(Optional.of(targetDay));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(targetDay))
                .willReturn(List.of(targetFirst, targetSecond));
        given(itemRepository.saveAllAndFlush(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));

        itineraryService.moveItem(
                TRIP_ID,
                ITEM_ID,
                new MoveItineraryItemRequest(101L, 1)
        );

        assertThat(item.getItineraryDay()).isEqualTo(targetDay);
        assertThat(targetFirst.getSortOrder()).isZero();
        assertThat(item.getSortOrder()).isEqualTo(1);
        assertThat(targetSecond.getSortOrder()).isEqualTo(2);
        then(itemRepository).should().saveAllAndFlush(
                argThat(items -> ((List<ItineraryItem>) items).equals(
                        List.of(targetFirst, item, targetSecond)
                ))
        );
    }

    @Test
    @DisplayName("t26 AI 계획에 null Day가 포함되면 잘못된 계획 예외를 반환한다")
    void t26_applyRoutePlanRejectsNullDay() {
        RoutePlanPreviewResponse invalidPlan = new RoutePlanPreviewResponse(
                "잘못된 추천",
                1,
                0,
                java.util.Arrays.asList((RoutePlanDayResponse) null)
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                TRIP_ID,
                TripPlaceStatus.SAVED
        )).willReturn(List.of(savedTripPlace));

        assertThatThrownBy(() ->
                itineraryService.applyRoutePlan(TRIP_ID, invalidPlan))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(
                        ((BusinessException) error).getErrorCode()
                ).isEqualTo(ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN));
    }

    @Test
    @DisplayName("t27 일정 초기화는 편집 권한을 확인한다")
    void t27_initializeItineraryRequiresEditPermission() {
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of());

        itineraryService.initializeItinerary(TRIP_ID);

        then(accessChecker).should().requireMember(TRIP_ID);
        then(accessChecker).should(never()).requireView(TRIP_ID);
    }

    @Test
    @DisplayName("t28 이동수단을 변경하면 다음 장소까지 경로를 다시 계산한다")
    void t28_updateTransportModeRecalculatesRouteToNextPlace() {
        ItineraryItem nextItem = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(nextItem, "id", 201L);
        TripPlace nextPlace = mock(TripPlace.class);
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item, nextItem));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));
        given(tripPlaceRepository.findByIdAndTripId(301L, TRIP_ID))
                .willReturn(Optional.of(nextPlace));

        itineraryService.updateTransportMode(
                TRIP_ID,
                ITEM_ID,
                new UpdateItineraryTransportModeRequest(
                        ItineraryTransportMode.SUBWAY
                )
        );

        then(travelEstimator).should().recalculateSegment(
                item,
                savedTripPlace,
                nextPlace,
                ItineraryTransportMode.SUBWAY
        );
    }

    @Test
    @DisplayName("t29 이동수단 변경으로 이동시간이 달라지면 자동 연결된 뒤 일정 시간을 함께 이동한다")
    void t29_updateTransportModeShiftsAutomaticallyLinkedFollowingItems() {
        item.updateDetails(
                LocalTime.of(9, 0),
                LocalTime.of(10, 0),
                null,
                10,
                1000,
                "도보"
        );
        ItineraryItem nextItem = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(nextItem, "id", 201L);
        nextItem.updateDetails(
                LocalTime.of(10, 10),
                LocalTime.of(11, 10),
                null,
                10,
                1000,
                "도보"
        );
        ItineraryItem lastItem = ItineraryItem.create(day, 302L, 2);
        ReflectionTestUtils.setField(lastItem, "id", 202L);
        lastItem.updateDetails(
                LocalTime.of(11, 20),
                LocalTime.of(12, 20),
                null,
                null,
                null,
                null
        );
        TripPlace nextPlace = mock(TripPlace.class);
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item, nextItem, lastItem));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));
        given(tripPlaceRepository.findByIdAndTripId(301L, TRIP_ID))
                .willReturn(Optional.of(nextPlace));
        willAnswer(invocation -> {
            item.updateTravelInformation(
                    25,
                    5000,
                    "지하철",
                    "역 A → 역 B",
                    true,
                    ItineraryTransportMode.SUBWAY.name()
            );
            return null;
        }).given(travelEstimator).recalculateSegment(
                item,
                savedTripPlace,
                nextPlace,
                ItineraryTransportMode.SUBWAY
        );

        itineraryService.updateTransportMode(
                TRIP_ID,
                ITEM_ID,
                new UpdateItineraryTransportModeRequest(
                        ItineraryTransportMode.SUBWAY
                )
        );

        assertThat(nextItem.getStartTime()).isEqualTo(LocalTime.of(10, 25));
        assertThat(nextItem.getEndTime()).isEqualTo(LocalTime.of(11, 25));
        assertThat(lastItem.getStartTime()).isEqualTo(LocalTime.of(11, 35));
        assertThat(lastItem.getEndTime()).isEqualTo(LocalTime.of(12, 35));
    }

    @Test
    @DisplayName("t30 이동수단 변경 시 사용자가 고정한 다음 장소 시간은 변경하지 않는다")
    void t30_updateTransportModePreservesManuallyScheduledFollowingItems() {
        item.updateDetails(
                LocalTime.of(9, 0),
                LocalTime.of(10, 0),
                null,
                10,
                1000,
                "도보"
        );
        ItineraryItem nextItem = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(nextItem, "id", 201L);
        nextItem.updateDetails(
                LocalTime.of(11, 0),
                LocalTime.of(12, 0),
                null,
                null,
                null,
                null
        );
        TripPlace nextPlace = mock(TripPlace.class);
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item, nextItem));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));
        given(tripPlaceRepository.findByIdAndTripId(301L, TRIP_ID))
                .willReturn(Optional.of(nextPlace));
        willAnswer(invocation -> {
            item.updateTravelInformation(
                    25,
                    5000,
                    "지하철",
                    null,
                    true,
                    ItineraryTransportMode.SUBWAY.name()
            );
            return null;
        }).given(travelEstimator).recalculateSegment(
                item,
                savedTripPlace,
                nextPlace,
                ItineraryTransportMode.SUBWAY
        );

        itineraryService.updateTransportMode(
                TRIP_ID,
                ITEM_ID,
                new UpdateItineraryTransportModeRequest(
                        ItineraryTransportMode.SUBWAY
                )
        );

        assertThat(nextItem.getStartTime()).isEqualTo(LocalTime.of(11, 0));
        assertThat(nextItem.getEndTime()).isEqualTo(LocalTime.of(12, 0));
    }

    @Test
    @DisplayName("t31 일정 항목을 삭제하면 남은 항목의 순번을 연속되게 재정렬한다")
    void t31_removeItemCompactsRemainingSortOrders() {
        ItineraryItem remainingItem = ItineraryItem.create(day, 301L, 2);
        day.updateStatus(ItineraryDayStatus.CONFIRMED);
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(remainingItem));

        itineraryService.removeItem(TRIP_ID, ITEM_ID);

        assertThat(remainingItem.getSortOrder()).isZero();
        assertThat(day.getStatus()).isEqualTo(ItineraryDayStatus.DRAFT);
        then(itemRepository).should().saveAllAndFlush(List.of(remainingItem));
    }

    @Test
    @DisplayName("t32 일정 변경은 여행방 행을 잠근 뒤 처리한다")
    void t32_removeItemLocksTripBeforeMutation() {
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));

        itineraryService.removeItem(TRIP_ID, ITEM_ID);

        var inOrder = inOrder(tripRepository, itemRepository);
        inOrder.verify(tripRepository).findByIdForUpdate(TRIP_ID);
        inOrder.verify(itemRepository).delete(item);
    }

    @Test
    @DisplayName("t33 일정 중간에 장소를 추가하면 기존 항목을 밀어 연속 순번으로 저장한다")
    void t33_addItemInsertsAtRequestedPosition() {
        ItineraryItem firstItem = ItineraryItem.create(day, 301L, 0);
        ItineraryItem lastItem = ItineraryItem.create(day, 302L, 1);
        given(dayRepository.findByIdAndTripId(DAY_ID, TRIP_ID))
                .willReturn(Optional.of(day));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(firstItem, lastItem));
        given(itemRepository.save(any(ItineraryItem.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));

        itineraryService.addItem(
                TRIP_ID,
                DAY_ID,
                new AddItineraryItemRequest(TRIP_PLACE_ID, 1)
        );

        ArgumentCaptor<List<ItineraryItem>> itemsCaptor =
                ArgumentCaptor.forClass(List.class);
        then(itemRepository).should(times(2))
                .saveAllAndFlush(itemsCaptor.capture());
        List<ItineraryItem> finalItems = itemsCaptor.getAllValues().get(1);
        assertThat(finalItems)
                .extracting(ItineraryItem::getTripPlaceId)
                .containsExactly(301L, TRIP_PLACE_ID, 302L);
        assertThat(finalItems)
                .extracting(ItineraryItem::getSortOrder)
                .containsExactly(0, 1, 2);
    }

    @Test
    @DisplayName("t34 자동 추천을 선택하면 해당 구간의 수동 이동수단 설정을 해제한다")
    void t34_updateTransportModeRestoresAutomaticRecommendation() {
        ItineraryItem nextItem = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(nextItem, "id", 201L);
        TripPlace nextPlace = mock(TripPlace.class);
        given(itemRepository.findByIdAndTripId(ITEM_ID, TRIP_ID))
                .willReturn(Optional.of(item));
        given(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .willReturn(List.of(item, nextItem));
        given(tripPlaceRepository.findByIdAndTripId(TRIP_PLACE_ID, TRIP_ID))
                .willReturn(Optional.of(savedTripPlace));
        given(tripPlaceRepository.findByIdAndTripId(301L, TRIP_ID))
                .willReturn(Optional.of(nextPlace));

        itineraryService.updateTransportMode(
                TRIP_ID,
                ITEM_ID,
                new UpdateItineraryTransportModeRequest(
                        ItineraryTransportMode.AUTO
                )
        );

        then(travelEstimator).should().recalculateSegmentAutomatically(
                item,
                savedTripPlace,
                nextPlace
        );
    }


    @Test
    @DisplayName("t36 좌표가 없는 장소는 동선 추천에서 자동으로 제외한다")
    void t36_previewRoutePlanFiltersPlacesWithoutCoordinates() {
        TripPlace noCoordPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google789")
                        .name("좌표없는 장소")
                        .address("서울시")
                        .latitude(null)
                        .longitude(null)
                        .build())
                .category(mock(PlaceCategory.class))
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(noCoordPlace, "id", 888L);

        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(TRIP_ID, TripPlaceStatus.SAVED))
                .willReturn(List.of(savedTripPlace, noCoordPlace));
        given(routePlanner.planMulti(any(), any(), any(), any())).willReturn(List.of());

        itineraryService.previewRoutePlan(TRIP_ID, null);

        then(routePlanner).should().planMulti(
                any(),
                argThat(places -> places.stream().noneMatch(p -> p.getPlace().getLatitude() == null)),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("t37 기존 추천안에 출발지가 포함되어도 출발지는 제외하고 일정을 적용한다")
    void t37_applyRoutePlanIgnoresDeparturePlaceFromLegacyPreview() {
        day.updateDeparture(
                "TRIP_PLACE",
                "테스트 출발지",
                new BigDecimal("37.5665"),
                new BigDecimal("126.9780"),
                TRIP_PLACE_ID
        );
        TripPlace visitPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google-visit")
                        .name("방문 장소")
                        .address("서울시")
                        .latitude(new BigDecimal("37.5700"))
                        .longitude(new BigDecimal("126.9800"))
                        .build())
                .category(mock(PlaceCategory.class))
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(visitPlace, "id", 301L);
        RoutePlanPreviewResponse legacyPreview = new RoutePlanPreviewResponse(
                "기존 추천",
                2,
                0,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        0,
                        List.of(
                                routePlanItem(TRIP_PLACE_ID, "테스트 출발지"),
                                routePlanItem(301L, "방문 장소")
                        )
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                TRIP_ID,
                TripPlaceStatus.SAVED
        )).willReturn(List.of(savedTripPlace, visitPlace));
        given(itemRepository.saveAllAndFlush(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));

        itineraryService.applyRoutePlan(TRIP_ID, legacyPreview);

        then(itemRepository).should().saveAllAndFlush(argThat(items -> {
            List<ItineraryItem> savedItems = new ArrayList<>();
            items.forEach(savedItems::add);
            return savedItems.size() == 1
                    && savedItems.getFirst().getTripPlaceId().equals(301L);
        }));
    }

    @Test
    @DisplayName("t38 여행 날짜를 변경하면 기존 일정이 순서 그대로 새 날짜에 적용된다")
    void t38_initializeItineraryShiftsExistingDaysOntoNewDateRange() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 9, 5));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 9, 6));

        ItineraryDay dayOne = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 1), 1);
        ReflectionTestUtils.setField(dayOne, "id", 101L);
        ReflectionTestUtils.setField(dayOne, "items", new ArrayList<>(List.of(item)));
        ItineraryDay dayTwo = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 2), 2);
        ReflectionTestUtils.setField(dayTwo, "id", 102L);
        ReflectionTestUtils.setField(dayTwo, "items", new ArrayList<>());

        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID))
                .willReturn(new ArrayList<>(List.of(dayOne, dayTwo)));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());
        given(dayRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));

        itineraryService.initializeItinerary(TRIP_ID);

        then(dayRepository).should(never()).deleteAll(any());
        assertThat(dayOne.getItineraryDate()).isEqualTo(LocalDate.of(2026, 9, 5));
        assertThat(dayOne.getDayNumber()).isEqualTo(1);
        assertThat(dayOne.getItems()).containsExactly(item);
        assertThat(dayTwo.getItineraryDate()).isEqualTo(LocalDate.of(2026, 9, 6));
        assertThat(dayTwo.getDayNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("t39 여행 날짜 범위가 좁아지면 넘치는 Day와 일정 배치를 삭제한다")
    void t39_initializeItineraryDeletesOverflowingDaysWithItemsAfterShrink() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 8, 1));

        ItineraryDay dayOne = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 7, 1), 1);
        ReflectionTestUtils.setField(dayOne, "id", 101L);
        ReflectionTestUtils.setField(dayOne, "items", new ArrayList<>());
        ItineraryDay dayTwoWithItems =
                ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 7, 2), 2);
        ReflectionTestUtils.setField(dayTwoWithItems, "id", 102L);
        ReflectionTestUtils.setField(
                dayTwoWithItems, "items", new ArrayList<>(List.of(item)));

        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID))
                .willReturn(new ArrayList<>(List.of(dayOne, dayTwoWithItems)));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());
        given(dayRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));

        itineraryService.initializeItinerary(TRIP_ID);

        then(dayRepository).should().deleteAll(argThat(days ->
                ((List<ItineraryDay>) days).size() == 1
                        && ((List<ItineraryDay>) days).getFirst() == dayTwoWithItems
        ));
        assertThat(dayOne.getItineraryDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(dayOne.getDayNumber()).isEqualTo(1);
    }

    @Test
    @DisplayName("t41 넘치는 Day의 날짜가 활성 날짜와 겹쳐도 삭제 후 기존 Day를 재배치한다")
    void t41_initializeItineraryDeletesCollidingOverflowDayBeforeReassignment() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 8, 2));

        ItineraryDay dayOne = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 1), 1);
        ReflectionTestUtils.setField(dayOne, "id", 101L);
        ReflectionTestUtils.setField(dayOne, "items", new ArrayList<>());
        ItineraryDay dayTwoActive = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 7, 5), 2);
        ReflectionTestUtils.setField(dayTwoActive, "id", 103L);
        ReflectionTestUtils.setField(dayTwoActive, "items", new ArrayList<>());
        // dayNumber 순서상 overflow로 밀리지만, 원래 날짜(08-02)가 새 활성 Day(index1)의
        // 목표 날짜와 정확히 겹치는 보존 대상 Day
        ItineraryDay overflowDayCollidingDate =
                ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 2), 3);
        ReflectionTestUtils.setField(overflowDayCollidingDate, "id", 102L);
        ReflectionTestUtils.setField(
                overflowDayCollidingDate, "items", new ArrayList<>(List.of(item)));

        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID))
                .willReturn(new ArrayList<>(
                        List.of(dayOne, overflowDayCollidingDate, dayTwoActive)));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());
        given(dayRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));

        itineraryService.initializeItinerary(TRIP_ID);

        assertThat(dayOne.getItineraryDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(dayTwoActive.getItineraryDate()).isEqualTo(LocalDate.of(2026, 8, 2));
        then(dayRepository).should().deleteAll(argThat(days ->
                ((List<ItineraryDay>) days).size() == 1
                        && ((List<ItineraryDay>) days).getFirst()
                        == overflowDayCollidingDate
        ));
    }

    @Test
    @DisplayName("t40 여행 날짜 범위가 좁아지면 넘치는 빈 Day는 삭제한다")
    void t40_initializeItineraryDeletesOverflowingEmptyDays() {
        given(trip.getStartDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(trip.getEndDate()).willReturn(LocalDate.of(2026, 8, 1));

        ItineraryDay dayOne = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 7, 1), 1);
        ReflectionTestUtils.setField(dayOne, "id", 101L);
        ReflectionTestUtils.setField(dayOne, "items", new ArrayList<>());
        ItineraryDay emptyOverflowDay =
                ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 7, 2), 2);
        ReflectionTestUtils.setField(emptyOverflowDay, "id", 102L);
        ReflectionTestUtils.setField(emptyOverflowDay, "items", new ArrayList<>());

        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID))
                .willReturn(new ArrayList<>(List.of(dayOne, emptyOverflowDay)));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());
        given(dayRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));

        itineraryService.initializeItinerary(TRIP_ID);

        then(dayRepository).should().deleteAll(argThat(days ->
                ((List<ItineraryDay>) days).size() == 1
                        && ((List<ItineraryDay>) days).get(0) == emptyOverflowDay
        ));
    }

    @Test
    @DisplayName("t43 여행 날짜를 초기화하면 모든 Day와 일정 배치를 삭제한다")
    void t43_initializeItineraryDeletesAllDaysWhenDatesAreCleared() {
        ItineraryDay dayWithItems = ItineraryDay.create(
                TRIP_ID,
                LocalDate.of(2026, 8, 1),
                1
        );
        ReflectionTestUtils.setField(dayWithItems, "id", 101L);
        ReflectionTestUtils.setField(
                dayWithItems,
                "items",
                new ArrayList<>(List.of(item))
        );
        given(dayRepository.findAllByTripIdOrderByItineraryDateAsc(TRIP_ID))
                .willReturn(List.of(dayWithItems));
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID)).willReturn(List.of());

        itineraryService.initializeItinerary(TRIP_ID);

        then(dayRepository).should().deleteAll(List.of(dayWithItems));
        then(dayRepository).should().flush();
    }

    @Test
    @DisplayName("t42 AI 동선 적용 전 기존 일정 순번을 DB에서 안전한 임시 순번으로 이동한다")
    void t42_applyRoutePlanParksExistingSortOrdersBeforeFinalAssignment() {
        ItineraryItem existingItem = ItineraryItem.create(day, TRIP_PLACE_ID, 0);
        ReflectionTestUtils.setField(existingItem, "id", ITEM_ID);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(existingItem)));
        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "추천 동선",
                1,
                0,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        0,
                        List.of(routePlanItem(TRIP_PLACE_ID, "테스트 장소"))
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                TRIP_ID,
                TripPlaceStatus.SAVED
        )).willReturn(List.of(savedTripPlace));
        given(itemRepository.saveAllAndFlush(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));

        itineraryService.applyRoutePlan(TRIP_ID, preview);

        var ordered = inOrder(itemRepository);
        ordered.verify(itemRepository).parkSortOrdersByIds(List.of(ITEM_ID));
        ordered.verify(itemRepository).saveAllAndFlush(anyList());
    }

    @Test
    @DisplayName("t43 하루 재배치 적용은 선택한 Day의 일정만 변경한다")
    void t43_applyReplanDayOnlyUpdatesSelectedDay() {
        ItineraryItem targetItem = ItineraryItem.create(day, TRIP_PLACE_ID, 0);
        ReflectionTestUtils.setField(targetItem, "id", ITEM_ID);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(targetItem)));

        ItineraryDay otherDay = ItineraryDay.create(
                TRIP_ID, LocalDate.of(2026, 8, 2), 2);
        ReflectionTestUtils.setField(otherDay, "id", 101L);
        ItineraryItem otherDayItem = ItineraryItem.create(otherDay, 301L, 0);
        ReflectionTestUtils.setField(otherDayItem, "id", 201L);
        ReflectionTestUtils.setField(
                otherDay, "items", new ArrayList<>(List.of(otherDayItem)));

        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "Day 1만 재배치",
                1,
                0,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        0,
                        List.of(routePlanItem(TRIP_PLACE_ID, "테스트 장소"))
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day, otherDay));
        given(tripPlaceRepository.findAllById(Set.of(TRIP_PLACE_ID)))
                .willReturn(List.of(savedTripPlace));
        given(itemRepository.saveAllAndFlush(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));

        itineraryService.applyReplanDay(TRIP_ID, DAY_ID, preview);

        then(itemRepository).should().parkSortOrdersByIds(List.of(ITEM_ID));
        then(itemRepository).should().saveAllAndFlush(argThat(items -> {
            List<ItineraryItem> savedItems = new ArrayList<>();
            items.forEach(savedItems::add);
            return savedItems.size() == 1
                    && savedItems.getFirst().getId().equals(ITEM_ID)
                    && savedItems.getFirst().getItineraryDay().getId().equals(DAY_ID);
        }));
        assertThat(otherDayItem.getItineraryDay()).isSameAs(otherDay);
        assertThat(otherDayItem.getSortOrder()).isZero();
    }

    @Test
    @DisplayName("t44 하루 재배치 적용에 다른 Day 계획이 포함되면 거부한다")
    void t44_applyReplanDayRejectsAnotherDayPlan() {
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(item)));
        RoutePlanPreviewResponse invalidPreview = new RoutePlanPreviewResponse(
                "잘못된 Day",
                1,
                0,
                List.of(new RoutePlanDayResponse(
                        999L,
                        2,
                        LocalDate.of(2026, 8, 2),
                        0,
                        List.of(routePlanItem(TRIP_PLACE_ID, "테스트 장소"))
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(Set.of(TRIP_PLACE_ID)))
                .willReturn(List.of(savedTripPlace));

        assertThatThrownBy(() ->
                itineraryService.applyReplanDay(TRIP_ID, DAY_ID, invalidPreview)
        ).isInstanceOf(BusinessException.class);

        then(itemRepository).should(never()).saveAllAndFlush(anyList());
    }

    @Test
    @DisplayName("t45 하루 재배치를 적용하면 선택된 일정 구간만 실제 이동 정보로 계산한다")
    void t45_applyReplanDayCalculatesTravelOnlyForSelectedPlan() {
        ItineraryItem first = ItineraryItem.create(day, TRIP_PLACE_ID, 0);
        ItineraryItem second = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(first, "id", 201L);
        ReflectionTestUtils.setField(second, "id", 202L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(first, second)));
        TripPlace secondTripPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google301")
                        .name("둘째 장소")
                        .address("서울시")
                        .latitude(new BigDecimal("37.57"))
                        .longitude(new BigDecimal("126.99"))
                        .build())
                .category(savedTripPlace.getCategory())
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(secondTripPlace, "id", 301L);
        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "선택 Day 재배치",
                2,
                1000,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        1000,
                        List.of(
                                routePlanItem(TRIP_PLACE_ID, "첫 장소"),
                                routePlanItem(301L, "둘째 장소")
                        )
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(Set.of(TRIP_PLACE_ID, 301L)))
                .willReturn(List.of(savedTripPlace, secondTripPlace));

        itineraryService.applyReplanDay(TRIP_ID, DAY_ID, preview);

        then(travelEstimator).should().recalculate(
                argThat(items -> items.size() == 2),
                argThat(places -> places.keySet().containsAll(
                        Set.of(TRIP_PLACE_ID, 301L)
                ))
        );
    }

    @Test
    @DisplayName("t46 특정 Day 동선 미리보기는 해당 Day에 배치된 장소만 계획기에 전달한다")
    void t46_previewRoutePlanForDayUsesOnlyPlacesAssignedToThatDay() {
        ItineraryItem first = ItineraryItem.create(day, TRIP_PLACE_ID, 0);
        ItineraryItem second = ItineraryItem.create(day, 301L, 1);
        ReflectionTestUtils.setField(first, "id", 201L);
        ReflectionTestUtils.setField(second, "id", 202L);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>(List.of(first, second)));

        TripPlace secondTripPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google301")
                        .name("둘째 장소")
                        .address("서울시")
                        .latitude(new BigDecimal("37.57"))
                        .longitude(new BigDecimal("126.99"))
                        .build())
                .category(savedTripPlace.getCategory())
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(secondTripPlace, "id", 301L);
        RoutePlanOption option = new RoutePlanOption(
                "Day 1 동선",
                new RoutePlanPreviewResponse("추천", 2, 0, List.of())
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(Set.of(TRIP_PLACE_ID, 301L)))
                .willReturn(List.of(savedTripPlace, secondTripPlace));
        given(routePlanner.planMulti(any(), any(), any(), any()))
                .willReturn(List.of(option));

        List<RoutePlanOption> result = itineraryService.previewRoutePlan(
                TRIP_ID,
                new RoutePlanSettingsRequest(
                        null,
                        "09:00",
                        "21:00",
                        "NORMAL",
                        DAY_ID
                )
        );

        assertThat(result).containsExactly(option);
        then(routePlanner).should().planMulti(
                argThat(days -> days.size() == 1 && days.getFirst() == day),
                argThat(places -> places.size() == 2
                        && places.stream().map(TripPlace::getId).collect(
                        java.util.stream.Collectors.toSet()
                ).equals(Set.of(TRIP_PLACE_ID, 301L))),
                eq(Set.of()),
                any(TripScheduleSettings.class)
        );
    }

    @Test
    @DisplayName("t47 특정 Day에 장소가 부족하면 다른 Day에 배치되지 않은 저장 장소로 채운다")
    void t47_previewRoutePlanForDayFillsFromUnscheduledPlacesWhenDayIsShort() {
        ItineraryDay otherDay = ItineraryDay.create(TRIP_ID, LocalDate.of(2026, 8, 2), 2);
        ReflectionTestUtils.setField(otherDay, "id", 101L);
        ItineraryItem otherDayItem = ItineraryItem.create(otherDay, 999L, 0);
        ReflectionTestUtils.setField(otherDayItem, "id", 203L);
        ReflectionTestUtils.setField(otherDay, "items", new ArrayList<>(List.of(otherDayItem)));

        TripPlace unscheduledSecondPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google302")
                        .name("미배치 장소")
                        .address("서울시")
                        .latitude(new BigDecimal("37.58"))
                        .longitude(new BigDecimal("126.98"))
                        .build())
                .category(savedTripPlace.getCategory())
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(unscheduledSecondPlace, "id", 302L);

        TripPlace otherDayTripPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google999")
                        .name("이미 배치된 장소")
                        .address("서울시")
                        .latitude(new BigDecimal("37.59"))
                        .longitude(new BigDecimal("126.97"))
                        .build())
                .category(savedTripPlace.getCategory())
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(otherDayTripPlace, "id", 999L);

        RoutePlanOption option = new RoutePlanOption(
                "Day 1 동선",
                new RoutePlanPreviewResponse("추천", 2, 0, List.of())
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day, otherDay));
        given(tripPlaceRepository.findAllById(Set.of()))
                .willReturn(List.of());
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(TRIP_ID, TripPlaceStatus.SAVED))
                .willReturn(List.of(savedTripPlace, unscheduledSecondPlace, otherDayTripPlace));
        given(routePlanner.planMulti(any(), any(), any(), any()))
                .willReturn(List.of(option));

        List<RoutePlanOption> result = itineraryService.previewRoutePlan(
                TRIP_ID,
                new RoutePlanSettingsRequest(
                        null,
                        "09:00",
                        "21:00",
                        "NORMAL",
                        DAY_ID
                )
        );

        assertThat(result).containsExactly(option);
        then(routePlanner).should().planMulti(
                argThat(days -> days.size() == 1 && days.getFirst() == day),
                argThat(places -> places.stream().map(TripPlace::getId).collect(
                        java.util.stream.Collectors.toSet()
                ).equals(Set.of(TRIP_PLACE_ID, 302L))),
                eq(Set.of()),
                any(TripScheduleSettings.class)
        );
    }

    @Test
    @DisplayName("t48 하루 재배치 적용은 미배치 저장 장소로 채운 계획도 허용한다")
    void t48_applyReplanDayAcceptsPlanFilledFromUnscheduledPlaces() {
        TripPlace unscheduledSecondPlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google302")
                        .name("미배치 장소")
                        .address("서울시")
                        .latitude(new BigDecimal("37.58"))
                        .longitude(new BigDecimal("126.98"))
                        .build())
                .category(savedTripPlace.getCategory())
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(unscheduledSecondPlace, "id", 302L);

        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "Day 1 동선",
                2,
                0,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        0,
                        List.of(
                                routePlanItem(TRIP_PLACE_ID, "테스트 장소"),
                                routePlanItem(302L, "미배치 장소")
                        )
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(Set.of()))
                .willReturn(List.of());
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(TRIP_ID, TripPlaceStatus.SAVED))
                .willReturn(List.of(savedTripPlace, unscheduledSecondPlace));
        given(itemRepository.saveAllAndFlush(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));

        assertThatCode(() ->
                itineraryService.applyReplanDay(TRIP_ID, DAY_ID, preview)
        ).doesNotThrowAnyException();

        then(itemRepository).should().saveAllAndFlush(argThat(items -> {
            List<ItineraryItem> savedItems = new ArrayList<>();
            items.forEach(savedItems::add);
            return savedItems.size() == 2;
        }));
    }

    @Test
    @DisplayName("t49 하루 재배치 적용은 미리보기에서 제외된 갱신 실패 장소를 요구하지 않는다")
    void t49_applyReplanDayIgnoresPlaceRejectedDuringFreshnessCheck() {
        TripPlace unavailablePlace = TripPlace.builder()
                .tripId(TRIP_ID)
                .place(Place.builder()
                        .googlePlaceId("google302")
                        .name("갱신 실패 장소")
                        .address("서울시")
                        .latitude(new BigDecimal("37.58"))
                        .longitude(new BigDecimal("126.98"))
                        .build())
                .category(savedTripPlace.getCategory())
                .addedBy(MEMBER_ID)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(unavailablePlace, "id", 302L);
        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "Day 1 동선",
                1,
                0,
                List.of(new RoutePlanDayResponse(
                        DAY_ID,
                        1,
                        LocalDate.of(2026, 8, 1),
                        0,
                        List.of(routePlanItem(TRIP_PLACE_ID, "테스트 장소"))
                ))
        );
        given(dayRepository.findAllWithItemsByTripId(TRIP_ID))
                .willReturn(List.of(day));
        given(tripPlaceRepository.findAllById(Set.of()))
                .willReturn(List.of());
        given(tripPlaceRepository.findAllOrderedByTripIdAndStatus(TRIP_ID, TripPlaceStatus.SAVED))
                .willReturn(List.of(savedTripPlace, unavailablePlace));
        given(googlePlaceContentRefreshService.ensureFresh(unavailablePlace.getPlace()))
                .willReturn(false);
        given(itemRepository.saveAllAndFlush(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));

        assertThatCode(() ->
                itineraryService.applyReplanDay(TRIP_ID, DAY_ID, preview)
        ).doesNotThrowAnyException();
    }

    private RoutePlanItemResponse routePlanItem(Long tripPlaceId, String name) {
        return new RoutePlanItemResponse(
                tripPlaceId,
                name,
                "관광",
                "#f97316",
                "09:00",
                "10:00",
                null,
                null,
                null,
                null,
                "추천"
        );
    }
}
