package back.backend.domain.trip.controller;

import back.backend.domain.trip.dto.TripInvitationResponse;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.service.TripInvitationService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TripInvitationController {
    private final TripInvitationService invitationService;
    private final SecurityContextAccessor securityContextAccessor;
    public TripInvitationController(TripInvitationService invitationService, SecurityContextAccessor securityContextAccessor) {
        this.invitationService = invitationService;
        this.securityContextAccessor = securityContextAccessor;
    }
    @PostMapping("/trips/{tripId}/invitations")
    @Operation(summary = "여행방 조회 초대 링크 생성")
    public ApiResponse<TripInvitationResponse> create(@PathVariable Long tripId) {
        return ApiResponse.success(invitationService.create(securityContextAccessor.getCurrentMemberId(), tripId));
    }
    @GetMapping("/trip-invitations/{inviteCode}/preview")
    @Operation(summary = "비로그인 초대 여행방 조회")
    public ApiResponse<TripResponse> preview(@PathVariable String inviteCode) {
        return ApiResponse.success(invitationService.preview(inviteCode));
    }
}
