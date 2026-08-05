# 여행방 기본 커버 이미지

여행방 생성 시 랜덤으로 선택되는 기본 커버 이미지 11장을 이 폴더에 넣어주세요.

- 파일명: `trip-cover-01.jpg` ~ `trip-cover-11.jpg` (11장 전부 필요)
- 형식: JPG (다른 확장자를 쓰려면 `frontend/src/features/manage-trip/model/trip-cover-presets.ts`의
  `url` 값도 함께 맞춰야 합니다)
- 저작권이 안전한 이미지만 사용하세요 (자체 촬영 사진, Unsplash/Pexels 등 라이선스 프리 이미지 등).
  SNS에서 저장한 타인의 사진은 사용하지 않습니다.

이 11장의 경로는 `back.backend.domain.trip.infrastructure.TripCoverImagePreset`
(백엔드) 화이트리스트와 1:1로 대응해야 합니다. 개수나 순서를 바꾸려면 프론트/백엔드
양쪽의 프리셋 목록을 함께 수정해야 합니다.
