package back.backend.domain.member.controller;

import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.service.MemberService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;
    private final SecurityContextAccessor securityContextAccessor;

    public MemberController(MemberService memberService, SecurityContextAccessor securityContextAccessor) {
        this.memberService = memberService;
        this.securityContextAccessor = securityContextAccessor;
    }

    @GetMapping("/me")
    public ApiResponse<MemberResponse> getMe() {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        return ApiResponse.success(memberService.getMember(memberId));
    }
}
