package back.backend.domain.trip.controller;

import back.backend.domain.trip.dto.TripInvitationResponse;
import back.backend.domain.trip.dto.TripEmailInvitationRequest;
import back.backend.domain.trip.dto.TripEmailInvitationAvailabilityResponse;
import back.backend.domain.trip.dto.TripEmailInvitationsRequest;
import back.backend.domain.trip.dto.TripEmailInvitationAcceptResponse;
import back.backend.domain.trip.dto.ClaimTripInvitationRequest;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.dto.GuestAccessGrant;
import back.backend.domain.trip.dto.GuestTripInvitationAcceptRequest;
import back.backend.domain.trip.service.GuestAccessCookieProvider;
import back.backend.domain.trip.service.GuestTripAccessService;
import back.backend.domain.trip.service.TripInvitationService;
import back.backend.domain.trip.service.TripEmailInvitationService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@io.swagger.v3.oas.annotations.tags.Tag(name = "여행방 초대")
public class TripInvitationController {
    private final TripInvitationService invitationService;
    private final GuestTripAccessService guestTripAccessService;
    private final GuestAccessCookieProvider guestAccessCookieProvider;
    private final SecurityContextAccessor securityContextAccessor;
    private final TripEmailInvitationService emailInvitationService;

    public TripInvitationController(
            TripInvitationService invitationService,
            GuestTripAccessService guestTripAccessService,
            GuestAccessCookieProvider guestAccessCookieProvider,
            SecurityContextAccessor securityContextAccessor,
            TripEmailInvitationService emailInvitationService
    ) {
        this.invitationService = invitationService;
        this.guestTripAccessService = guestTripAccessService;
        this.guestAccessCookieProvider = guestAccessCookieProvider;
        this.securityContextAccessor = securityContextAccessor;
        this.emailInvitationService = emailInvitationService;
    }
    @PostMapping("/trips/{tripId}/invitations")
    @Operation(summary = "여행방 조회 초대 링크 생성")
    public ApiResponse<TripInvitationResponse> create(@PathVariable Long tripId) {
        return ApiResponse.success(invitationService.create(securityContextAccessor.getCurrentMemberId(), tripId));
    }

    @PostMapping("/trips/{tripId}/email-invitations/validate")
    @Operation(summary = "여행방 이메일 초대 대상 검증")
    public ApiResponse<TripEmailInvitationAvailabilityResponse> validateEmailInvitation(
            @PathVariable Long tripId,
            @Valid @RequestBody TripEmailInvitationRequest request
    ) {
        return ApiResponse.success(emailInvitationService.validate(
                securityContextAccessor.getCurrentMemberId(), tripId, request.email()));
    }

    @PostMapping("/trips/{tripId}/email-invitations")
    @Operation(summary = "등록 회원 이메일로 여행방 초대 일괄 발송")
    public ApiResponse<Void> sendEmailInvitations(
            @PathVariable Long tripId,
            @Valid @RequestBody TripEmailInvitationsRequest request
    ) {
        emailInvitationService.sendAll(
                securityContextAccessor.getCurrentMemberId(), tripId, request.emails());
        return ApiResponse.successMessage("여행방 초대 메일을 발송했습니다.");
    }

    @PostMapping("/trips/email-invitations/{token}/accept")
    @Operation(summary = "로그인 회원의 이메일 초대 수락")
    public ApiResponse<TripEmailInvitationAcceptResponse> acceptEmailInvitation(
            @PathVariable String token
    ) {
        Long tripId = emailInvitationService.accept(
                securityContextAccessor.getCurrentMemberId(), token);
        return ApiResponse.success(new TripEmailInvitationAcceptResponse(tripId));
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
            @RequestBody(required = false) GuestTripInvitationAcceptRequest request,
            @CookieValue(name = GuestAccessCookieProvider.COOKIE_NAME, required = false) String guestToken
    ) {
        GuestAccessGrant grant = guestTripAccessService.accept(
                inviteCode, request == null ? null : request.accessCode(), guestToken);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, guestAccessCookieProvider.create(grant.token()).toString())
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
            @CookieValue(name = GuestAccessCookieProvider.COOKIE_NAME, required = false) String guestToken,
            @Valid @RequestBody ClaimTripInvitationRequest request
    ) {
        guestTripAccessService.claimInvitation(
                securityContextAccessor.getCurrentMemberId(),
                request.inviteCode(),
                guestToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, guestAccessCookieProvider.expire().toString())
                .body(ApiResponse.ok());
    }
}
