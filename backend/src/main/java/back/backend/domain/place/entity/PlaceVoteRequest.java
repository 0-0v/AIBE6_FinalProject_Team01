package back.backend.domain.place.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "place_vote_requests")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceVoteRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_place_id", nullable = false)
    private Long tripPlaceId;

    @Column(name = "secondary_trip_place_id")
    private Long secondaryTripPlaceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false, length = 30)
    private PlaceVoteType voteType;

    @Column(name = "creator_comment", length = 500)
    private String creatorComment;

    @Column(name = "primary_ai_description", columnDefinition = "TEXT")
    private String primaryAiDescription;

    @Column(name = "secondary_ai_description", columnDefinition = "TEXT")
    private String secondaryAiDescription;

    @Column(name = "comparison_summary", columnDefinition = "TEXT")
    private String comparisonSummary;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private PlaceVoteResult result;

    @Column(name = "winner_trip_place_id")
    private Long winnerTripPlaceId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlaceVoteStatus status;

    @Column(name = "required_response_count", nullable = false)
    private int requiredResponseCount;

    @Column(name = "total_member_count", nullable = false)
    private int totalMemberCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public void close(LocalDateTime closedAt) {
        status = PlaceVoteStatus.CLOSED;
        this.closedAt = closedAt;
    }

    public void close(LocalDateTime closedAt, PlaceVoteResult result, Long winnerTripPlaceId) {
        close(closedAt);
        this.result = result;
        this.winnerTripPlaceId = winnerTripPlaceId;
    }
}
