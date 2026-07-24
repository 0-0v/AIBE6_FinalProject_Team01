package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.trip.dto.DateAvailabilityResponse;
import back.backend.domain.trip.dto.DateProposalRequest;
import back.backend.domain.trip.dto.DateProposalResponse;
import back.backend.domain.trip.dto.DateVoteRequest;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@JdbcTest
@ActiveProfiles("test")
@TestPropertySource(properties =
        "spring.datasource.url=jdbc:h2:mem:tripplanning;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE")
@Import(TripPlanningService.class)
class TripPlanningServiceTest {

    @Autowired
    private TripPlanningService tripPlanningService;

    @Autowired
    private JdbcClient jdbcClient;

    @MockitoBean
    private TripAccessChecker accessChecker;

    @MockitoBean
    private TripRepository tripRepository;

    @MockitoBean
    private TripMemberRepository tripMemberRepository;

    @MockitoBean
    private CollaborationEventService collaborationEventService;

    @BeforeEach
    void setUp() {
        jdbcClient.sql("DROP TABLE IF EXISTS trip_date_votes").update();
        jdbcClient.sql("DROP TABLE IF EXISTS trip_date_proposals").update();
        jdbcClient.sql("DROP TABLE IF EXISTS trip_date_availabilities").update();
        jdbcClient.sql("DROP TABLE IF EXISTS trip_members").update();
        jdbcClient.sql("DROP TABLE IF EXISTS members").update();
        jdbcClient.sql("""
                CREATE TABLE members (
                    id BIGINT PRIMARY KEY,
                    nickname VARCHAR(50) NOT NULL,
                    profile_image_url VARCHAR(500)
                )
                """).update();
        jdbcClient.sql("""
                CREATE TABLE trip_members (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    trip_id BIGINT NOT NULL,
                    member_id BIGINT NOT NULL,
                    role VARCHAR(20) NOT NULL,
                    joined_at TIMESTAMP NOT NULL
                )
                """).update();
        jdbcClient.sql("""
                CREATE TABLE trip_date_availabilities (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    trip_id BIGINT NOT NULL,
                    member_id BIGINT NOT NULL,
                    available_date DATE NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    CONSTRAINT uk_test_availability UNIQUE (trip_id, member_id, available_date)
                )
                """).update();
        jdbcClient.sql("""
                CREATE TABLE trip_date_proposals (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    trip_id BIGINT NOT NULL UNIQUE,
                    proposed_by BIGINT NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                )
                """).update();
        jdbcClient.sql("""
                CREATE TABLE trip_date_votes (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    proposal_id BIGINT NOT NULL,
                    member_id BIGINT NOT NULL,
                    choice VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    CONSTRAINT uk_test_date_vote UNIQUE (proposal_id, member_id)
                )
                """).update();
        jdbcClient.sql("INSERT INTO members(id, nickname) VALUES (1, '민지'), (2, '준호')").update();
        jdbcClient.sql("""
                INSERT INTO trip_members(trip_id, member_id, role, joined_at)
                VALUES (10, 1, 'OWNER', CURRENT_TIMESTAMP), (10, 2, 'VIEWER', CURRENT_TIMESTAMP)
                """).update();
        jdbcClient.sql("""
                INSERT INTO trip_date_availabilities(trip_id, member_id, available_date, created_at)
                VALUES (10, 1, DATE '2026-08-12', CURRENT_TIMESTAMP)
                """).update();
        given(accessChecker.requireView(10L)).willReturn(1L);
        given(accessChecker.requireEdit(10L)).willReturn(1L);
        given(tripMemberRepository.findMemberIdsByTripId(10L))
                .willReturn(List.of(1L, 2L, 3L));
    }

