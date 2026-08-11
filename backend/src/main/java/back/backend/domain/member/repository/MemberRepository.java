package back.backend.domain.member.repository;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MemberRepository extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> {

    Optional<Member> findByProviderAndProviderId(AuthProvider provider, String providerId);

    Optional<Member> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<Member> findByEmailAndProvider(String email, AuthProvider provider);

    Optional<Member> findByNicknameAndProvider(String nickname, AuthProvider provider);

    boolean existsByNicknameAndProvider(String nickname, AuthProvider provider);

    boolean existsByNicknameAndIdNot(String nickname, Long id);

    List<Member> findAllByStatusAndPersonalInfoExpiresAtLessThanEqualAndPersonalInfoDeletedAtIsNull(
            MemberStatus status,
            LocalDateTime expiresAt
    );

    long countByStatus(MemberStatus status);
}
