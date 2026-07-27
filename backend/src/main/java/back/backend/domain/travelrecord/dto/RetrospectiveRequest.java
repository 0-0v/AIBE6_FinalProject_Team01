package back.backend.domain.travelrecord.dto;

import jakarta.validation.constraints.Size;

public record RetrospectiveRequest(
        @Size(max = 5000) String goodPoints,
        @Size(max = 5000) String improvements,
        @Size(max = 5000) String summary
) {
}
