package back.backend.domain.agent.service;

import back.backend.domain.agent.dto.request.AiPlaceRecommendationRequest;
import back.backend.domain.agent.dto.response.AiPlaceRecommendationResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.service.PlaceStyleRelationService;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.util.GeoDistanceCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiPlaceRecommendationService {

    private static final double DEFAULT_SEARCH_RADIUS_METERS = 5_000;

    private final TripAccessChecker accessChecker;
    private final TripRepository tripRepository;
    private final ItineraryDayRepository itineraryDayRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final PlaceSearchService placeSearchService;
    private final PlaceStyleRelationService placeStyleRelationService;
    private final AiPlaceRecommendationRanker recommendationRanker;
    private final Clock clock;

    public List<AiPlaceRecommendationResponse> recommend(
            Long tripId,
            AiPlaceRecommendationRequest request
    ) {
        accessChecker.requireEdit(tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        ItineraryDay day = itineraryDayRepository.findByIdAndTripId(
                        request.dayId(),
                        tripId
                )
                .orElseThrow(() -> new BusinessException(
                        ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND
                ));

        List<Long> orderedTripPlaceIds = day.getItems().stream()
                .map(item -> item.getTripPlaceId())
                .filter(java.util.Objects::nonNull)
                .toList();
        if (!isValidRouteBoundary(orderedTripPlaceIds, request)) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
            );
        }
        List<Long> segmentTripPlaceIds = Stream.of(
                        request.fromTripPlaceId(),
                        request.toTripPlaceId()
                )
                .filter(Objects::nonNull)
                .toList();
        Long timeBoundaryPlaceId = request.toTripPlaceId() != null
                ? request.toTripPlaceId()
                : request.fromTripPlaceId();
        var timeBoundaryItem = day.getItems().stream()
                .filter(item -> timeBoundaryPlaceId.equals(item.getTripPlaceId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
                ));
        if (isPastSegment(day.getItineraryDate(), timeBoundaryItem.getStartTime())) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_ROUTE_SEGMENT_PASSED
            );
        }

        Map<Long, double[]> routePointByTripPlaceId = tripPlaceRepository
                .findAllById(segmentTripPlaceIds)
                .stream()
                .collect(Collectors.toMap(
                        place -> place.getId(),
                        place -> new double[]{
                                place.getPlace().getLatitude().doubleValue(),
                                place.getPlace().getLongitude().doubleValue()
                        }
                ));
        List<double[]> routePoints = segmentTripPlaceIds.stream()
                .map(routePointByTripPlaceId::get)
                .filter(java.util.Objects::nonNull)
                .toList();

        String query = buildQuery(
                trip.getDestination(),
                request.category(),
                request.prompt()
        );
        List<PlaceSearchResponse> searched = searchAlongRoute(
                query,
                routePoints
        );
        List<back.backend.domain.place.entity.TripPlace> registeredPlaces =
                tripPlaceRepository.findAllOrderedByTripId(tripId);
        Set<String> registeredGooglePlaceIds = registeredPlaces.stream()
                .map(place -> place.getPlace().getGooglePlaceId())
                .collect(Collectors.toSet());
        List<PlaceSearchResponse> eligiblePlaces = searched
                .stream()
                .filter(place -> matchesRequestedCategory(
                        place.recommendedCategoryType(),
                        request.category()
                ))
                .filter(place -> !registeredGooglePlaceIds.contains(
                        place.googlePlaceId()
                ))
                .limit(15)
                .toList();
        Map<String, AiPlaceRecommendationRanker.Assessment> rankedAssessments =
                recommendationRanker.rank(
                        trip.getDestination(),
                        request.category(),
                        request.prompt(),
                        eligiblePlaces
                );
        Map<String, AiPlaceRecommendationRanker.Assessment> aiAssessments =
                rankedAssessments == null ? Map.of() : rankedAssessments;
        List<Candidate> candidates = eligiblePlaces.stream()
                .map(place -> new Candidate(
                        place,
                        routeDeviationMeters(place, routePoints),
                        placeStyleRelationService.calculateCompatibility(
                                place.recommendedCategoryType(),
                                trip.getTravelStyles()
                        ),
                        aiAssessments.getOrDefault(
                                place.googlePlaceId(),
                                new AiPlaceRecommendationRanker.Assessment(0.5, "")
                        )
                ))
                .sorted(Comparator
                        .comparingDouble(Candidate::rankingScore)
                        .reversed()
                        .thenComparing(
                                candidate -> candidate.place().rating(),
                                Comparator.nullsLast(Comparator.reverseOrder())
                        ))
                .limit(15)
                .toList();

        int limit = request.resolvedLimit();
        return candidates.stream()
                .limit(limit)
                .map(candidate -> new AiPlaceRecommendationResponse(
                        candidate.place(),
                        buildReason(candidate),
                        candidate.routeDeviationMeters(),
                        candidate.styleCompatibility()
                ))
                .toList();
    }

    private boolean matchesRequestedCategory(
            PlaceCategoryType actualCategory,
            String requestedCategory
    ) {
        String normalized = requestedCategory.trim().toLowerCase(Locale.ROOT);
        PlaceCategoryType expected = switch (normalized) {
            case "restaurant", "food", "음식점" -> PlaceCategoryType.FOOD;
            case "cafe", "카페" -> PlaceCategoryType.CAFE;
            case "hotel", "lodging", "숙소" -> PlaceCategoryType.LODGING;
            case "tourist attraction", "tourist attractions",
                 "tourist_attraction", "명소" -> PlaceCategoryType.ATTRACTION;
            case "shopping", "shopping mall", "shopping_mall", "쇼핑" ->
                    PlaceCategoryType.SHOPPING;
            default -> null;
        };
        return expected == null || expected == actualCategory;
    }

    private boolean isValidRouteBoundary(
            List<Long> orderedTripPlaceIds,
            AiPlaceRecommendationRequest request
    ) {
        Long fromId = request.fromTripPlaceId();
        Long toId = request.toTripPlaceId();
        if (orderedTripPlaceIds.isEmpty() || (fromId == null && toId == null)) {
            return false;
        }
        if (fromId == null) {
            return orderedTripPlaceIds.getFirst().equals(toId);
        }
        if (toId == null) {
            return orderedTripPlaceIds.getLast().equals(fromId);
        }
        int fromIndex = orderedTripPlaceIds.indexOf(fromId);
        return fromIndex >= 0
                && fromIndex + 1 < orderedTripPlaceIds.size()
                && orderedTripPlaceIds.get(fromIndex + 1).equals(toId);
    }

    private String buildReason(Candidate candidate) {
        if (!candidate.aiAssessment().reason().isBlank()) {
            return candidate.aiAssessment().reason();
        }
        if (candidate.styleCompatibility() >= 0.7) {
            return "기존 동선에서 가깝고 여행 스타일과도 잘 맞는 후보예요.";
        }
        return "요청한 조건으로 검색된 장소 중 기존 동선에서 가까운 후보예요.";
    }

    private List<PlaceSearchResponse> searchAlongRoute(
            String query,
            List<double[]> routePoints
    ) {
        if (routePoints.isEmpty()) {
            return placeSearchService.search(query);
        }
        return placeSearchService.searchNearby(
                query,
                average(routePoints, 0),
                average(routePoints, 1),
                searchRadius(routePoints)
        );
    }

    private String buildQuery(
            String destination,
            String category,
            String prompt
    ) {
        return String.join(
                " ",
                List.of(
                        destination == null ? "" : destination.trim(),
                        category.trim(),
                        prompt == null ? "" : prompt.trim()
                )
        ).trim();
    }

    private double average(List<double[]> points, int index) {
        return points.stream().mapToDouble(point -> point[index]).average()
                .orElse(0);
    }

    private double searchRadius(List<double[]> points) {
        double centerLat = average(points, 0);
        double centerLng = average(points, 1);
        double farthest = points.stream()
                .mapToDouble(point -> GeoDistanceCalculator.distanceMeters(
                        centerLat,
                        centerLng,
                        point[0],
                        point[1]
                ))
                .max()
                .orElse(0);
        return Math.max(DEFAULT_SEARCH_RADIUS_METERS, farthest + 3_000);
    }

    private int routeDeviationMeters(
            PlaceSearchResponse place,
            List<double[]> routePoints
    ) {
        if (routePoints.isEmpty()) return 0;
        if (routePoints.size() == 2) {
            double[] from = routePoints.get(0);
            double[] to = routePoints.get(1);
            double throughCandidate = GeoDistanceCalculator.distanceMeters(
                    from[0], from[1], place.latitude(), place.longitude()
            ) + GeoDistanceCalculator.distanceMeters(
                    place.latitude(), place.longitude(), to[0], to[1]
            );
            double direct = GeoDistanceCalculator.distanceMeters(
                    from[0], from[1], to[0], to[1]);
            return (int) Math.round(Math.max(0, throughCandidate - direct));
        }
        return (int) Math.round(routePoints.stream()
                .mapToDouble(point -> GeoDistanceCalculator.distanceMeters(
                        place.latitude(),
                        place.longitude(),
                        point[0],
                        point[1]
                ))
                .min()
                .orElse(0));
    }

    private boolean isPastSegment(
            LocalDate itineraryDate,
            LocalTime destinationStartTime
    ) {
        LocalDate today = LocalDate.now(clock);
        if (itineraryDate.isBefore(today)) return true;
        if (itineraryDate.isAfter(today) || destinationStartTime == null) {
            return false;
        }
        return !destinationStartTime.isAfter(LocalTime.now(clock));
    }

    private record Candidate(
            PlaceSearchResponse place,
            int routeDeviationMeters,
            double styleCompatibility,
            AiPlaceRecommendationRanker.Assessment aiAssessment
    ) {
        private double rankingScore() {
            double routeScore = 1.0 / (1.0 + routeDeviationMeters / 1_000.0);
            double ratingScore = place.rating() == null
                    ? 0.5 : Math.min(1, place.rating() / 5.0);
            return routeScore * 0.35
                    + aiAssessment.score() * 0.30
                    + styleCompatibility * 0.20
                    + ratingScore * 0.15;
        }
    }
}
