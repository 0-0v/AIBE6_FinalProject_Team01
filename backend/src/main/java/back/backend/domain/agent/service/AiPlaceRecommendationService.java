package back.backend.domain.agent.service;

import back.backend.domain.agent.dto.request.AiPlaceRecommendationRequest;
import back.backend.domain.agent.dto.response.AiPlaceRecommendationResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.service.PlaceStyleRelationService;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiPlaceRecommendationService {

    private static final double EARTH_RADIUS_METERS = 6_371_000;
    private static final double DEFAULT_SEARCH_RADIUS_METERS = 5_000;

    private final TripAccessChecker accessChecker;
    private final TripRepository tripRepository;
    private final ItineraryDayRepository itineraryDayRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final PlaceSearchService placeSearchService;
    private final PlaceStyleRelationService placeStyleRelationService;
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
        int fromIndex = orderedTripPlaceIds.indexOf(request.fromTripPlaceId());
        if (fromIndex < 0
                || fromIndex + 1 >= orderedTripPlaceIds.size()
                || !orderedTripPlaceIds.get(fromIndex + 1)
                .equals(request.toTripPlaceId())) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
            );
        }
        List<Long> segmentTripPlaceIds = List.of(
                request.fromTripPlaceId(),
                request.toTripPlaceId()
        );
        var destinationItem = day.getItems().stream()
                .filter(item -> request.toTripPlaceId().equals(
                        item.getTripPlaceId()
                ))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
                ));
        if (isPastSegment(day.getItineraryDate(), destinationItem.getStartTime())) {
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
        if (searched.isEmpty()
                && request.prompt() != null
                && !request.prompt().isBlank()) {
            searched = searchAlongRoute(
                    buildQuery(
                            trip.getDestination(),
                            request.category(),
                            null
                    ),
                    routePoints
            );
        }

        List<back.backend.domain.place.entity.TripPlace> registeredPlaces =
                tripPlaceRepository.findAllOrderedByTripId(tripId);
        Set<String> registeredGooglePlaceIds = registeredPlaces.stream()
                .map(place -> place.getPlace().getGooglePlaceId())
                .collect(Collectors.toSet());
        List<Candidate> candidates = searched
                .stream()
                .filter(place -> !registeredGooglePlaceIds.contains(
                        place.googlePlaceId()
                ))
                .map(place -> new Candidate(
                        place,
                        routeDeviationMeters(place, routePoints),
                        placeStyleRelationService.calculateCompatibility(
                                place.recommendedCategoryType(),
                                trip.getTravelStyles()
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

    private String buildReason(Candidate candidate) {
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
                .mapToDouble(point -> distanceMeters(
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
            double throughCandidate = distanceMeters(
                    from[0], from[1], place.latitude(), place.longitude()
            ) + distanceMeters(
                    place.latitude(), place.longitude(), to[0], to[1]
            );
            double direct = distanceMeters(from[0], from[1], to[0], to[1]);
            return (int) Math.round(Math.max(0, throughCandidate - direct));
        }
        return (int) Math.round(routePoints.stream()
                .mapToDouble(point -> distanceMeters(
                        place.latitude(),
                        place.longitude(),
                        point[0],
                        point[1]
                ))
                .min()
                .orElse(0));
    }

    private double distanceMeters(
            double latitude1,
            double longitude1,
            double latitude2,
            double longitude2
    ) {
        double lat1 = Math.toRadians(latitude1);
        double lat2 = Math.toRadians(latitude2);
        double latitudeDelta = lat2 - lat1;
        double longitudeDelta = Math.toRadians(longitude2 - longitude1);
        double haversine = Math.pow(Math.sin(latitudeDelta / 2), 2)
                + Math.cos(lat1)
                * Math.cos(lat2)
                * Math.pow(Math.sin(longitudeDelta / 2), 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(
                Math.sqrt(haversine),
                Math.sqrt(1 - haversine)
        );
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
            double styleCompatibility
    ) {
        private double rankingScore() {
            double routeScore = 1.0 / (1.0 + routeDeviationMeters / 1_000.0);
            double ratingScore = place.rating() == null
                    ? 0.5 : Math.min(1, place.rating() / 5.0);
            return routeScore * 0.65
                    + styleCompatibility * 0.25
                    + ratingScore * 0.10;
        }
    }
}
