package back.backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

    @Test
    @DisplayName("t1 test 프로파일에서 애플리케이션 컨텍스트와 공통 Bean을 정상적으로 로딩한다")
    void t1_contextLoadsWithTestProfile() {
    }

}
