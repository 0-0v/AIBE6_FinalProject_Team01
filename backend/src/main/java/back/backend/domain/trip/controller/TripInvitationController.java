package back.backend.domain.trip.controller;

import back.backend.domain.trip.dto.TripInvitationResponse;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.dto.GuestAccessGrant;
import back.backend.domain.trip.service.GuestAccessCookieProvider;
import back.backend.domain.trip.service.GuestTripAccessService;
import back.backend.domain.trip.service.TripInvitationService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TripInvitationController {
    private final TripInvitationService invitationService;
    private final GuestTripAccessService guestTripAccessService;
    private final GuestAccessCookieProvider guestAccessCookieProvider;
    private final SecurityContextAccessor securityContextAccessor;

    public TripInvitationController(
            TripInvitationService invitationService,
            GuestTripAccessService guestTripAccessService,
            GuestAccessCookieProvider guestAccessCookieProvider,
            SecurityContextAccessor securityContextAccessor
    ) {
        this.invitationService = invitationService;
        this.guestTripAccessService = guestTripAccessService;
        this.guestAccessCookieProvider = guestAccessCookieProvider;
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

    @PostMapping("/trip-invitations/{inviteCode}/accept")
    @Operation(summary = "비로그인 초대 수락 및 게스트 조회 권한 발급")
    public ResponseEntity<ApiResponse<TripResponse>> accept(
            @PathVariable String inviteCode,
            @CookieValue(name = GuestAccessCookieProvider.COOKIE_NAME, required = false) String guestToken
    ) {
        GuestAccessGrant grant = guestTripAccessService.accept(inviteCode, guestToken);
        boolean claimed = securityContextAccessor.getCurrentPrincipal()
                .map(principal -> guestTripAccessService.claimIfPresent(principal.getMemberId(), grant.token()))
                .orElse(false);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, (claimed
                        ? guestAccessCookieProvider.expire()
                        : guestAccessCookieProvider.create(grant.token())).toString())
                .body(ApiResponse.success(grant.trip()));
    }

    @GetMapping("/guest/trips/{tripId}")
    @Operation(summary = "게스트 여행방 상세 조회")
    public ApiResponse<TripResponse> getAsGuest(
            @PathVariable Long tripId,
            @CookieValue(name = GuestAccessCookieProvider.COOKIE_NAME, required = false) String guestToken
    ) {
        return ApiResponse.success(guestTripAccessService.getTrip(tripId, guestToken));
    }

    @PostMapping("/trip-invitations/claim")
    @Operation(summary = "게스트 여행방 권한을 로그인 회원에게 이전")
    public ResponseEntity<ApiResponse<Void>> claim(
            @CookieValue(name = GuestAccessCookieProvider.COOKIE_NAME, required = false) String guestToken
    ) {
        guestTripAccessService.claimIfPresent(securityContextAccessor.getCurrentMemberId(), guestToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, guestAccessCookieProvider.expire().toString())
                .body(ApiResponse.ok());
    }
}
