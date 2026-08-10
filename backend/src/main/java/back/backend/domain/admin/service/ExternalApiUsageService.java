package back.backend.domain.admin.service;

import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.entity.ExternalApiUsage;
import back.backend.domain.admin.repository.ExternalApiUsageRepository;
import back.backend.global.security.MemberPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExternalApiUsageService {
    private final ExternalApiUsageRepository repository;

    public ExternalApiUsageService(ExternalApiUsageRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(ExternalApiProvider provider, String operation, boolean success,
                       Integer inputTokens, Integer outputTokens) {
        repository.save(ExternalApiUsage.create(currentMemberId(), provider, operation,
                success, inputTokens, outputTokens));
    }

    private Long currentMemberId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof MemberPrincipal principal)) {
            return null;
        }
        return principal.getMemberId();
    }
}
