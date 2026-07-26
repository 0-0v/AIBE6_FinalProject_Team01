package back.backend.domain.travelrecord.port;

import org.springframework.web.multipart.MultipartFile;

public interface TravelPhotoStorage {
    String store(Long tripId, Long memberId, MultipartFile file);
}
