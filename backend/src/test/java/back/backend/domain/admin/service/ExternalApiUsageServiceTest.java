package back.backend.domain.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.entity.ExternalApiUsage;
import back.backend.domain.admin.repository.ExternalApiUsageRepository;
import back.backend.global.security.MemberPrincipal;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class ExternalApiUsageServiceTest {
    @Mock ExternalApiUsageRepository repository;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("t1 로그인 회원의 외부 API 호출을 회원 식별자와 함께 기록한다")
    void t1_recordStoresCurrentMemberAndTokenUsage() {
        MemberPrincipal principal = new MemberPrincipal(7L, "user@example.com", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
        ExternalApiUsageService service = new ExternalApiUsageService(repository);

        service.recordSafely(ExternalApiProvider.OPENAI, "RESPONSES", true, 120, 35);

        ArgumentCaptor<ExternalApiUsage> captor = ArgumentCaptor.forClass(ExternalApiUsage.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getMemberId()).isEqualTo(7L);
        assertThat(captor.getValue().getInputTokens()).isEqualTo(120);
        assertThat(captor.getValue().getOutputTokens()).isEqualTo(35);
    }
}
