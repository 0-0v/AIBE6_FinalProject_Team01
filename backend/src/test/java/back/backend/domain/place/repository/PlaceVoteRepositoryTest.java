package back.backend.domain.place.repository;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.place.entity.PlaceVoteRequest;
import back.backend.domain.place.entity.PlaceVoteStatus;
import back.backend.global.config.JpaConfig;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class PlaceVoteRepositoryTest {

    @Autowired private PlaceVoteRequestRepository voteRequestRepository;

    @Test
    @DisplayName("t1 장소별 가장 최근 투표 신청만 조회한다")
    void t1_findLatestVoteRequestForEachPlace() {
        voteRequestRepository.save(request(10L, PlaceVoteStatus.CLOSED));
        PlaceVoteRequest latest = voteRequestRepository.save(request(10L, PlaceVoteStatus.OPEN));
        voteRequestRepository.save(request(20L, PlaceVoteStatus.OPEN));

        List<PlaceVoteRequest> result = voteRequestRepository
                .findLatestByTripPlaceIdIn(List.of(10L, 20L));

        assertThat(result).hasSize(2);
        assertThat(result)
                .filteredOn(request -> request.getTripPlaceId().equals(10L))
                .singleElement()
                .extracting(PlaceVoteRequest::getId)
                .isEqualTo(latest.getId());
    }

    private PlaceVoteRequest request(Long tripPlaceId, PlaceVoteStatus status) {
        return PlaceVoteRequest.builder()
                .tripPlaceId(tripPlaceId)
                .createdBy(1L)
                .status(status)
                .requiredResponseCount(2)
                .totalMemberCount(2)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
    }
}
