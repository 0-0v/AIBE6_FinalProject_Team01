package back.backend.domain.trip.infrastructure;

import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.global.exception.BusinessException;

/**
 * 여행방 생성 시 선택할 수 있는 기본(프리셋) 커버 이미지 화이트리스트.
 * 프론트엔드가 임의의 URL을 보내지 못하도록 키만 받고, 실제 경로는 서버가 소유한다.
 * 경로는 frontend/public/assets/trip-covers/ 에 배치된 정적 이미지를 가리킨다.
 */
public enum TripCoverImagePreset {
    PRESET_1("/assets/trip-covers/trip-cover-01.jpg"),
    PRESET_2("/assets/trip-covers/trip-cover-02.jpg"),
    PRESET_3("/assets/trip-covers/trip-cover-03.jpg"),
    PRESET_4("/assets/trip-covers/trip-cover-04.jpg"),
    PRESET_5("/assets/trip-covers/trip-cover-05.jpg"),
    PRESET_6("/assets/trip-covers/trip-cover-06.jpg"),
    PRESET_7("/assets/trip-covers/trip-cover-07.jpg"),
    PRESET_8("/assets/trip-covers/trip-cover-08.jpg"),
    PRESET_9("/assets/trip-covers/trip-cover-09.jpg"),
    PRESET_10("/assets/trip-covers/trip-cover-10.jpg"),
    PRESET_11("/assets/trip-covers/trip-cover-11.jpg");

    private final String path;

    TripCoverImagePreset(String path) {
        this.path = path;
    }

    public String path() {
        return path;
    }

    public static TripCoverImagePreset from(String key) {
        for (TripCoverImagePreset preset : values()) {
            if (preset.name().equals(key)) {
                return preset;
            }
        }
        throw new BusinessException(TripErrorCode.INVALID_COVER_IMAGE_PRESET);
    }
}
