package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.PlaceCategoryResponse;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCategoryRepository;
import back.backend.global.exception.BusinessException;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
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
    private static final Set<PlaceCategoryType> DEFAULT_CATEGORY_TYPES =
            DEFAULT_CATEGORIES.stream()
                    .map(DefaultCategory::type)
                    .collect(() -> EnumSet.noneOf(PlaceCategoryType.class), Set::add, Set::addAll);

    private final PlaceCategoryRepository categoryRepository;
    private final TripAccessChecker accessChecker;

    @Transactional
    public List<PlaceCategoryResponse> getCategories(Long tripId) {
        accessChecker.requireView(tripId);
        return ensureDefaults(tripId)
                .stream()
                .map(PlaceCategoryResponse::from)
                .toList();
    }

    @Transactional
    public PlaceCategory recommend(
            Long tripId,
            String placeName,
            String placeType,
            List<String> placeTypes
    ) {
        List<PlaceCategory> categories = ensureDefaults(tripId);
        PlaceCategoryType type = PlaceCategoryClassifier.classify(
                placeType,
                placeTypes == null ? List.of() : placeTypes,
                placeName
        );
        return findByType(categories, type)
                .orElseGet(() -> findByType(categories, PlaceCategoryType.OTHER)
                        .orElseThrow(() -> new BusinessException(
                                PlaceErrorCode.PLACE_CATEGORY_NOT_FOUND
                        )));
    }

    public PlaceCategory findCategory(Long tripId, Long categoryId) {
        return categoryRepository.findByIdAndTripId(categoryId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_CATEGORY_NOT_FOUND));
    }

    @Transactional
    public List<PlaceCategory> ensureDefaults(Long tripId) {
        List<PlaceCategory> existingCategories =
                categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(tripId);
        if (containsAllDefaults(existingCategories)) {
            return existingCategories;
        }

        Set<PlaceCategoryType> existingTypes = categoryTypes(existingCategories);
        for (int i = 0; i < DEFAULT_CATEGORIES.size(); i++) {
            DefaultCategory cat = DEFAULT_CATEGORIES.get(i);
            if (!existingTypes.contains(cat.type())) {
                categoryRepository.insertIgnore(
                        tripId,
                        cat.name(),
                        cat.type().name(),
                        cat.color(),
                        cat.icon().name(),
                        i
                );
            }
        }
        return categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(tripId);
    }

    private boolean containsAllDefaults(List<PlaceCategory> categories) {
        return categoryTypes(categories).containsAll(DEFAULT_CATEGORY_TYPES);
    }

    private Set<PlaceCategoryType> categoryTypes(List<PlaceCategory> categories) {
        return categories.stream()
                .map(PlaceCategory::getCategoryType)
                .collect(() -> EnumSet.noneOf(PlaceCategoryType.class), Set::add, Set::addAll);
    }

    private Optional<PlaceCategory> findByType(
            List<PlaceCategory> categories,
            PlaceCategoryType type
    ) {
        return categories.stream()
                .filter(category -> category.getCategoryType() == type)
                .findFirst();
    }

    private record DefaultCategory(
            String name,
            PlaceCategoryType type,
            String color,
            PlaceMarkerIcon icon
    ) {
    }
}
