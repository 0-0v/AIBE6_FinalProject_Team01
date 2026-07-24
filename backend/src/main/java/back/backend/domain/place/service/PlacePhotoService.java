package back.backend.domain.place.service;

import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import java.time.Duration;
import java.util.regex.Pattern;
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

    private static final String GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1";
    private static final Pattern PHOTO_NAME_PATTERN =
            Pattern.compile("^places/[^/]+/photos/[^/]+$");

    private final RestClient restClient;

    @Autowired
    public PlacePhotoService(
            @Value("${app.integrations.google-maps.api-key}") String apiKey,
            @Value("${app.integrations.google-maps.referer:}") String referer,
            @Value("${app.integrations.google-maps.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.integrations.google-maps.read-timeout:5s}") Duration readTimeout
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
            return new PhotoContent(bytes, contentType != null ? contentType : MediaType.IMAGE_JPEG);
        } catch (BusinessException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new BusinessException(PlaceErrorCode.PLACE_PHOTO_EXTERNAL_API_ERROR);
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
}
