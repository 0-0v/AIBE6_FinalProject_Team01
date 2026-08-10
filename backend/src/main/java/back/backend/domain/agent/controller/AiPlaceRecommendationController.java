package back.backend.domain.agent.controller;

import back.backend.domain.agent.dto.request.AiPlaceRecommendationRequest;
import back.backend.domain.agent.dto.response.AiPlaceRecommendationResponse;
import back.backend.domain.agent.service.AiPlaceRecommendationService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/ai/place-recommendations")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "AI 여행")
public class AiPlaceRecommendationController {

    private final AiPlaceRecommendationService recommendationService;

    @PostMapping
    @Operation(
            summary = "동선 기반 AI 장소 추천",
            description = "선택한 Day 동선과 카테고리·사용자 요청을 분석해 실제 Google 장소를 최대 5개 추천합니다."
    )
    public ApiResponse<List<AiPlaceRecommendationResponse>> recommend(
            @PathVariable Long tripId,
            @RequestBody @Valid AiPlaceRecommendationRequest request
    ) {
        return ApiResponse.success(
                recommendationService.recommend(tripId, request)
        );
    }
}
