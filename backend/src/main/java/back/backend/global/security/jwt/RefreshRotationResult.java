package back.backend.global.security.jwt;

public record RefreshRotationResult(Status status, String refreshToken) {

    public enum Status {
        ROTATED,
        ALREADY_ROTATED,
        INVALID
    }

    public static RefreshRotationResult rotated(String refreshToken) {
        return new RefreshRotationResult(Status.ROTATED, refreshToken);
    }

    public static RefreshRotationResult alreadyRotated(String refreshToken) {
        return new RefreshRotationResult(Status.ALREADY_ROTATED, refreshToken);
    }

    public static RefreshRotationResult invalid() {
        return new RefreshRotationResult(Status.INVALID, null);
    }

    public boolean isValid() {
        return status != Status.INVALID;
    }
}
