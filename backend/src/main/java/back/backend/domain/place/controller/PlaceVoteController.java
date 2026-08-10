package back.backend.domain.place.controller;

import back.backend.domain.place.dto.request.RespondPlaceVoteRequest;
import back.backend.domain.place.dto.response.PlaceVoteSummaryResponse;
import back.backend.domain.place.service.PlaceVoteService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trips/{tripId}/places")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "장소 투표·댓글")
public class PlaceVoteController {

    private final PlaceVoteService placeVoteService;

    @GetMapping("/votes")
    @io.swagger.v3.oas.annotations.Operation(summary = "장소 투표 현황 조회")
    public ApiResponse<List<PlaceVoteSummaryResponse>> getVotes(@PathVariable Long tripId) {
        return ApiResponse.success(placeVoteService.getVotes(tripId));
    }

    @PostMapping("/{tripPlaceId}/votes")
    @io.swagger.v3.oas.annotations.Operation(summary = "후보 장소 투표 시작")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlaceVoteSummaryResponse> startVote(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId
    ) {
        return ApiResponse.success(placeVoteService.startVote(tripId, tripPlaceId));
    }

    @PutMapping("/{tripPlaceId}/votes/me")
    @io.swagger.v3.oas.annotations.Operation(summary = "후보 장소 투표 참여")
    public ApiResponse<PlaceVoteSummaryResponse> respond(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId,
            @RequestBody @Valid RespondPlaceVoteRequest request
    ) {
        return ApiResponse.success(placeVoteService.respond(tripId, tripPlaceId, request));
    }
}
