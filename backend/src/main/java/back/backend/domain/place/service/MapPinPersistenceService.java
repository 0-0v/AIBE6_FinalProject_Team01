package back.backend.domain.place.service;

import back.backend.domain.place.entity.MapPin;
import back.backend.domain.place.repository.MapPinRepository;
import back.backend.global.exception.DataIntegrityConstraintMatcher;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class MapPinPersistenceService {

    private static final String TRIP_PLACE_CONSTRAINT = "uk_map_pins_trip_place";

    private final MapPinRepository mapPinRepository;
    private final TransactionTemplate requiresNewTransaction;

    @Autowired
    public MapPinPersistenceService(
            MapPinRepository mapPinRepository,
            PlatformTransactionManager transactionManager
    ) {
        this(mapPinRepository, createRequiresNewTemplate(transactionManager));
    }

    MapPinPersistenceService(
            MapPinRepository mapPinRepository,
            TransactionTemplate requiresNewTransaction
    ) {
        this.mapPinRepository = mapPinRepository;
        this.requiresNewTransaction = requiresNewTransaction;
    }

    public MapPin findOrCreate(MapPin candidate) {
        try {
            return Objects.requireNonNull(requiresNewTransaction.execute(status ->
                    mapPinRepository.findByTripIdAndGooglePlaceId(
                                    candidate.getTripId(),
                                    candidate.getGooglePlaceId()
                            )
                            .orElseGet(() -> mapPinRepository.saveAndFlush(candidate))
            ));
        } catch (DataIntegrityViolationException exception) {
            if (!DataIntegrityConstraintMatcher.containsConstraint(
                    exception,
                    TRIP_PLACE_CONSTRAINT
            )) {
                throw exception;
            }

            return Objects.requireNonNull(requiresNewTransaction.execute(status ->
                    mapPinRepository.findByTripIdAndGooglePlaceId(
                                    candidate.getTripId(),
                                    candidate.getGooglePlaceId()
                            )
                            .orElseThrow(() -> exception)
            ));
        }
    }

    private static TransactionTemplate createRequiresNewTemplate(
            PlatformTransactionManager transactionManager
    ) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template;
    }
}
