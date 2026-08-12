package back.backend.domain.card.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trip_card_bookmark_shares", uniqueConstraints = @UniqueConstraint(
        name = "uk_trip_card_bookmark_shares_trip_card_member",
        columnNames = {"trip_id", "plan_card_id", "member_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripCardBookmarkShare {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "trip_id", nullable = false) private Long tripId;
    @Column(name = "plan_card_id", nullable = false) private Long planCardId;
    @Column(name = "member_id", nullable = false) private Long memberId;
    @Column(name = "shared_at", nullable = false) private LocalDateTime sharedAt;

    public static TripCardBookmarkShare create(Long tripId, Long planCardId, Long memberId) {
        var share = new TripCardBookmarkShare();
        share.tripId = tripId; share.planCardId = planCardId; share.memberId = memberId;
        share.sharedAt = LocalDateTime.now();
        return share;
    }
}
