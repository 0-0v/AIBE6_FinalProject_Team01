package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.global.exception.BusinessException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GooglePlaceContentRefreshService {

    private static final int GOOGLE_CONTENT_CACHE_DAYS = 30;

    private final PlaceSearchService placeSearchService;
    private final PlaceRepository placeRepository;
    private final Clock clock;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean ensureFresh(Place place) {
        LocalDateTime now = LocalDateTime.now(clock);
        if (place.getGoogleContentFetchedAt() != null
                && place.getGoogleContentFetchedAt().isAfter(
                        now.minusDays(GOOGLE_CONTENT_CACHE_DAYS))) {
            return hasCoordinates(place);
        }

        return refreshNow(place, now);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean refreshNow(Place place) {
        return refreshNow(place, LocalDateTime.now(clock));
    }

    public Optional<Place> fetchVerified(String googlePlaceId) {
        LocalDateTime now = LocalDateTime.now(clock);
        try {
            PlaceSearchResponse details = placeSearchService.getPlaceDetails(googlePlaceId);
            return Optional.of(toPlace(details, now));
        } catch (BusinessException exception) {
            return Optional.empty();
        }
    }

    private boolean refreshNow(Place place, LocalDateTime now) {
        try {
            PlaceSearchResponse details = placeSearchService.getPlaceDetails(
                    place.getGooglePlaceId()
            );
            Place refreshed = toPlace(details, now);
            Place persisted = placeRepository.findById(place.getId()).orElse(place);
            persisted.refreshGoogleContent(refreshed);
            place.refreshGoogleContent(refreshed);
            if (persisted.getId() != null) {
                placeRepository.saveAndFlush(persisted);
            }
            return hasCoordinates(place);
        } catch (BusinessException exception) {
            return false;
        }
    }

    private boolean hasCoordinates(Place place) {
        return place.getLatitude() != null && place.getLongitude() != null;
    }

    private Place toPlace(PlaceSearchResponse details, LocalDateTime fetchedAt) {
        return Place.builder()
                .googlePlaceId(details.googlePlaceId())
                .name(details.name())
                .address(details.address())
                .latitude(BigDecimal.valueOf(details.latitude()))
                .longitude(BigDecimal.valueOf(details.longitude()))
                .placeType(details.placeType())
                .googleContentFetchedAt(fetchedAt)
                .build();
    }
}
