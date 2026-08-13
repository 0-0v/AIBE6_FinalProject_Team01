package back.backend.domain.place.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.EntityListeners;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "place_relations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_place_relations_pair",
                columnNames = {"from_place_id", "to_place_id"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_place_id", nullable = false)
    private Long fromPlaceId;

    @Column(name = "to_place_id", nullable = false)
    private Long toPlaceId;

    @Column(name = "co_visit_count", nullable = false)
    private int coVisitCount;

    @CreatedDate
    @Column(name = "computed_at", nullable = false)
    private LocalDateTime computedAt;

    private PlaceRelation(
            Long fromPlaceId,
            Long toPlaceId,
            int coVisitCount,
            LocalDateTime computedAt
    ) {
        this.fromPlaceId = fromPlaceId;
        this.toPlaceId = toPlaceId;
        this.coVisitCount = coVisitCount;
        this.computedAt = computedAt;
    }

    public static PlaceRelation create(
            Long fromPlaceId,
            Long toPlaceId,
            int coVisitCount,
            LocalDateTime computedAt
    ) {
        if (fromPlaceId == null || toPlaceId == null
                || fromPlaceId.equals(toPlaceId)) {
            throw new IllegalArgumentException(
                    "장소 관계는 서로 다른 두 장소여야 합니다."
            );
        }
        long normalizedFrom = Math.min(fromPlaceId, toPlaceId);
        long normalizedTo = Math.max(fromPlaceId, toPlaceId);
        return new PlaceRelation(
                normalizedFrom,
                normalizedTo,
                coVisitCount,
                computedAt
        );
    }
}
