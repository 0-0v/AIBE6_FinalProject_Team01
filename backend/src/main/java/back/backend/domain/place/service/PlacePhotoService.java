package back.backend.domain.place.service;

import back.backend.domain.place.dto.response.GooglePlacesApiResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.service.ExternalApiUsageService;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class PlacePhotoService {

    private static final Logger log = LoggerFactory.getLogger(PlacePhotoService.class);
    private static final String GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1";
    private static final Pattern PHOTO_NAME_PATTERN =
            Pattern.compile("^places/[^/]+/photos/[^/]+$");
    private static final String PHOTO_METADATA_FIELD_MASK =
            "photos.name,photos.googleMapsUri,photos.authorAttributions";

    private final RestClient restClient;
    private ExternalApiUsageService usageService;

    @Autowired
    void setUsageService(ExternalApiUsageService usageService) {
        this.usageService = usageService;
    }

    @Autowired
    public PlacePhotoService(
            @Value("${app.integrations.google-maps.api-key}") String apiKey,
            @Value("${app.integrations.google-maps.referer:}") String referer,
            @Value("${app.integrations.google-maps.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.integrations.google-maps.photo-read-timeout:30s}") Duration readTimeout
    ) {
        this(createRestClientBuilder(connectTimeout, readTimeout), apiKey, referer);
    }

    PlacePhotoService(RestClient.Builder builder, String apiKey, String referer) {
        RestClient.Builder configuredBuilder = builder
                .baseUrl(GOOGLE_PLACES_BASE_URL)
                .defaultHeader("X-Goog-Api-Key", apiKey);
        if (StringUtils.hasText(referer)) {
            configuredBuilder.defaultHeader("Referer", referer);
        }
        this.restClient = configuredBuilder.build();
    }

    public PhotoContent getPhoto(String photoName) {
        if (!StringUtils.hasText(photoName) || !PHOTO_NAME_PATTERN.matcher(photoName).matches()) {
            throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_NAME_INVALID);
        }
        try {
            ResponseEntity<byte[]> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/")
                            .path(photoName)
                            .path("/media")
                            .queryParam("maxWidthPx", 400)
                            .build())
                    .retrieve()
                    .toEntity(byte[].class);
            byte[] bytes = response.getBody();
            if (bytes == null || bytes.length == 0) {
                throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_NOT_FOUND);
            }
            MediaType contentType = response.getHeaders().getContentType();
            recordUsage("PLACE_PHOTO", true);
            return new PhotoContent(bytes, contentType != null ? contentType : MediaType.IMAGE_JPEG);
        } catch (BusinessException exception) {
            recordUsage("PLACE_PHOTO", false);
            throw exception;
        } catch (RestClientException exception) {
            recordUsage("PLACE_PHOTO", false);
            log.warn("Google 장소 사진 조회에 실패했습니다. photoName={}, cause={}",
                    photoName, exception.getMessage());
            throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_EXTERNAL_API_ERROR);
        }
    }

    public PhotoMetadata getPhotoMetadata(String googlePlaceId) {
        if (!StringUtils.hasText(googlePlaceId)) {
            throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_NAME_INVALID);
        }
        try {
            GooglePlacesApiResponse.Place place = restClient.get()
                    .uri("/places/{placeId}", googlePlaceId)
                    .header("X-Goog-FieldMask", PHOTO_METADATA_FIELD_MASK)
                    .retrieve()
                    .body(GooglePlacesApiResponse.Place.class);
            if (place == null || place.photos() == null || place.photos().isEmpty()) {
                throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_NOT_FOUND);
            }

            GooglePlacesApiResponse.Photo photo = place.photos().getFirst();
            if (!StringUtils.hasText(photo.name()) || !StringUtils.hasText(photo.googleMapsUri())) {
                throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_NOT_FOUND);
            }
            List<PhotoAuthor> authors = photo.authorAttributions() == null
                    ? List.of()
                    : photo.authorAttributions().stream()
                    .map(author -> new PhotoAuthor(author.displayName(), author.uri()))
                    .toList();
            recordUsage("PHOTO_METADATA", true);
            return new PhotoMetadata(photo.name(), photo.googleMapsUri(), authors);
        } catch (BusinessException exception) {
            recordUsage("PHOTO_METADATA", false);
            throw exception;
        } catch (RestClientException exception) {
            recordUsage("PHOTO_METADATA", false);
            log.warn("Google 장소 사진 메타데이터 조회에 실패했습니다. placeId={}, cause={}",
                    googlePlaceId, exception.getMessage());
            throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_EXTERNAL_API_ERROR);
        }
    }

    private void recordUsage(String operation, boolean success) {
        if (usageService != null) {
            usageService.recordSafely(ExternalApiProvider.GOOGLE_PLACES, operation,
                    success, null, null);
        }
    }

    private static RestClient.Builder createRestClientBuilder(
            Duration connectTimeout,
            Duration readTimeout
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        return RestClient.builder().requestFactory(requestFactory);
    }

    public record PhotoContent(byte[] bytes, MediaType contentType) {
    }

    public record PhotoMetadata(
            String photoName,
            String googleMapsUri,
            List<PhotoAuthor> authorAttributions
    ) {
    }

    public record PhotoAuthor(String displayName, String uri) {
    }
}
