package back.backend.global.realtime;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TripAwarenessRequestTest {

    private final Validator validator = Validation
            .buildDefaultValidatorFactory()
            .getValidator();

    @Test
    @DisplayName("t1 votes 작업공간은 유효성 검사를 통과한다")
    void t1_votesWorkspacePassesValidation() {
        TripAwarenessRequest request = new TripAwarenessRequest(
                "votes", null, null, null, null, null, null,
                null, null, null
        );

        assertThat(validator.validate(request)).isEmpty();
    }
}
