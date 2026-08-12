package back.backend.global.exception;

import back.backend.domain.auth.dto.SuspendedAccountErrorResponse;
import back.backend.domain.auth.exception.EmailVerificationCooldownException;
import back.backend.domain.auth.exception.SuspendedAccountException;
import back.backend.global.exception.ErrorResponse.FieldError;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SuspendedAccountException.class)
    public ResponseEntity<SuspendedAccountErrorResponse> handleSuspendedAccountException(
            SuspendedAccountException exception,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(exception.getErrorCode().getStatus())
                .body(SuspendedAccountErrorResponse.from(exception, request.getRequestURI()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException exception,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = exception.getErrorCode();
        ErrorResponse response = ErrorResponse.of(errorCode, exception.getMessage(), request.getRequestURI());
        return ResponseEntity.status(errorCode.getStatus()).body(response);
    }

    @ExceptionHandler(EmailVerificationCooldownException.class)
    public ResponseEntity<ErrorResponse> handleEmailVerificationCooldown(
            EmailVerificationCooldownException exception,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = exception.getErrorCode();
        ErrorResponse response = ErrorResponse.of(
                errorCode, exception.getMessage(), request.getRequestURI());
        return ResponseEntity.status(errorCode.getStatus())
                .header("Retry-After", Long.toString(exception.getRetryAfterSeconds()))
                .body(response);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ResponseEntity<ErrorResponse> handleValidationException(
            BindException exception,
            HttpServletRequest request
    ) {
        List<FieldError> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldError(error.getField(), error.getDefaultMessage()))
                .toList();
        ErrorResponse response = ErrorResponse.of(
                CommonErrorCode.BAD_REQUEST,
                "요청 값이 올바르지 않습니다.",
                request.getRequestURI(),
                fieldErrors
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler({
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            Exception exception,
            HttpServletRequest request
    ) {
        ErrorResponse response = ErrorResponse.of(
                CommonErrorCode.BAD_REQUEST,
                CommonErrorCode.BAD_REQUEST.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException exception,
            HttpServletRequest request
    ) {
        if (!isKnownDuplicateConstraint(exception)) {
            return handleUnexpectedException(exception, request);
        }
        log.warn("Data integrity conflict at {} ({})",
                request.getRequestURI(), exception.getClass().getSimpleName());
        ErrorResponse response = ErrorResponse.of(
                CommonErrorCode.CONFLICT,
                CommonErrorCode.CONFLICT.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(CommonErrorCode.CONFLICT.getStatus()).body(response);
    }

    private boolean isKnownDuplicateConstraint(Throwable throwable) {
        return DataIntegrityConstraintMatcher.containsConstraint(
                throwable,
                "uk_trip_places_trip_place",
                "uk_places_google_place_id",
                "uk_place_vote_responses_request_member",
                "uk_members_email",
                "uk_members_local_email",
                "uk_members_local_nickname",
                "uk_itinerary_items_day_sort_order",
                "uk_itinerary_items_trip_place"
        );
    }

    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<ErrorResponse> handleMessageNotWritable(
            HttpMessageNotWritableException exception,
            HttpServletRequest request
    ) {
        if (isClientDisconnect(exception)) {
            log.debug("Client disconnected before response was sent: {} {}",
                    request.getMethod(), request.getRequestURI());
            return ResponseEntity.internalServerError().build();
        }
        return handleUnexpectedException(exception, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error("Unhandled exception", exception);
        ErrorResponse response = ErrorResponse.of(
                CommonErrorCode.INTERNAL_SERVER_ERROR,
                CommonErrorCode.INTERNAL_SERVER_ERROR.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.internalServerError().body(response);
    }

    private static boolean isClientDisconnect(Throwable throwable) {
        Throwable cause = throwable;
        while (cause != null) {
            if (cause instanceof ClientAbortException) {
                return true;
            }
            String message = cause.getMessage();
            if (message != null && (message.contains("Broken pipe")
                    || message.contains("Connection reset by peer"))) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
