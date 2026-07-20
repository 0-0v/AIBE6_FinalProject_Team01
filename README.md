# Pramingo

여행 멤버가 공유한 장소를 AI가 분류하고 일정 초안으로 정리해 주는 공동 여행지도 서비스입니다.

## 프로젝트 구조

```text
frontend/  Next.js 프론트엔드
backend/   Java 21 / Spring Boot 백엔드
```

## 백엔드 로컬 실행

요구사항:

- Java 21
- Docker 및 Docker Compose

1. `backend/.env`에 필요한 값을 입력합니다.
2. `backend/`에서 로컬 인프라를 실행합니다.

```bash
docker compose up -d
```

3. Windows에서는 다음 명령으로 백엔드를 실행합니다.

```bash
gradlew.bat bootRun
```

macOS와 Linux에서는 `./gradlew bootRun`을 사용합니다.

로컬 Compose 구성:

- MySQL 8.4 (`pramingo` 데이터베이스)
- Redis 7.4
- Kafka 4.1.2

일반 종료는 `docker compose down`을 사용합니다. `docker compose down -v`는 MySQL, Redis, Kafka 볼륨 데이터를 모두 삭제하므로 초기화가 필요한 경우에만 사용합니다.

## Spring 프로파일

- `application.yml`: 공통 설정
- `application-local.yml`: 로컬 MySQL, Redis, Kafka 및 OAuth 설정
- `src/test/resources/application-test.yml`: H2 기반 테스트 설정

실제 비밀번호와 API 키는 YAML에 작성하지 않고 `backend/.env` 또는 운영 환경변수로 주입합니다.

## API 문서

백엔드 실행 후 다음 주소에서 확인할 수 있습니다.

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## 데이터베이스 마이그레이션

- 최초 스키마: `V1__initial_schema.sql`
- 이후 변경: `Vyyyy_MM_dd_HHmm__description.sql`
- 적용되거나 공유된 migration 파일은 수정하지 않습니다.

상세 규칙은 `backend/src/main/resources/db/migration/README.md`를 확인합니다.

## 검증

```bash
gradlew.bat test
gradlew.bat clean build
```

테스트는 AssertJ를 기본으로 사용하며 `@DisplayName("t1 검증 내용")`과 `t1_englishMethodName` 형식을 따릅니다.

## 프론트엔드 로컬 실행

`frontend/.env`에 필요한 브라우저 공개 환경변수를 입력합니다.

```bash
cd frontend
npm install
npm run dev
```

상세한 스택, 환경변수 및 Next.js 마이그레이션 구조는 `frontend/README.md`를 확인합니다.
