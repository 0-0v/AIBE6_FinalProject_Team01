package back.backend.domain.travelrecord.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record RetrospectiveRequest(
        @NotNull @DecimalMin("0.5") @DecimalMax("5.0") BigDecimal rating,
        @Size(max = 5000) String goodPoints,
        @Size(max = 5000) String improvements,
        @Size(max = 5000) String summary
) {
}
