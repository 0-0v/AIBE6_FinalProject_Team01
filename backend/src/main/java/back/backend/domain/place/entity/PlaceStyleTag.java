package back.backend.domain.place.entity;

import back.backend.domain.trip.entity.TravelStyle;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.EntityListeners;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "place_style_tags")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceStyleTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @Enumerated(EnumType.STRING)
    @Column(name = "style_type", nullable = false, length = 30)
    private TravelStyle styleType;

    @Column(name = "suitability_score", nullable = false, precision = 5, scale = 4)
    private BigDecimal suitabilityScore;

    @Column(nullable = false, length = 30)
    private String source;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private PlaceStyleTag(
            Place place,
            TravelStyle styleType,
            double suitabilityScore,
            String source
    ) {
        this.place = place;
        this.styleType = styleType;
        this.suitabilityScore = BigDecimal.valueOf(suitabilityScore)
                .setScale(4, RoundingMode.HALF_UP);
        this.source = source;
    }

    public static PlaceStyleTag create(
            Place place,
            TravelStyle styleType,
            double suitabilityScore,
            String source
    ) {
        if (suitabilityScore < 0 || suitabilityScore > 1) {
            throw new IllegalArgumentException("스타일 적합도는 0과 1 사이여야 합니다.");
        }
        return new PlaceStyleTag(place, styleType, suitabilityScore, source);
    }

    public double scoreAsDouble() {
        return suitabilityScore.doubleValue();
    }
}
