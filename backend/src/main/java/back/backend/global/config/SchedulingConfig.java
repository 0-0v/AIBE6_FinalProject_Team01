package back.backend.global.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    public Clock applicationClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
