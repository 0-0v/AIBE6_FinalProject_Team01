package back.backend.domain.place.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GooglePlacesApiResponse(
        List<Place> places
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Place(
            String id,
            DisplayName displayName,
            String formattedAddress,
            Location location,
            List<String> types,
            List<Photo> photos
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DisplayName(
            String text,
            String languageCode
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(
            double latitude,
            double longitude
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Photo(
            String name,
            int widthPx,
            int heightPx
    ) {}
}
