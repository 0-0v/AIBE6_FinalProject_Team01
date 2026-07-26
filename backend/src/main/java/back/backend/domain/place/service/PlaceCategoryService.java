package back.backend.domain.place.service;

import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.request.CreatePlaceCategoryRequest;
import back.backend.domain.place.dto.request.ReorderPlaceCategoriesRequest;
import back.backend.domain.place.dto.request.UpdatePlaceCategoryRequest;
import back.backend.domain.place.dto.response.PlaceCategoryResponse;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCategoryRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceCategoryService {

    private static final List<DefaultCategory> DEFAULT_CATEGORIES = List.of(
            new DefaultCategory("음식점", PlaceCategoryType.FOOD, "#dc2626", PlaceMarkerIcon.UTENSILS),
            new DefaultCategory("카페", PlaceCategoryType.CAFE, "#b45309", PlaceMarkerIcon.COFFEE),
            new DefaultCategory("술집", PlaceCategoryType.BAR, "#be123c", PlaceMarkerIcon.BEER),
            new DefaultCategory("명소", PlaceCategoryType.ATTRACTION, "#7c3aed", PlaceMarkerIcon.LANDMARK),
            new DefaultCategory("자연", PlaceCategoryType.NATURE, "#0f766e", PlaceMarkerIcon.TREES),
            new DefaultCategory("숙소", PlaceCategoryType.LODGING, "#0891b2", PlaceMarkerIcon.HOTEL),
            new DefaultCategory("쇼핑", PlaceCategoryType.SHOPPING, "#2563eb", PlaceMarkerIcon.SHOPPING_BAG),
            new DefaultCategory("액티비티", PlaceCategoryType.ACTIVITY, "#ea580c", PlaceMarkerIcon.STAR),
            new DefaultCategory("교통", PlaceCategoryType.TRANSPORT, "#475569", PlaceMarkerIcon.PLANE),
            new DefaultCategory("기타", PlaceCategoryType.OTHER, "#64748b", PlaceMarkerIcon.MAP_PIN)
    );

    private final PlaceCategoryRepository categoryRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final TripAccessChecker accessChecker;
    private final CollaborationEventService collaborationEventService;

    @Transactional
    public List<PlaceCategoryResponse> getCategories(Long tripId) {
        accessChecker.requireView(tripId);
        ensureDefaults(tripId);
        return categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(tripId)
                .stream()
                .map(PlaceCategoryResponse::from)
                .toList();
    }

    @Transactional
    public PlaceCategoryResponse create(Long tripId, CreatePlaceCategoryRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        ensureDefaults(tripId);
        String name = request.name().trim();
        ensureUniqueName(tripId, name, null);
        int sortOrder = categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(tripId).size();
        PlaceCategory category = categoryRepository.save(PlaceCategory.builder()
                .tripId(tripId)
                .name(name)
                .categoryType(PlaceCategoryType.CUSTOM)
                .markerColor(request.markerColor().toLowerCase(Locale.ROOT))
                .markerIcon(request.markerIcon())
                .sortOrder(sortOrder)
                .build());
        record(tripId, memberId, "PLACE_CATEGORY_CREATED", category, "장소 카테고리가 생성됐습니다.");
        return PlaceCategoryResponse.from(category);
    }

    @Transactional
    public PlaceCategoryResponse update(
            Long tripId,
            Long categoryId,
            UpdatePlaceCategoryRequest request
    ) {
        Long memberId = accessChecker.requireEdit(tripId);
        PlaceCategory category = findCategory(tripId, categoryId);
        String name = request.name().trim();
        ensureUniqueName(tripId, name, categoryId);
        category.update(
                name,
                request.markerColor().toLowerCase(Locale.ROOT),
                request.markerIcon()
        );
        record(tripId, memberId, "PLACE_CATEGORY_UPDATED", category, "장소 카테고리가 수정됐습니다.");
        return PlaceCategoryResponse.from(category);
    }

    @Transactional
    public void delete(Long tripId, Long categoryId) {
        Long memberId = accessChecker.requireEdit(tripId);
        PlaceCategory category = findCategory(tripId, categoryId);
        if (category.getCategoryType() == PlaceCategoryType.OTHER) {
            throw new BusinessException(PlaceErrorCode.PLACE_CATEGORY_REQUIRED);
        }
        PlaceCategory fallback = findByType(tripId, PlaceCategoryType.OTHER);
        List<TripPlace> assignedPlaces =
                tripPlaceRepository.findAllByTripIdAndCategory(tripId, category);
        assignedPlaces.forEach(place -> place.updateCategory(fallback));
        categoryRepository.delete(category);
        record(tripId, memberId, "PLACE_CATEGORY_DELETED", category, "장소 카테고리가 삭제됐습니다.");
    }

    @Transactional
    public List<PlaceCategoryResponse> reorder(
            Long tripId,
            ReorderPlaceCategoriesRequest request
    ) {
        Long memberId = accessChecker.requireEdit(tripId);
        List<PlaceCategory> categories =
                categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(tripId);
        List<Long> requestedIds = request.categoryIds();
        Set<Long> existingIds = categories.stream()
                .map(PlaceCategory::getId)
                .collect(java.util.stream.Collectors.toSet());
        if (requestedIds.size() != categories.size()
                || new HashSet<>(requestedIds).size() != requestedIds.size()
                || !existingIds.equals(new HashSet<>(requestedIds))) {
            throw new BusinessException(PlaceErrorCode.PLACE_CATEGORY_ORDER_INVALID);
        }
        Map<Long, PlaceCategory> categoriesById = categories.stream()
                .collect(java.util.stream.Collectors.toMap(PlaceCategory::getId, category -> category));
        for (int index = 0; index < requestedIds.size(); index++) {
            categoriesById.get(requestedIds.get(index)).updateSortOrder(index);
        }
        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_CATEGORY_REORDERED",
                "TRIP",
                tripId,
                "장소 카테고리 순서가 변경됐습니다.",
                Map.of("categoryIds", requestedIds),
                NotificationType.PLACE,
                "장소 카테고리 정렬"
        );
        return requestedIds.stream()
                .map(categoriesById::get)
                .map(PlaceCategoryResponse::from)
                .toList();
    }

    @Transactional
    public PlaceCategory recommend(Long tripId, String placeName, String placeType) {
        return recommend(tripId, placeName, placeType, List.of());
    }

    @Transactional
    public PlaceCategory recommend(
            Long tripId,
            String placeName,
            String placeType,
            List<String> placeTypes
    ) {
        ensureDefaults(tripId);
        PlaceCategoryType type = PlaceCategoryClassifier.classify(
                placeType,
                placeTypes == null ? List.of() : placeTypes,
                placeName
        );
        return categoryRepository.findFirstByTripIdAndCategoryType(tripId, type)
                .orElseGet(() -> findByType(tripId, PlaceCategoryType.OTHER));
    }

    public PlaceCategory findCategory(Long tripId, Long categoryId) {
        return categoryRepository.findByIdAndTripId(categoryId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_CATEGORY_NOT_FOUND));
    }

    @Transactional
    public void ensureDefaults(Long tripId) {
        if (categoryRepository.countByTripId(tripId) > 0) {
            return;
        }
        List<PlaceCategory> defaults = java.util.stream.IntStream
                .range(0, DEFAULT_CATEGORIES.size())
                .mapToObj(index -> {
                    DefaultCategory category = DEFAULT_CATEGORIES.get(index);
                    return PlaceCategory.builder()
                            .tripId(tripId)
                            .name(category.name())
                            .categoryType(category.type())
                            .markerColor(category.color())
                            .markerIcon(category.icon())
                            .sortOrder(index)
                            .build();
                })
                .toList();
        categoryRepository.saveAll(defaults);
    }

    private PlaceCategory findByType(Long tripId, PlaceCategoryType type) {
        return categoryRepository.findFirstByTripIdAndCategoryType(tripId, type)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_CATEGORY_NOT_FOUND));
    }

    private void ensureUniqueName(Long tripId, String name, Long currentCategoryId) {
        categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(tripId).stream()
                .filter(category -> currentCategoryId == null || !category.getId().equals(currentCategoryId))
                .filter(category -> category.getName().equalsIgnoreCase(name))
                .findAny()
                .ifPresent(category -> {
                    throw new BusinessException(PlaceErrorCode.PLACE_CATEGORY_ALREADY_EXISTS);
                });
    }

    private void record(
            Long tripId,
            Long memberId,
            String actionType,
            PlaceCategory category,
            String description
    ) {
        collaborationEventService.record(
                tripId,
                memberId,
                actionType,
                "PLACE_CATEGORY",
                category.getId(),
                description,
                Map.of("categoryName", category.getName()),
                NotificationType.PLACE,
                "장소 카테고리"
        );
    }

    private record DefaultCategory(
            String name,
            PlaceCategoryType type,
            String color,
            PlaceMarkerIcon icon
    ) {
    }
}
