package back.backend.domain.member.service;

import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PersonalInfoPurgeScheduler {

    private final MemberService memberService;
    private final Clock clock;

    public PersonalInfoPurgeScheduler(MemberService memberService, Clock clock) {
        this.memberService = memberService;
        this.clock = clock;
    }

    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void purgeExpiredPersonalInfo() {
        memberService.purgeExpiredPersonalInfo(LocalDateTime.now(clock));
    }
}
