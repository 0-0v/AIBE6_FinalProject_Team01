package back.backend.domain.itinerary.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
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

    /** 출발지 타입: TRIP_PLACE(저장 장소) | CUSTOM(직접 입력/검색) | null(미설정) */
    @Column(name = "departure_type", length = 20)
    private String departureType;

    @Column(name = "departure_name", length = 100)
    private String departureName;

    @Column(name = "departure_lat", precision = 9, scale = 6)
    private BigDecimal departureLat;

    @Column(name = "departure_lng", precision = 9, scale = 6)
    private BigDecimal departureLng;

    @Column(name = "departure_trip_place_id")
    private Long departureTripPlaceId;

    @Column(name = "departure_travel_minutes")
    private Integer departureTravelMinutes;

    @Column(name = "departure_travel_meters")
    private Integer departureTravelMeters;

    @Column(name = "departure_travel_mode", length = 20)
    private String departureTravelMode;

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

    public void updateItineraryDate(LocalDate itineraryDate) {
        this.itineraryDate = itineraryDate;
    }

    public void updateDeparture(
            String departureType,
            String departureName,
            BigDecimal departureLat,
            BigDecimal departureLng,
            Long departureTripPlaceId
    ) {
        this.departureType = departureType;
        this.departureName = departureName;
        this.departureLat = departureLat;
        this.departureLng = departureLng;
        this.departureTripPlaceId = departureTripPlaceId;
        // 경로 정보는 재계산 후 별도 갱신
        this.departureTravelMinutes = null;
        this.departureTravelMeters = null;
        this.departureTravelMode = null;
    }

    public void updateDepartureTravelInfo(
            Integer travelMinutes,
            Integer travelMeters,
            String travelMode
    ) {
        this.departureTravelMinutes = travelMinutes;
        this.departureTravelMeters = travelMeters;
        this.departureTravelMode = travelMode;
    }

    public void clearDeparture() {
        this.departureType = null;
        this.departureName = null;
        this.departureLat = null;
        this.departureLng = null;
        this.departureTripPlaceId = null;
        this.departureTravelMinutes = null;
        this.departureTravelMeters = null;
        this.departureTravelMode = null;
    }

    public boolean hasDeparture() {
        return departureType != null
                && departureLat != null
                && departureLng != null;
    }
}
