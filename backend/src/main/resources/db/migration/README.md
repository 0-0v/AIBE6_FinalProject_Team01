# Flyway Migration Rules

## Naming

- 최초 스키마: `V1__initial_schema.sql`
- 이후 마이그레이션: `Vyyyy_MM_dd_HHmm__description.sql`
- 예시: `V2026_07_18_1119__add_trip_status.sql`

팀에서 사용하는 날짜·시간 표기는 `yyyy-MM-dd-HHmm`이지만, Flyway 버전에는 하이픈 대신 밑줄을 사용한다. Flyway 버전은 점 또는 밑줄로 구분해야 하며, 각 버전은 중복되지 않아야 한다.

## Rules

- 이미 공유되었거나 적용된 마이그레이션 파일은 수정하지 않는다.
- 스키마 변경마다 새로운 마이그레이션 파일을 추가한다.
- 같은 분에 파일이 둘 이상 생기면 시간 뒤에 초를 추가한다. 예: `V2026_07_18_111901__description.sql`
- 파일 설명은 소문자 snake_case 영문으로 작성한다.
- Entity 변경 시 필요한 스키마 마이그레이션을 함께 검토한다.
- 삭제·이름 변경처럼 데이터 손실 가능성이 있는 작업은 적용 전에 복구 방안을 확인한다.
