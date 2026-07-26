package back.backend.domain.travelrecord.infrastructure;

import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.domain.travelrecord.port.TravelPhotoStorage;
import back.backend.global.exception.BusinessException;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Component
@ConditionalOnProperty(name = "app.file-storage.type", havingValue = "s3")
public class S3TravelPhotoStorage implements TravelPhotoStorage {

    private final S3Client s3Client;
    private final String bucket;
    private final String publicBaseUrl;

    public S3TravelPhotoStorage(
            S3Client s3Client,
            @Value("${app.file-storage.s3.bucket}") String bucket,
            @Value("${app.file-storage.s3.public-base-url}") String publicBaseUrl
    ) {
        this.s3Client = s3Client;
        this.bucket = requireSetting(bucket, "AWS_S3_BUCKET");
        this.publicBaseUrl = trimTrailingSlash(
                requireSetting(publicBaseUrl, "AWS_S3_PUBLIC_BASE_URL"));
    }

    @Override
    public String store(Long tripId, Long memberId, MultipartFile file) {
        TravelPhotoValidator.ValidatedPhoto photo = TravelPhotoValidator.validate(file);
        String key = "travel-records/" + tripId + "/" + memberId + "/"
                + UUID.randomUUID() + "." + photo.extension();
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(photo.contentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );
        } catch (IOException | SdkException exception) {
            throw new BusinessException(TravelRecordErrorCode.PHOTO_STORAGE_FAILED);
        }
        return publicBaseUrl + "/" + key;
    }

    private static String requireSetting(String value, String environmentVariable) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(environmentVariable + " 환경 변수가 필요합니다.");
        }
        return value;
    }

    private static String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
