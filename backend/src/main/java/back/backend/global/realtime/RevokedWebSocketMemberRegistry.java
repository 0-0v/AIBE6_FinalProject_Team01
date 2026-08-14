package back.backend.global.realtime;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class RevokedWebSocketMemberRegistry {
    private final Set<Long> revokedMemberIds = ConcurrentHashMap.newKeySet();

    public void revoke(Long memberId) {
        revokedMemberIds.add(memberId);
    }

    public void allow(Long memberId) {
        revokedMemberIds.remove(memberId);
    }

    public boolean isRevoked(Long memberId) {
        return revokedMemberIds.contains(memberId);
    }
}
