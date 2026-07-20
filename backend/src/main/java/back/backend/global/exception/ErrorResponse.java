package back.backend.global.exception;

import java.time.OffsetDateTime;
import java.util.List;

public record ErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String code,
        String message,
        String path,
        List<FieldError> fieldErrors
) {

    public ErrorResponse {
        fieldErrors = List.copyOf(fieldErrors);
    }

    public static ErrorResponse of(ErrorCode errorCode, String message, String path) {
        return of(errorCode, message, path, List.of());
    }

    public static ErrorResponse of(
            ErrorCode errorCode,
            String message,
            String path,
            List<FieldError> fieldErrors
    ) {
        return new ErrorResponse(
                OffsetDateTime.now(),
                errorCode.getStatus().value(),
                errorCode.getCode(),
                message,
                path,
                fieldErrors
        );
    }

    public record FieldError(String field, String reason) {
    }
}
