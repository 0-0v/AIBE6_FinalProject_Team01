package back.backend.domain.member.infrastructure;

import back.backend.domain.member.exception.MemberErrorCode;
import back.backend.domain.member.port.ProfileImageStorage;
import back.backend.global.config.FileStorageProperties;
import back.backend.global.exception.BusinessException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalProfileImageStorage implements ProfileImageStorage {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;
    private static final String SUB_DIRECTORY = "profile-images";

    private final FileStorageProperties properties;

    public LocalProfileImageStorage(FileStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public String store(Long memberId, MultipartFile file) {
        String extension = validate(file);
        String filename = memberId + "-" + UUID.randomUUID() + "." + extension;
        Path directory = Path.of(properties.getUploadDir(), SUB_DIRECTORY);

        try {
            Files.createDirectories(directory);
            file.transferTo(directory.resolve(filename));
        } catch (IOException e) {
            throw new BusinessException(MemberErrorCode.PROFILE_IMAGE_STORAGE_FAILED);
        }

        return "/uploads/" + SUB_DIRECTORY + "/" + filename;
    }

    private String validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(MemberErrorCode.EMPTY_PROFILE_IMAGE);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(MemberErrorCode.PROFILE_IMAGE_TOO_LARGE);
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException(MemberErrorCode.INVALID_PROFILE_IMAGE_TYPE);
        }

        String extension = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BusinessException(MemberErrorCode.INVALID_PROFILE_IMAGE_TYPE);
        }
        return extension;
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new BusinessException(MemberErrorCode.INVALID_PROFILE_IMAGE_TYPE);
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
