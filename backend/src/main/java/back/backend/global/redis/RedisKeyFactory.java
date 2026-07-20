package back.backend.global.redis;

import java.util.Arrays;
import java.util.Objects;
import java.util.stream.Collectors;

public final class RedisKeyFactory {

    private static final String DELIMITER = ":";

    private RedisKeyFactory() {
    }

    public static String create(String namespace, Object... parts) {
        validateSegment(namespace, "namespace");
        Objects.requireNonNull(parts, "parts must not be null");

        String suffix = Arrays.stream(parts)
                .map(part -> Objects.requireNonNull(part, "key part must not be null").toString())
                .peek(part -> validateSegment(part, "key part"))
                .collect(Collectors.joining(DELIMITER));

        return suffix.isEmpty() ? namespace : namespace + DELIMITER + suffix;
    }

    private static void validateSegment(String segment, String name) {
        if (segment == null || segment.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        if (segment.contains(DELIMITER)) {
            throw new IllegalArgumentException(name + " must not contain ':'");
        }
    }
}
