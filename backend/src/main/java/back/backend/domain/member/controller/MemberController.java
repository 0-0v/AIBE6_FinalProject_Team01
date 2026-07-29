package back.backend.domain.member.controller;

import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.dto.NicknameUpdateRequest;
import back.backend.domain.member.service.MemberService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;
    private final SecurityContextAccessor securityContextAccessor;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    public MemberController(
            MemberService memberService,
            SecurityContextAccessor securityContextAccessor,
            RefreshTokenCookieProvider refreshTokenCookieProvider
    ) {
        this.memberService = memberService;
        this.securityContextAccessor = securityContextAccessor;
        this.refreshTokenCookieProvider = refreshTokenCookieProvider;
    }

    @GetMapping("/me")
    public ApiResponse<MemberResponse> getMe() {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        return ApiResponse.success(memberService.getMember(memberId));
    }

    @PatchMapping("/me/nickname")
    @Operation(summary = "닉네임 변경")
    public ApiResponse<MemberResponse> updateNickname(@Valid @RequestBody NicknameUpdateRequest request) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        return ApiResponse.success(memberService.updateNickname(memberId, request.nickname()));
    }

    @PostMapping(value = "/me/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "프로필 이미지 등록")
    public ApiResponse<MemberResponse> updateProfileImage(@RequestPart("file") MultipartFile file) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        return ApiResponse.success(memberService.updateProfileImage(memberId, file));
    }

    @DeleteMapping("/me")
    @Operation(summary = "회원 탈퇴")
    public ApiResponse<Void> withdraw(HttpServletResponse response) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        memberService.withdraw(memberId);
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.expire().toString());
        return ApiResponse.successMessage("회원 탈퇴가 완료되었습니다.");
    }
}
