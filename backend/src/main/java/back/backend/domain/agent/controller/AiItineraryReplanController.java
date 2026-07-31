package back.backend.domain.agent.controller;

import back.backend.domain.agent.dto.request.AiItineraryReplanRequest;
import back.backend.domain.agent.service.AiItineraryReplanService;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/itinerary/replan")
@RequiredArgsConstructor
public class AiItineraryReplanController {

    private final AiItineraryReplanService replanService;

    @PostMapping("/preview")
    @Operation(
            summary = "AI 일정 재배치 미리보기",
            description = "지난 Day와 현재 시각 이전 일정을 고정하고 이후 일정만 재배치한 승인 전 미리보기를 반환합니다."
    )
    public ApiResponse<List<RoutePlanOption>> preview(
            @PathVariable Long tripId,
            @RequestBody @Valid AiItineraryReplanRequest request
    ) {
        return ApiResponse.success(replanService.preview(tripId, request));
    }

    @PostMapping("/apply")
    @Operation(
            summary = "AI 일정 재배치 승인",
            description = "지난 일정을 변경하지 않는지 검증한 뒤 승인된 재배치안을 적용합니다."
    )
    public ApiResponse<List<ItineraryDayResponse>> apply(
            @PathVariable Long tripId,
            @RequestBody @Valid RoutePlanPreviewResponse plan
    ) {
        return ApiResponse.success(replanService.apply(tripId, plan));
    }
}
