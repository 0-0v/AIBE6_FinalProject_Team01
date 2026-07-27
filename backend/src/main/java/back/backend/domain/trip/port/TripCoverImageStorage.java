package back.backend.domain.trip.port;

import org.springframework.web.multipart.MultipartFile;

public interface TripCoverImageStorage {
    String store(Long tripId, Long memberId, MultipartFile file);
}
