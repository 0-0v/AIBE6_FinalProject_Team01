package back.backend.domain.auth.dto;

public record AdminOtpChallengeResponse(String challengeToken, String maskedEmail, long expiresInSeconds) {}