    @Test
    @DisplayName("t1 가능 날짜가 없는 멤버도 닉네임과 함께 히트맵 응답에 포함한다")
    void t1_memberWithoutDatesIsIncludedInHeatmapResponse() {
        List<DateAvailabilityResponse> result = tripPlanningService.getAvailability(10L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).nickname()).isEqualTo("민지");
        assertThat(result.get(0).availableDates()).containsExactly(LocalDate.of(2026, 8, 12));
        assertThat(result.get(1).nickname()).isEqualTo("준호");
        assertThat(result.get(1).availableDates()).isEmpty();
    }

    @Test
    @DisplayName("t2 내 가능 날짜를 교체하면 정렬된 최신 날짜와 전체 멤버 현황을 반환한다")
    void t2_replaceAvailabilityReturnsUpdatedHeatmap() {
        List<DateAvailabilityResponse> result = tripPlanningService.replaceAvailability(
                10L,
                Set.of(LocalDate.of(2026, 8, 15), LocalDate.of(2026, 8, 13))
        );

        DateAvailabilityResponse mine = result.stream()
                .filter(member -> member.memberId().equals(1L))
                .findFirst()
                .orElseThrow();
        assertThat(mine.availableDates()).containsExactly(
                LocalDate.of(2026, 8, 13),
                LocalDate.of(2026, 8, 15)
        );
        verify(collaborationEventService).record(
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("DATE_AVAILABILITY_UPDATED"),
                org.mockito.ArgumentMatchers.eq("TRIP_MEMBER"),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    @DisplayName("t3 가능 날짜가 최대 개수를 초과하면 저장을 거부한다")
    void t3_replaceAvailabilityRejectsTooManyDates() {
        Set<LocalDate> dates = IntStream.range(0, 367)
                .mapToObj(day -> LocalDate.of(2026, 1, 1).plusDays(day))
                .collect(Collectors.toSet());

        assertThatThrownBy(() -> tripPlanningService.replaceAvailability(10L, dates))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(TripErrorCode.INVALID_DATE_AVAILABILITY);
    }

    @Test
    @DisplayName("t4 지원 범위를 벗어난 가능 날짜가 있으면 저장을 거부한다")
    void t4_replaceAvailabilityRejectsUnsupportedDate() {
        Set<LocalDate> dates = Set.of(LocalDate.of(2101, 1, 1));

        assertThatThrownBy(() -> tripPlanningService.replaceAvailability(10L, dates))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(TripErrorCode.INVALID_DATE_AVAILABILITY);
    }

    @Test
    @DisplayName("t5 날짜 범위를 제안하면 열린 제안으로 저장한다")
    void t5_proposeCreatesOpenProposal() {
        DateProposalResponse result = tripPlanningService.propose(
                10L,
                new DateProposalRequest(LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 15))
        );

        assertThat(result.status()).isEqualTo("OPEN");
        assertThat(result.startDate()).isEqualTo(LocalDate.of(2026, 8, 12));
        assertThat(result.requiredCount()).isEqualTo(2);
        verify(collaborationEventService).record(
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("DATE_PROPOSAL_UPDATED"),
                org.mockito.ArgumentMatchers.eq("DATE_PROPOSAL"),
                org.mockito.ArgumentMatchers.eq(result.proposalId()),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    @DisplayName("t6 날짜 제안을 덮어쓰면 기존 투표를 초기화한다")
    void t6_overwriteProposalClearsExistingVotes() {
        long proposalId = insertProposal("OPEN");
        insertVote(proposalId, 2L, "AGREE");

        DateProposalResponse result = tripPlanningService.propose(
                10L,
                new DateProposalRequest(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 3))
        );

        Long voteCount = jdbcClient.sql("SELECT COUNT(*) FROM trip_date_votes")
                .query(Long.class)
                .single();
        assertThat(voteCount).isZero();
        assertThat(result.startDate()).isEqualTo(LocalDate.of(2026, 9, 1));
    }

    @Test
    @DisplayName("t7 날짜 제안이 과반 찬성을 얻으면 여행 기간을 확정한다")
    void t7_voteConfirmsProposalOnMajorityAgreement() {
        long proposalId = insertProposal("OPEN");
        insertVote(proposalId, 2L, "AGREE");
        Trip trip = org.mockito.Mockito.mock(Trip.class);
        given(tripRepository.findById(10L)).willReturn(java.util.Optional.of(trip));

        DateProposalResponse result = tripPlanningService.vote(
                10L,
                new DateVoteRequest(DateVoteRequest.Choice.AGREE)
        );

        assertThat(result.status()).isEqualTo("CONFIRMED");
        verify(trip).confirmDates(LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 15));
        verify(collaborationEventService, never()).record(
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("DATE_PROPOSAL_VOTED"),
                org.mockito.ArgumentMatchers.eq("DATE_PROPOSAL"),
                org.mockito.ArgumentMatchers.eq(proposalId),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
        verify(collaborationEventService).record(
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("TRIP_DATES_CONFIRMED"),
                org.mockito.ArgumentMatchers.eq("DATE_PROPOSAL"),
                org.mockito.ArgumentMatchers.eq(proposalId),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    @DisplayName("t8 종료된 날짜 제안에는 투표할 수 없다")
    void t8_voteRejectsClosedProposal() {
        insertProposal("CONFIRMED");

        assertThatThrownBy(() -> tripPlanningService.vote(
                10L,
                new DateVoteRequest(DateVoteRequest.Choice.AGREE)
        ))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(TripErrorCode.DATE_PROPOSAL_CLOSED);
    }

    @Test
    @DisplayName("t9 같은 멤버가 다시 투표하면 기존 응답을 변경한다")
    void t9_voteUpdatesExistingChoice() {
        long proposalId = insertProposal("OPEN");
        insertVote(proposalId, 1L, "DISAGREE");

        DateProposalResponse result = tripPlanningService.vote(
                10L,
                new DateVoteRequest(DateVoteRequest.Choice.AGREE)
        );

        Long voteCount = jdbcClient.sql("""
                SELECT COUNT(*) FROM trip_date_votes
                WHERE proposal_id=:proposalId AND member_id=1
                """)
                .param("proposalId", proposalId)
                .query(Long.class)
                .single();
        assertThat(voteCount).isEqualTo(1L);
        assertThat(result.agreeCount()).isEqualTo(1);
        assertThat(result.disagreeCount()).isZero();
        assertThat(result.myChoice()).isEqualTo(DateVoteRequest.Choice.AGREE);
    }

    @Test
    @DisplayName("t10 동일한 열린 날짜 제안을 다시 제출하면 기존 투표를 유지한다")
    void t10_sameOpenProposalPreservesExistingVotes() {
        long proposalId = insertProposal("OPEN");
        insertVote(proposalId, 2L, "AGREE");

        DateProposalResponse result = tripPlanningService.propose(
                10L,
                new DateProposalRequest(LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 15))
        );

        Long voteCount = jdbcClient.sql(
                        "SELECT COUNT(*) FROM trip_date_votes WHERE proposal_id=:proposalId")
                .param("proposalId", proposalId)
                .query(Long.class)
                .single();
        assertThat(voteCount).isEqualTo(1L);
        assertThat(result.agreeCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("t11 확정된 여행 기간에 새로운 날짜를 제안하면 투표를 초기화하고 다시 연다")
    void t11_confirmedProposalCanBeReopenedWithNewDates() {
        long proposalId = insertProposal("CONFIRMED");
        insertVote(proposalId, 2L, "AGREE");

        DateProposalResponse result = tripPlanningService.propose(
                10L,
                new DateProposalRequest(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 3))
        );

        Long voteCount = jdbcClient.sql(
                        "SELECT COUNT(*) FROM trip_date_votes WHERE proposal_id=:proposalId")
                .param("proposalId", proposalId)
                .query(Long.class)
                .single();
        assertThat(voteCount).isZero();
        assertThat(result.status()).isEqualTo("OPEN");
        assertThat(result.startDate()).isEqualTo(LocalDate.of(2026, 9, 1));
    }

    private long insertProposal(String status) {
        jdbcClient.sql("""
                INSERT INTO trip_date_proposals(
                    trip_id, proposed_by, start_date, end_date, status, created_at, updated_at
                ) VALUES (
                    10, 1, DATE '2026-08-12', DATE '2026-08-15', :status,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """)
                .param("status", status)
                .update();
        return jdbcClient.sql("SELECT id FROM trip_date_proposals WHERE trip_id=10")
                .query(Long.class)
                .single();
    }

    private void insertVote(long proposalId, long memberId, String choice) {
        jdbcClient.sql("""
                INSERT INTO trip_date_votes(
                    proposal_id, member_id, choice, created_at, updated_at
                ) VALUES (:proposalId, :memberId, :choice, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """)
                .param("proposalId", proposalId)
                .param("memberId", memberId)
                .param("choice", choice)
                .update();
    }
}
