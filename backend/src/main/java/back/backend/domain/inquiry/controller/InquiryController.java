package back.backend.domain.inquiry.controller;

import back.backend.domain.inquiry.dto.*;
import back.backend.domain.inquiry.service.InquiryService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.MemberPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inquiries")
@io.swagger.v3.oas.annotations.tags.Tag(name = "서비스 문의")
public class InquiryController {
    private final InquiryService inquiryService;
    public InquiryController(InquiryService inquiryService) { this.inquiryService = inquiryService; }

    @PostMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "서비스 문의 접수")
    public ApiResponse<InquiryResponse> create(@Valid @RequestBody InquiryCreateRequest request,
                                               Authentication authentication,
                                               HttpServletRequest servletRequest) {
        Long memberId = authentication != null && authentication.getPrincipal() instanceof MemberPrincipal principal
                ? principal.getMemberId() : null;
        return ApiResponse.success(inquiryService.create(
                memberId, servletRequest.getRemoteAddr(), request));
    }
}
