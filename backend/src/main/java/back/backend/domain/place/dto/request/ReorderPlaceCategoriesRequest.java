package back.backend.domain.place.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ReorderPlaceCategoriesRequest(
        @NotEmpty List<@NotNull Long> categoryIds
) {
}
