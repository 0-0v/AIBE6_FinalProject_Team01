package back.backend.domain.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    private MemberRepository memberRepository;

    private MemberService memberService;

    @BeforeEach
    void setUp() {
        memberService = new MemberService(memberRepository);
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
}
