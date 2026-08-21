package back.backend.global.transaction;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Supplier;

@Component
public class TransactionalReadExecutor {

    @Transactional(readOnly = true)
    public <T> T execute(Supplier<T> loader) {
        return loader.get();
    }
}
