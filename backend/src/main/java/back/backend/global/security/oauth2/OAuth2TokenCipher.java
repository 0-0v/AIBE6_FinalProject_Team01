package back.backend.global.security.oauth2;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class OAuth2TokenCipher {

    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom secureRandom = new SecureRandom();

    public OAuth2TokenCipher(OAuth2TokenProperties properties) {
        if (properties.getEncryptionKey() == null || properties.getEncryptionKey().isBlank()) {
            this.key = null;
            return;
        }
        byte[] decodedKey;
        try {
            decodedKey = Base64.getDecoder().decode(properties.getEncryptionKey());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new IllegalStateException("OAUTH_TOKEN_ENCRYPTION_KEY must be a Base64 encoded AES key", exception);
        }
        if (decodedKey.length != 32) {
            throw new IllegalStateException("OAUTH_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
        }
        this.key = new SecretKeySpec(decodedKey, "AES");
    }

    public String encrypt(String plainText) {
        requireConfiguredKey();
        byte[] iv = new byte[IV_LENGTH];
        secureRandom.nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] result = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, result, 0, iv.length);
            System.arraycopy(encrypted, 0, result, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(result);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("OAuth token encryption failed", exception);
        }
    }

    public String decrypt(String encryptedText) {
        requireConfiguredKey();
        byte[] value = Base64.getDecoder().decode(encryptedText);
        if (value.length <= IV_LENGTH) {
            throw new IllegalArgumentException("Encrypted OAuth token is invalid");
        }
        byte[] iv = new byte[IV_LENGTH];
        byte[] encrypted = new byte[value.length - IV_LENGTH];
        System.arraycopy(value, 0, iv, 0, IV_LENGTH);
        System.arraycopy(value, IV_LENGTH, encrypted, 0, encrypted.length);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("OAuth token decryption failed", exception);
        }
    }

    private void requireConfiguredKey() {
        if (key == null) {
            throw new IllegalStateException("OAUTH_TOKEN_ENCRYPTION_KEY is required for social login");
        }
    }
}
