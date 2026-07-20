# CLAUDE.md

@AGENTS.md

This file is the entry instruction file for Claude Code.
Follow all shared project rules defined in the root `AGENTS.md`.

All explanations, progress updates, questions, summaries, and final responses must be written in Korean unless the user explicitly requests another language.

---

## Claude Code-Specific Rules

- Search for relevant files and understand the existing structure before making changes.
- Start with files directly related to the request instead of reading the entire repository unnecessarily.
- For multi-file changes, briefly summarize the intended scope before editing.
- Do not create branches, commits, pushes, merges, or pull requests unless explicitly requested.
- Do not install packages, reset databases, execute migrations, or delete containers without an explicit request and a confirmed need.
- Review the impact before running destructive commands.
- Do not run the following commands unless the user explicitly requests them and the risk has been clearly confirmed:

```bash
rm -rf
git reset --hard
git clean -fd
docker system prune
docker volume prune
docker compose down -v
DROP DATABASE
TRUNCATE TABLE
```

- Break large changes into meaningful and reviewable units.
- Prefer modifying an existing file over creating another file with the same responsibility.
- After generating code, recheck imports, types, package paths, and build compatibility.
- Report only tests and commands that were actually executed.
- If validation could not be performed, clearly state that it was not performed.
- Use TDD for every Spring MVC Controller, Service, and Repository feature or change: write a failing test first, make it pass with the smallest implementation, and refactor only while tests remain green.
- Create layer-appropriate tests for Controller request/response and security behavior, Service business rules and boundaries, and Repository queries and persistence constraints.
- Annotate every test with `@DisplayName("t1 behavior and expected result")`, incrementing the lowercase number within each test class, and prefix the method with the matching number such as `t1_googleLoginRedirectsToProviderAuthorizationUrl`.
- Prefer AssertJ assertions (`assertThat`, `assertThatThrownBy`, `assertThatCode`) for readable test intent.
- Do not complete an MVC implementation without its corresponding tests unless testing is technically impossible, and explicitly report the reason when it is skipped.
- Do not guess secret values. Mention only the required variable name and configuration location.
- Keep explanations focused on changed files, reasons, validation, and remaining actions.
- Use Korean for all user-facing output, including code-change summaries and error explanations.

---

## Final Response Format

Use the following order whenever practical, and write the response in Korean.

1. Modified files
2. Key changes
3. Test or validation results
4. Additional user checks

Example:

```text
수정한 파일
- backend/src/main/java/.../TripService.java
- backend/src/test/java/.../TripServiceTest.java

핵심 변경사항
- 여행방 참여 권한 검증을 Service 계층에 추가
- 권한이 없는 사용자는 공통 예외 형식으로 403 응답

검증 결과
- ./gradlew test 성공

확인할 사항
- 운영 환경의 JWT_SECRET 설정 필요
```
