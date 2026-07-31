package back.backend.domain.itinerary.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Optional;

/**
 * Google Places API opening_hours JSON에서 특정 요일의 영업 시작·종료 시간을 추출한다.
 * JSON 없음 또는 파싱 실패 → Optional.empty() (제약 없음으로 처리)
 *
 * Google Places API day 매핑: 0=SUNDAY, 1=MONDAY, ..., 6=SATURDAY
 */
@Slf4j
@Component
public class OpeningHoursParser {

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    // Google: 0=SUNDAY, 1=MON, ..., 6=SAT
    // Java DayOfWeek: MONDAY=1, ..., SUNDAY=7
    private static int toGoogleDay(DayOfWeek dayOfWeek) {
        return dayOfWeek == DayOfWeek.SUNDAY ? 0 : dayOfWeek.getValue();
    }

    /**
     * @param json       places.opening_hours_json 컬럼 값 (null 허용)
     * @param dayOfWeek  조회할 요일
     * @return Optional.of([openTime, closeTime]) or Optional.empty() (제약 없음)
     */
    public Optional<LocalTime[]> parse(String json, DayOfWeek dayOfWeek) {
        if (json == null || json.isBlank()) return Optional.empty();
        try {
            JsonNode root = MAPPER.readTree(json);
            JsonNode periods = root.path("periods");
            if (!periods.isArray()) return Optional.empty();

            int targetDay = toGoogleDay(dayOfWeek);
            for (JsonNode period : periods) {
                JsonNode open  = period.path("open");
                JsonNode close = period.path("close");
                if (open.path("day").asInt(-1) == targetDay) {
                    LocalTime openTime  = parseTime(open.path("time").asText(""));
                    LocalTime closeTime = parseTime(close.path("time").asText(""));
                    if (openTime != null && closeTime != null) {
                        return Optional.of(new LocalTime[]{openTime, closeTime});
                    }
                }
            }
            return Optional.empty();
        } catch (Exception e) {
            log.debug("opening_hours_json 파싱 실패 — 제약 없음으로 처리: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /** "0900" → LocalTime.of(9, 0), 형식 오류 → null */
    private LocalTime parseTime(String hhmm) {
        if (hhmm == null || hhmm.length() != 4) return null;
        try {
            int hour   = Integer.parseInt(hhmm.substring(0, 2));
            int minute = Integer.parseInt(hhmm.substring(2, 4));
            return LocalTime.of(hour, minute);
        } catch (Exception e) {
            return null;
        }
    }
}
