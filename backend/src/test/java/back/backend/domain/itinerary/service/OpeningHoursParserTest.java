package back.backend.domain.itinerary.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class OpeningHoursParserTest {

    private final OpeningHoursParser parser = new OpeningHoursParser();

    @Test
    @DisplayName("t1 정상_JSON에서_월요일_영업시간을_파싱한다")
    void t1_정상_JSON에서_월요일_영업시간을_파싱한다() {
        // Google Places API periods: day 1 = MONDAY
        String json = """
                {"periods":[
                  {"open":{"day":1,"time":"1100"},"close":{"day":1,"time":"2200"}}
                ]}
                """;
        var result = parser.parse(json, DayOfWeek.MONDAY);
        assertThat(result).isPresent();
        assertThat(result.get()[0]).isEqualTo(LocalTime.of(11, 0));
        assertThat(result.get()[1]).isEqualTo(LocalTime.of(22, 0));
    }

    @Test
    @DisplayName("t2 null_JSON은_빈_Optional을_반환한다")
    void t2_null_JSON은_빈_Optional을_반환한다() {
        assertThat(parser.parse(null, DayOfWeek.MONDAY)).isEmpty();
    }

    @Test
    @DisplayName("t3 파싱_불가능한_JSON은_빈_Optional을_반환한다")
    void t3_파싱_불가능한_JSON은_빈_Optional을_반환한다() {
        assertThat(parser.parse("not-json", DayOfWeek.MONDAY)).isEmpty();
    }

    @Test
    @DisplayName("t4 해당_요일_데이터_없으면_빈_Optional을_반환한다")
    void t4_해당_요일_데이터_없으면_빈_Optional을_반환한다() {
        // 일요일(0)만 있는 JSON에서 월요일 조회
        String json = """
                {"periods":[
                  {"open":{"day":0,"time":"0900"},"close":{"day":0,"time":"2100"}}
                ]}
                """;
        assertThat(parser.parse(json, DayOfWeek.MONDAY)).isEmpty();
    }
}
