package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OAuth2TokenCipherTest {

    @Test
    @DisplayName("t1 OAuth 토큰을 AES-GCM으로 암호화하면 평문과 다르고 다시 복호화할 수 있다")
    void t1_encryptAndDecryptOAuthToken() {
        OAuth2TokenProperties properties = new OAuth2TokenProperties();
        properties.setEncryptionKey(Base64.getEncoder().encodeToString(new byte[32]));
        OAuth2TokenCipher cipher = new OAuth2TokenCipher(properties);

        String encrypted = cipher.encrypt("oauth-refresh-token");

        assertThat(encrypted).isNotEqualTo("oauth-refresh-token");
        assertThat(cipher.decrypt(encrypted)).isEqualTo("oauth-refresh-token");
    }
}
