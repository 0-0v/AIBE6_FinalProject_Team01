package back.backend.domain.member.port;

import org.springframework.web.multipart.MultipartFile;

public interface ProfileImageStorage {

    String store(Long memberId, MultipartFile file);

    void delete(String profileImageUrl);
}
