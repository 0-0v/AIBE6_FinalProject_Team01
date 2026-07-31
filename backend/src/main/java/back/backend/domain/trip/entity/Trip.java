package back.backend.domain.trip.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "trips")
@EntityListeners(AuditingEntityListener.class)
public class Trip {

    private static final int MAX_TITLE_LENGTH = 100;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String destination;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "transport_type", length = 30)
    private String transportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "companion_type", length = 30)
    private CompanionType companionType;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "trip_travel_styles", joinColumns = @JoinColumn(name = "trip_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "travel_style", nullable = false, length = 30)
    private Set<TravelStyle> travelStyles = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripStatus status;

    @Column(name = "budget_per_person", precision = 12, scale = 2)
    private BigDecimal budgetPerPerson;

    @Column(name = "total_budget", precision = 12, scale = 2)
    private BigDecimal totalBudget;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(name = "meeting_place_id")
    private Long meetingPlaceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripVisibility visibility;

    @Column(name = "day_start_time", nullable = false)
    private LocalTime dayStartTime = LocalTime.of(9, 0);

    @Column(name = "day_end_time", nullable = false)
    private LocalTime dayEndTime = LocalTime.of(21, 0);

    @Enumerated(EnumType.STRING)
    @Column(name = "travel_pace", nullable = false, length = 20)
    private TravelPace travelPace = TravelPace.NORMAL;

    @Column(name = "completion_confirmed_at")
    private LocalDateTime completionConfirmedAt;

    @Column(name = "view_count", nullable = false)
    private long viewCount;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Trip() {
    }

    private Trip(
            Long ownerId,
            String title,
            CompanionType companionType,
            Set<TravelStyle> travelStyles,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            TripVisibility visibility
    ) {
        this.ownerId = Objects.requireNonNull(ownerId, "ownerId must not be null");
        this.title = validateTitle(title);
        validateDateRange(startDate, endDate);
        this.companionType = companionType;
        this.travelStyles = copyStyles(travelStyles);
        this.destination = normalizeNullable(destination);
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = TripStatus.PLANNING;
        this.currency = "KRW";
        this.visibility = Objects.requireNonNull(visibility, "visibility must not be null");
        this.viewCount = 0L;
    }

    public static Trip create(
            Long ownerId,
            String title,
            CompanionType companionType,
            Set<TravelStyle> travelStyles,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            TripVisibility visibility
    ) {
        return new Trip(ownerId, title, companionType, travelStyles, destination, startDate, endDate, visibility);
    }

    public static Trip create(
            Long ownerId,
            String title,
            CompanionType companionType,
            Set<TravelStyle> travelStyles,
            String destination,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return create(ownerId, title, companionType, travelStyles, destination, startDate, endDate,
                TripVisibility.PRIVATE);
    }

    public void update(
            String title,
            CompanionType companionType,
            Set<TravelStyle> travelStyles,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            LocalTime dayStartTime,
            LocalTime dayEndTime,
            TravelPace travelPace
    ) {
        ensureMutable();
        this.title = validateTitle(title);
        validateDateRange(startDate, endDate);
        this.companionType = companionType;
        this.travelStyles.clear();
        this.travelStyles.addAll(copyStyles(travelStyles));
        this.destination = normalizeNullable(destination);
        this.startDate = startDate;
        this.endDate = endDate;
        if (dayStartTime != null) this.dayStartTime = dayStartTime;
        if (dayEndTime   != null) this.dayEndTime   = dayEndTime;
        if (travelPace   != null) this.travelPace   = travelPace;
    }

    public void completeAutomatically(LocalDate today) {
        ensureMutable();
        if (endDate == null || !endDate.isBefore(Objects.requireNonNull(today, "today must not be null"))) {
            throw new IllegalStateException("종료일이 지나지 않은 여행방은 완료할 수 없습니다.");
        }
        this.status = TripStatus.COMPLETED;
        this.visibility = TripVisibility.PRIVATE;
        this.completionConfirmedAt = null;
    }

    public void confirmCompletion(TripVisibility visibility, LocalDateTime confirmedAt) {
        if (status != TripStatus.COMPLETED) {
            throw new IllegalStateException("완료된 여행방만 완료 확인할 수 있습니다.");
        }
        this.visibility = Objects.requireNonNull(visibility, "visibility must not be null");
        this.completionConfirmedAt =
                Objects.requireNonNull(confirmedAt, "confirmedAt must not be null");
    }

    public void changeVisibility(TripVisibility visibility) {
        this.visibility = Objects.requireNonNull(visibility, "visibility must not be null");
    }

    public void cancel() {
        ensureMutable();
        this.status = TripStatus.CANCELLED;
    }

    public void confirmDates(LocalDate startDate, LocalDate endDate) {
        ensureMutable();
        validateDateRange(startDate, endDate);
        if (startDate == null) {
            throw new IllegalArgumentException("확정할 여행 기간을 입력해야 합니다.");
        }
        this.startDate = startDate;
        this.endDate = endDate;
    }

    private void ensureMutable() {
        if (status == TripStatus.COMPLETED || status == TripStatus.CANCELLED) {
            throw new IllegalStateException("이미 완료되었거나 취소된 여행방입니다.");
        }
    }

    private static String validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("여행방 이름은 비어 있을 수 없습니다.");
        }
        String normalized = title.trim();
        if (normalized.length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("여행방 이름은 100자 이하여야 합니다.");
        }
        return normalized;
    }

    private static void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if ((startDate == null) != (endDate == null)) {
            throw new IllegalArgumentException("여행 시작일과 종료일은 함께 입력해야 합니다.");
        }
        if (startDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("여행 종료일은 시작일보다 빠를 수 없습니다.");
        }
    }

    private static Set<TravelStyle> copyStyles(Set<TravelStyle> travelStyles) {
        if (travelStyles == null || travelStyles.isEmpty()) {
            return new LinkedHashSet<>();
        }
        if (travelStyles.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("여행 스타일에는 빈 값을 포함할 수 없습니다.");
        }
        return new LinkedHashSet<>(travelStyles);
    }

    private static String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getDestination() {
        return destination;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getCoverImageUrl() {
        return coverImageUrl;
    }

    public void changeCoverImage(String coverImageUrl) {
        this.coverImageUrl = Objects.requireNonNull(
                coverImageUrl,
                "coverImageUrl must not be null"
        );
    }

    public String getTransportType() {
        return transportType;
    }

    public CompanionType getCompanionType() {
        return companionType;
    }

    public Set<TravelStyle> getTravelStyles() {
        return Set.copyOf(travelStyles);
    }

    public TripStatus getStatus() {
        return status;
    }

    public BigDecimal getBudgetPerPerson() {
        return budgetPerPerson;
    }

    public BigDecimal getTotalBudget() {
        return totalBudget;
    }

    public String getCurrency() {
        return currency;
    }

    public Long getMeetingPlaceId() {
        return meetingPlaceId;
    }

    public TripVisibility getVisibility() {
        return visibility;
    }

    public boolean isCompletionConfirmed() {
        return completionConfirmedAt != null;
    }

    public LocalTime getDayStartTime() {
        return dayStartTime;
    }

    public LocalTime getDayEndTime() {
        return dayEndTime;
    }

    public TravelPace getTravelPace() {
        return travelPace;
    }

    public long getViewCount() {
        return viewCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
