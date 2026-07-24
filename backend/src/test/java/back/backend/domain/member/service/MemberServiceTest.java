package back.backend.domain.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.port.ProfileImageStorage;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private ProfileImageStorage profileImageStorage;

    private MemberService memberService;

    @BeforeEach
    void setUp() {
        memberService = new MemberService(memberRepository, profileImageStorage);
    }

    @Test
    @DisplayName("t1 존재하는 회원 식별자로 조회하면 회원 정보를 반환한다")
    void t1_getMemberReturnsMemberResponseWhenMemberExists() {
        Member member = Member.create("user@example.com", "닉네임", "https://example.com/image.png", AuthProvider.KAKAO, "kakao-1");
        ReflectionTestUtils.setField(member, "id", 1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));

        MemberResponse response = memberService.getMember(1L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.nickname()).isEqualTo("닉네임");
        assertThat(response.profileImageUrl()).isEqualTo("https://example.com/image.png");
        assertThat(response.provider()).isEqualTo(AuthProvider.KAKAO);
    }

    @Test
    @DisplayName("t2 존재하지 않는 회원 식별자로 조회하면 예외가 발생한다")
    void t2_getMemberThrowsWhenMemberNotFound() {
        when(memberRepository.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> memberService.getMember(2L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t3 닉네임을 변경하면 변경된 닉네임을 담은 회원 정보를 반환한다")
    void t3_updateNicknameReturnsUpdatedMemberResponse() {
        Member member = Member.create("user3@example.com", "기존닉네임", null, AuthProvider.KAKAO, "kakao-3");
        ReflectionTestUtils.setField(member, "id", 3L);
        when(memberRepository.findById(3L)).thenReturn(Optional.of(member));

        MemberResponse response = memberService.updateNickname(3L, "새닉네임");

        assertThat(response.nickname()).isEqualTo("새닉네임");
    }

    @Test
    @DisplayName("t4 존재하지 않는 회원의 닉네임을 변경하면 예외가 발생한다")
    void t4_updateNicknameThrowsWhenMemberNotFound() {
        when(memberRepository.findById(4L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> memberService.updateNickname(4L, "닉네임"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t5 프로필 이미지를 등록하면 저장된 이미지 URL을 담은 회원 정보를 반환한다")
    void t5_updateProfileImageReturnsUpdatedMemberResponse() {
        Member member = Member.create("user5@example.com", "닉네임5", null, AuthProvider.KAKAO, "kakao-5");
        ReflectionTestUtils.setField(member, "id", 5L);
        MockMultipartFile file =
                new MockMultipartFile("file", "profile.png", "image/png", "image-content".getBytes());
        when(memberRepository.findById(5L)).thenReturn(Optional.of(member));
        when(profileImageStorage.store(5L, file)).thenReturn("/uploads/profile-images/5-uuid.png");

        MemberResponse response = memberService.updateProfileImage(5L, file);

        assertThat(response.profileImageUrl()).isEqualTo("/uploads/profile-images/5-uuid.png");
    }

    @Test
    @DisplayName("t6 존재하지 않는 회원의 프로필 이미지를 등록하면 예외가 발생한다")
    void t6_updateProfileImageThrowsWhenMemberNotFound() {
        MockMultipartFile file =
                new MockMultipartFile("file", "profile.png", "image/png", "image-content".getBytes());
        when(memberRepository.findById(6L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> memberService.updateProfileImage(6L, file))
                .isInstanceOf(BusinessException.class);
    }
}
