package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceGraphEdge;
import back.backend.domain.place.repository.PlaceGraphEdgeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceGraphEdgeService {

    private static final Duration ROUTE_CACHE_TTL = Duration.ofDays(7);
    private static final String ROUTE_SOURCE = "GOOGLE_ROUTES";

    private final PlaceGraphEdgeRepository repository;
    private final Clock clock;

    public Optional<CachedRoute> find(
            Place from,
            Place to,
            ItineraryTransportMode mode
    ) {
        if (!isCacheable(mode)) return Optional.empty();
        Instant now = clock.instant();
        return repository.findByRoute(from.getId(), to.getId(), mode.name())
                .filter(edge -> edge.isValidAt(now))
                .map(edge -> new CachedRoute(
                        edge.getDistanceMeters(),
                        edge.getTravelMinutes()
                ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cache(
            Place from,
            Place to,
            ItineraryTransportMode mode,
            int distanceMeters,
            int travelMinutes
    ) {
        if (!isCacheable(mode)
                || distanceMeters < 0
                || travelMinutes < 0) {
            return;
        }
        Instant now = clock.instant();
        Instant expiresAt = now.plus(ROUTE_CACHE_TTL);
        PlaceGraphEdge edge = repository
                .findByRoute(from.getId(), to.getId(), mode.name())
                .orElseGet(() -> PlaceGraphEdge.create(
                        from,
                        to,
                        mode.name(),
                        distanceMeters,
                        travelMinutes,
                        ROUTE_SOURCE,
                        now,
                        expiresAt
                ));
        edge.refresh(
                distanceMeters,
                travelMinutes,
                ROUTE_SOURCE,
                now,
                expiresAt
        );
        repository.save(edge);
    }

    private boolean isCacheable(ItineraryTransportMode mode) {
        return mode == ItineraryTransportMode.WALKING
                || mode == ItineraryTransportMode.DRIVING
                || mode == ItineraryTransportMode.TAXI;
    }

    public record CachedRoute(int distanceMeters, int travelMinutes) {
    }
}
