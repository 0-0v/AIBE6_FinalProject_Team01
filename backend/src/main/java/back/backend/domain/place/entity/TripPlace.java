package back.backend.domain.place.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "trip_places")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class TripPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Trip 도메인 완성 전까지 FK 없이 Long으로 관리
    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @Column(name = "category_id")
    private Long categoryId;

    // 인증 도메인 완성 전까지 FK 없이 Long으로 관리
    @Column(name = "added_by", nullable = false)
    private Long addedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripPlaceStatus status;

    @Column(name = "user_note", columnDefinition = "TEXT")
    private String userNote;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void updateStatus(TripPlaceStatus status) {
        this.status = status;
    }

    public void updateNote(String userNote) {
        this.userNote = userNote;
    }
}
