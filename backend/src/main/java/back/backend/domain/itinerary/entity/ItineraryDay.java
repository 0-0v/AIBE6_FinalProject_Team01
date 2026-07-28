package back.backend.domain.itinerary.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "itinerary_days",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_itinerary_days_trip_date",
                columnNames = {"trip_id", "itinerary_date"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItineraryDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "itinerary_date", nullable = false)
    private LocalDate itineraryDate;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItineraryDayStatus status;

    @OneToMany(mappedBy = "itineraryDay", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ItineraryItem> items = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static ItineraryDay create(Long tripId, LocalDate itineraryDate, int dayNumber) {
        ItineraryDay day = new ItineraryDay();
        day.tripId = tripId;
        day.itineraryDate = itineraryDate;
        day.dayNumber = dayNumber;
        day.status = ItineraryDayStatus.DRAFT;
        return day;
    }

    public void updateStatus(ItineraryDayStatus status) {
        this.status = status;
    }

    public void updateDayNumber(int dayNumber) {
        this.dayNumber = dayNumber;
    }
}
