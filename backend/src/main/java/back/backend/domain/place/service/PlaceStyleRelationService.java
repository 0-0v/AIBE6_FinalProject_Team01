package back.backend.domain.place.service;

import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceStyleTag;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.PlaceStyleTagRepository;
import back.backend.domain.trip.entity.TravelStyle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceStyleRelationService {

    private static final String CATEGORY_RULE_SOURCE = "CATEGORY_RULE";
    private static final Map<PlaceCategoryType, Map<TravelStyle, Double>> SCORES =
            createScores();

    private final PlaceStyleTagRepository repository;

    public double calculateCompatibility(
            PlaceCategoryType categoryType,
            Set<TravelStyle> travelStyles
    ) {
        if (categoryType == null || travelStyles == null || travelStyles.isEmpty()) {
            return 0;
        }
        Map<TravelStyle, Double> categoryScores = SCORES.getOrDefault(
                categoryType,
                Map.of()
        );
        return travelStyles.stream()
                .mapToDouble(style -> categoryScores.getOrDefault(style, 0.1))
                .average()
                .orElse(0);
    }

    public double resolveCompatibility(
            Long placeId,
            PlaceCategoryType fallbackCategory,
            Set<TravelStyle> travelStyles
    ) {
        if (travelStyles == null || travelStyles.isEmpty()) return 0;
        List<PlaceStyleTag> storedRelations = repository.findAllByPlaceId(placeId);
        if (storedRelations.isEmpty()) {
            return calculateCompatibility(fallbackCategory, travelStyles);
        }
        Map<TravelStyle, Double> scoresByStyle = new EnumMap<>(TravelStyle.class);
        storedRelations.forEach(tag -> scoresByStyle.put(
                tag.getStyleType(),
                tag.scoreAsDouble()
        ));
        return travelStyles.stream()
                .mapToDouble(style -> scoresByStyle.getOrDefault(style, 0.1))
                .average()
                .orElse(0);
    }

    public Map<Long, Map<TravelStyle, Double>> resolveStyleVectors(
            List<TripPlace> tripPlaces
    ) {
        if (tripPlaces == null || tripPlaces.isEmpty()) return Map.of();
        List<Long> placeIds = tripPlaces.stream()
                .map(TripPlace::getPlace)
                .map(Place::getId)
                .toList();
        Map<Long, List<PlaceStyleTag>> tagsByPlaceId = repository
                .findAllByPlaceIdIn(placeIds)
                .stream()
                .collect(Collectors.groupingBy(tag -> tag.getPlace().getId()));
        Map<Long, Map<TravelStyle, Double>> result = new HashMap<>();
        for (TripPlace tripPlace : tripPlaces) {
            List<PlaceStyleTag> tags = tagsByPlaceId.getOrDefault(
                    tripPlace.getPlace().getId(),
                    List.of()
            );
            Map<TravelStyle, Double> vector = new EnumMap<>(TravelStyle.class);
            if (!tags.isEmpty()) {
                tags.forEach(tag -> vector.put(
                        tag.getStyleType(),
                        tag.scoreAsDouble()
                ));
            } else {
                PlaceCategoryType categoryType = tripPlace.getCategory() == null
                        ? null : tripPlace.getCategory().getCategoryType();
                vector.putAll(SCORES.getOrDefault(categoryType, Map.of()));
            }
            for (TravelStyle style : TravelStyle.values()) {
                vector.putIfAbsent(style, 0.1);
            }
            result.put(tripPlace.getId(), Map.copyOf(vector));
        }
        return Map.copyOf(result);
    }

    @Transactional
    public void saveCategoryRelations(Place place, PlaceCategoryType categoryType) {
        if (place == null || place.getId() == null || categoryType == null) return;
        if (!repository.findAllByPlaceId(place.getId()).isEmpty()) return;

        Map<TravelStyle, Double> categoryScores = SCORES.getOrDefault(
                categoryType,
                Map.of()
        );
        List<PlaceStyleTag> relations = categoryScores.entrySet().stream()
                .map(entry -> PlaceStyleTag.create(
                        place,
                        entry.getKey(),
                        entry.getValue(),
                        CATEGORY_RULE_SOURCE
                ))
                .toList();
        if (!relations.isEmpty()) repository.saveAll(relations);
    }

    private static Map<PlaceCategoryType, Map<TravelStyle, Double>> createScores() {
        Map<PlaceCategoryType, Map<TravelStyle, Double>> scores =
                new EnumMap<>(PlaceCategoryType.class);
        scores.put(PlaceCategoryType.FOOD, Map.of(
                TravelStyle.FOOD, 0.95,
                TravelStyle.SNS_HOT_PLACE, 0.55
        ));
        scores.put(PlaceCategoryType.CAFE, Map.of(
                TravelStyle.FOOD, 0.60,
                TravelStyle.SNS_HOT_PLACE, 0.80,
                TravelStyle.RELAXATION, 0.70
        ));
        scores.put(PlaceCategoryType.BAR, Map.of(
                TravelStyle.FOOD, 0.70,
                TravelStyle.SNS_HOT_PLACE, 0.70
        ));
        scores.put(PlaceCategoryType.ATTRACTION, Map.of(
                TravelStyle.FAMOUS_ATTRACTIONS, 0.95,
                TravelStyle.CULTURE_ART_HISTORY, 0.85,
                TravelStyle.SNS_HOT_PLACE, 0.70
        ));
        scores.put(PlaceCategoryType.NATURE, Map.of(
                TravelStyle.NATURE, 0.95,
                TravelStyle.RELAXATION, 0.90,
                TravelStyle.ACTIVITY, 0.50
        ));
        scores.put(PlaceCategoryType.LODGING, Map.of(
                TravelStyle.RELAXATION, 0.70,
                TravelStyle.SNS_HOT_PLACE, 0.45
        ));
        scores.put(PlaceCategoryType.SHOPPING, Map.of(
                TravelStyle.SHOPPING, 0.95,
                TravelStyle.SNS_HOT_PLACE, 0.70
        ));
        scores.put(PlaceCategoryType.ACTIVITY, Map.of(
                TravelStyle.ACTIVITY, 0.95,
                TravelStyle.SNS_HOT_PLACE, 0.65
        ));
        scores.put(PlaceCategoryType.TRANSPORT, Map.of(
                TravelStyle.ACTIVITY, 0.20,
                TravelStyle.FAMOUS_ATTRACTIONS, 0.20
        ));
        return Map.copyOf(scores);
    }
}
