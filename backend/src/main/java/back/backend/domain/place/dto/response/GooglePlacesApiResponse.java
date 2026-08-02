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
            String primaryType,
            List<String> types,
            List<Photo> photos,
            Double rating,
            Integer userRatingCount,
            String businessStatus,
            CurrentOpeningHours currentOpeningHours,
            RegularOpeningHours regularOpeningHours,
            String nationalPhoneNumber,
            String websiteUri,
            EditorialSummary editorialSummary,
            List<Review> reviews
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CurrentOpeningHours(
            Boolean openNow,
            String nextOpenTime,
            String nextCloseTime,
            List<String> weekdayDescriptions
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RegularOpeningHours(
            Boolean openNow,
            List<String> weekdayDescriptions
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EditorialSummary(
            String text,
            String languageCode
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Review(
            String relativePublishTimeDescription,
            Integer rating,
            LocalizedText text,
            AuthorAttribution authorAttribution
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LocalizedText(
            String text,
            String languageCode
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AuthorAttribution(
            String displayName,
            String uri,
            String photoUri
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
