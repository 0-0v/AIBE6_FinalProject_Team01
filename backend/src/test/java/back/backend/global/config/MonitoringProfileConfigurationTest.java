package back.backend.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

class MonitoringProfileConfigurationTest {

    @Test
    @DisplayName("t1 운영 프로필은 Prometheus와 Metrics 엔드포인트를 노출하지 않는다")
    void t1_prodProfileDisablesMonitoringEndpoints() throws IOException {
        var sources = new YamlPropertySourceLoader().load(
                "application-prod",
                new ClassPathResource("application-prod.yml")
        );
        PropertySource<?> source = sources.getFirst();

        assertThat(source.getProperty("management.endpoints.web.exposure.include"))
                .isEqualTo("health");
        assertThat(source.getProperty("management.endpoint.prometheus.access"))
                .isEqualTo("none");
        assertThat(source.getProperty("management.endpoint.metrics.access"))
                .isEqualTo("none");
    }
}
