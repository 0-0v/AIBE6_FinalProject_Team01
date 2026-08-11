# Plamingo 성능 테스트

Prometheus로 Spring Boot 지표를 수집하고 k6로 부하를 생성한다. k6 기본 시나리오는 Google Maps, OpenAI, Brevo, S3 API를 호출하지 않는다. `performance` 프로필에서는 해당 외부 API 경로까지 서버에서 차단한다.

## 1. 실행 준비

```powershell
.\performance\start-monitoring.ps1
```

- Prometheus: http://localhost:9090
- Backend metrics: http://localhost:8080/actuator/prometheus

그다음 IntelliJ에서 기존처럼 `local,oauth` 프로필로 Spring을 실행한다. `application-local.yml`이 Prometheus 엔드포인트를 노출하므로 별도 `performance` 프로필 없이 지표를 확인할 수 있다.

## 2. k6 실행

현재 PowerShell 세션에 테스트 계정 비밀번호를 먼저 설정한다. 이 값은 저장소에 저장되지 않는다.

```powershell
$env:TEST_PASSWORD='테스트 계정 비밀번호'
```

```powershell
.\performance\run-test.ps1 smoke
.\performance\run-test.ps1 load
.\performance\run-test.ps1 spike
.\performance\run-test.ps1 stress
.\performance\run-test.ps1 soak
.\performance\run-test.ps1 websocket
```

k6 지표까지 Prometheus에 저장하려면 명령 뒤에 다음 출력 옵션을 붙인다.

`PrometheusOutput` 옵션을 사용하면 k6 결과도 Prometheus에 저장한다.

```powershell
.\performance\run-test.ps1 smoke -PrometheusOutput
```

여행방 실시간 구독까지 검증할 때만 `.env` 또는 현재 셸에 `TRIP_ID`를 지정한다. 테스트 계정과 별도 로컬 DB·Redis만 사용하고 운영 서버에서는 실행하지 않는다.

## 3. 합격 기준

| 구분 | 기준 |
| --- | --- |
| 일반 조회 p95 | 500ms 미만 |
| 일반 조회 p99 | 1초 미만 |
| 오류율 | 1% 미만 |
| Stress/Spike 오류율 | 5% 미만 |
| WebSocket 연결 p95 | 1초 미만 |
| CPU·DB 커넥션 풀 | 지속 사용률 80% 미만 |

Google Maps·AI까지 서버 단계에서 차단하려면 IntelliJ 활성 프로필에 `performance`를 추가해 `local,oauth,performance`로 실행하고 `EXPECT_EXTERNAL_GUARD=true`를 설정한다. `PERFORMANCE_ALLOW_EXTERNAL_APIS=true`는 비용 및 쿼터 제한을 먼저 설정한 별도 통합 시험에서만 사용한다.
