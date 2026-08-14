package back.backend.domain.member.infrastructure;

import back.backend.domain.member.exception.MemberErrorCode;
import back.backend.domain.member.port.ProfileImageStorage;
import back.backend.global.config.FileStorageProperties;
import back.backend.global.exception.BusinessException;
import back.backend.global.util.ImageContentInspector;
import back.backend.global.util.ImageContentInspector.ImageFormat;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalProfileImageStorage implements ProfileImageStorage {

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

    @Override
    public void delete(String profileImageUrl) {
        if (profileImageUrl == null || profileImageUrl.isBlank()) {
            return;
        }
        String expectedPrefix = "/uploads/" + SUB_DIRECTORY + "/";
        if (!profileImageUrl.startsWith(expectedPrefix)) {
            return;
        }

        Path directory = Path.of(properties.getUploadDir(), SUB_DIRECTORY).toAbsolutePath().normalize();
        Path target = directory.resolve(profileImageUrl.substring(expectedPrefix.length())).normalize();
        if (!target.getParent().equals(directory)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new BusinessException(MemberErrorCode.PROFILE_IMAGE_STORAGE_FAILED);
        }
    }

    private String validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(MemberErrorCode.EMPTY_PROFILE_IMAGE);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(MemberErrorCode.PROFILE_IMAGE_TOO_LARGE);
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw new BusinessException(MemberErrorCode.PROFILE_IMAGE_STORAGE_FAILED);
        }

        // 확장자와 Content-Type 헤더는 클라이언트가 조작할 수 있으므로 신뢰하지 않고,
        // 파일의 실제 매직 바이트로 형식을 판별한다.
        ImageFormat format = ImageContentInspector.detectFormat(content)
                .orElseThrow(() -> new BusinessException(MemberErrorCode.INVALID_PROFILE_IMAGE_TYPE));
        if (!ImageContentInspector.isDecodableRasterImage(content)) {
            throw new BusinessException(MemberErrorCode.INVALID_PROFILE_IMAGE_TYPE);
        }
        return format.extension();
    }
}
