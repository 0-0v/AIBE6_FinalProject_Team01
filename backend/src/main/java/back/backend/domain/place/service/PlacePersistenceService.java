package back.backend.domain.place.service;

import back.backend.domain.place.entity.Place;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.global.exception.DataIntegrityConstraintMatcher;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PlacePersistenceService {

    private static final String GOOGLE_PLACE_ID_CONSTRAINT = "uk_places_google_place_id";

    private final PlaceRepository placeRepository;
    private final TransactionTemplate requiresNewTransaction;

    @Autowired
    public PlacePersistenceService(
            PlaceRepository placeRepository,
            PlatformTransactionManager transactionManager
    ) {
        this(placeRepository, createRequiresNewTemplate(transactionManager));
    }

    PlacePersistenceService(
            PlaceRepository placeRepository,
            TransactionTemplate requiresNewTransaction
    ) {
        this.placeRepository = placeRepository;
        this.requiresNewTransaction = requiresNewTransaction;
    }

    public Place findOrCreate(Place candidate) {
        try {
            return Objects.requireNonNull(requiresNewTransaction.execute(status ->
                    placeRepository.findByGooglePlaceId(candidate.getGooglePlaceId())
                            .orElseGet(() -> placeRepository.saveAndFlush(candidate))
            ));
        } catch (DataIntegrityViolationException exception) {
            if (!DataIntegrityConstraintMatcher.containsConstraint(
                    exception,
                    GOOGLE_PLACE_ID_CONSTRAINT
            )) {
                throw exception;
            }

            return requiresNewTransaction.execute(status ->
                    placeRepository.findByGooglePlaceId(candidate.getGooglePlaceId())
                            .orElseThrow(() -> exception)
            );
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
