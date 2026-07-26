package back.backend.global.exception;

import java.util.Arrays;
import java.util.Locale;

public final class DataIntegrityConstraintMatcher {

    private DataIntegrityConstraintMatcher() {
    }

    public static boolean containsConstraint(Throwable throwable, String... constraintNames) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(Locale.ROOT);
                if (Arrays.stream(constraintNames)
                        .map(name -> name.toLowerCase(Locale.ROOT))
                        .anyMatch(normalized::contains)) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }
}
