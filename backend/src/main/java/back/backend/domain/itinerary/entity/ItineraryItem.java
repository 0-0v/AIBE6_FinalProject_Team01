package back.backend.domain.itinerary.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "itinerary_items",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_itinerary_items_day_sort_order",
                        columnNames = {"itinerary_day_id", "sort_order"}
                ),
                @UniqueConstraint(
                        name = "uk_itinerary_items_trip_place",
                        columnNames = "trip_place_id"
                )
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItineraryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "itinerary_day_id", nullable = false)
    private ItineraryDay itineraryDay;

    @Column(name = "trip_place_id")
    private Long tripPlaceId;

    @Column(length = 100)
    private String title;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "transport_minutes")
    private Integer transportMinutes;

    @Column(name = "transport_meters")
    private Integer transportMeters;

    @Column(name = "transport_mode", length = 20)
    private String transportMode;

    @Column(name = "transport_detail", length = 255)
    private String transportDetail;

    @Column(name = "transport_mode_manual", nullable = false)
    private boolean transportModeManual;

    @Column(name = "transport_mode_preference", length = 20)
    private String transportModePreference;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static ItineraryItem create(ItineraryDay day, Long tripPlaceId, int sortOrder) {
        ItineraryItem item = new ItineraryItem();
        item.itineraryDay = day;
        item.tripPlaceId = tripPlaceId;
        item.sortOrder = sortOrder;
        return item;
    }

    public void updateDay(ItineraryDay day) {
        this.itineraryDay = day;
    }

    public void updateSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void shiftTimes(long minutes) {
        if (startTime != null) {
            startTime = startTime.plusMinutes(minutes);
        }
        if (endTime != null) {
            endTime = endTime.plusMinutes(minutes);
        }
    }

    public void updateDetails(LocalTime startTime, LocalTime endTime, String memo,
                               Integer transportMinutes, Integer transportMeters,
                               String transportMode) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.memo = memo;
        this.transportMinutes = transportMinutes;
        this.transportMeters = transportMeters;
        this.transportMode = transportMode;
    }

    public void updateTravelInformation(
            Integer transportMinutes,
            Integer transportMeters,
            String transportMode
    ) {
        updateTravelInformation(
                transportMinutes,
                transportMeters,
                transportMode,
                null,
                false,
                null
        );
    }

    public void updateTravelInformation(
            Integer transportMinutes,
            Integer transportMeters,
            String transportMode,
            String transportDetail,
            boolean transportModeManual,
            String transportModePreference
    ) {
        this.transportMinutes = transportMinutes;
        this.transportMeters = transportMeters;
        this.transportMode = transportMode;
        this.transportDetail = transportDetail;
        this.transportModeManual = transportModeManual;
        this.transportModePreference = transportModePreference;
    }
}
