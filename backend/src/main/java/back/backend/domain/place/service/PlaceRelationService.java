package back.backend.domain.place.service;

import back.backend.domain.place.entity.PlaceRelation;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.PlaceRelationRepository;
import back.backend.domain.trip.entity.TravelStyle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PlaceRelationService {

    private static final double STYLE_WEIGHT = 0.7;
    private static final double CO_VISIT_WEIGHT_ALPHA = 0.15;

    private final PlaceStyleRelationService placeStyleRelationService;
    private final PlaceRelationRepository placeRelationRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Map<Long, Map<Long, Double>> resolvePairwiseRelationScores(
            List<TripPlace> tripPlaces
    ) {
        if (tripPlaces == null || tripPlaces.size() < 2) return Map.of();

        Map<Long, Map<TravelStyle, Double>> styleVectors =
                placeStyleRelationService.resolveStyleVectors(tripPlaces);

        List<Long> placeIds = tripPlaces.stream()
                .map(tripPlace -> tripPlace.getPlace().getId())
                .filter(Objects::nonNull)
                .toList();
        Map<String, Integer> coVisitCounts = placeIds.isEmpty()
                ? Map.of()
                : placeRelationRepository.findAllByPlaceIdsIn(placeIds).stream()
                        .collect(java.util.stream.Collectors.toMap(
                                relation -> pairKey(
                                        relation.getFromPlaceId(),
                                        relation.getToPlaceId()
                                ),
                                PlaceRelation::getCoVisitCount
                        ));

        Map<Long, Map<Long, Double>> pairwiseScores = new HashMap<>();
        for (int i = 0; i < tripPlaces.size(); i++) {
            TripPlace first = tripPlaces.get(i);
            for (int j = i + 1; j < tripPlaces.size(); j++) {
                TripPlace second = tripPlaces.get(j);
                double styleSimilarity = cosineSimilarity(
                        styleVectors.getOrDefault(first.getId(), Map.of()),
                        styleVectors.getOrDefault(second.getId(), Map.of())
                );
                int coVisitCount = resolveCoVisitCount(first, second, coVisitCounts);
                double score = Math.min(1.0,
                        styleSimilarity * STYLE_WEIGHT
                                + Math.log(1 + coVisitCount) * CO_VISIT_WEIGHT_ALPHA);
                pairwiseScores
                        .computeIfAbsent(first.getId(), key -> new HashMap<>())
                        .put(second.getId(), score);
                pairwiseScores
                        .computeIfAbsent(second.getId(), key -> new HashMap<>())
                        .put(first.getId(), score);
            }
        }
        return pairwiseScores;
    }

    @Transactional
    public void recomputeCoVisitCounts() {
        List<PlaceRelationRepository.PlaceCoVisitProjection> aggregated =
                placeRelationRepository.aggregateCoVisitCounts();
        LocalDateTime now = LocalDateTime.now(clock);
        placeRelationRepository.deleteAllInBatch();
        List<PlaceRelation> relations = aggregated.stream()
                .map(row -> PlaceRelation.create(
                        row.getFromPlaceId(),
                        row.getToPlaceId(),
                        row.getPairCount().intValue(),
                        now
                ))
                .toList();
        if (!relations.isEmpty()) {
            placeRelationRepository.saveAll(relations);
        }
    }

    private int resolveCoVisitCount(
            TripPlace first,
            TripPlace second,
            Map<String, Integer> coVisitCounts
    ) {
        Long firstPlaceId = first.getPlace().getId();
        Long secondPlaceId = second.getPlace().getId();
        if (firstPlaceId == null || secondPlaceId == null) return 0;
        return coVisitCounts.getOrDefault(pairKey(firstPlaceId, secondPlaceId), 0);
    }

    private String pairKey(Long placeIdA, Long placeIdB) {
        long min = Math.min(placeIdA, placeIdB);
        long max = Math.max(placeIdA, placeIdB);
        return min + ":" + max;
    }

    private double cosineSimilarity(
            Map<TravelStyle, Double> first,
            Map<TravelStyle, Double> second
    ) {
        if (first.isEmpty() || second.isEmpty()) return 0.0;
        double dot = 0;
        double normFirst = 0;
        double normSecond = 0;
        for (TravelStyle style : TravelStyle.values()) {
            double a = first.getOrDefault(style, 0.0);
            double b = second.getOrDefault(style, 0.0);
            dot += a * b;
            normFirst += a * a;
            normSecond += b * b;
        }
        if (normFirst == 0 || normSecond == 0) return 0.0;
        return dot / (Math.sqrt(normFirst) * Math.sqrt(normSecond));
    }
}
