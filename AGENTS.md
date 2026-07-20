# AGENTS.md

This document defines the shared working rules that AI coding tools must follow when analyzing or modifying this project.

Examples of supported tools:

- OpenAI Codex
- Claude Code
- GitHub Copilot Coding Agent
- Other AI development tools that support `AGENTS.md`

---

## 1. Core Principles

- Write all explanations, summaries, questions, and final responses in Korean unless the user explicitly requests another language.
- Modify only the scope requested by the user.
- Do not perform unrequested large-scale refactoring, file relocation, renaming, or technology replacement.
- Inspect relevant files and existing implementations before modifying code.
- Follow the existing project structure, naming conventions, and code style.
- Search for existing or similar functionality before creating a new implementation.
- Do not implement based only on assumptions. Confirm uncertain details from code, configuration, tests, or documentation.
- Check whether a change affects both the frontend and backend.
- Do not leave temporary code, meaningless TODO comments, unused files, or dead code.
- Include the reason for changes and the validation method in the final response.
- Keep responses concise and practical unless the user asks for a detailed explanation.

---

## 2. Project Structure

```text
project-root/
├─ frontend/          # Next.js frontend
├─ backend/           # Spring Boot backend
├─ AGENTS.md          # Shared rules for AI coding tools
└─ CLAUDE.md          # Claude Code entry instructions
```

- Check `frontend/` first for frontend-related tasks.
- Check `backend/` first for backend-related tasks.
- Check the project root and infrastructure-related files for shared configuration or deployment tasks.
- If the actual repository structure differs from this document, follow the current repository structure.

---

## 3. Required Workflow Before Editing

Before modifying code, follow this order:

1. Identify the user's request and the exact scope of the change.
2. Search for relevant files and similar implementations.
3. Inspect call relationships and dependencies.
4. Check the impact on APIs, databases, authentication, authorization, and state management.
5. Implement the smallest reasonable change.
6. Run or identify appropriate build, test, lint, or manual validation steps.
7. Summarize changed files, important behavior changes, and remaining considerations.

If the relevant implementation cannot be found, inspect the following before creating a new structure:

- Existing package structure
- Existing component structure
- Shared API response format
- Exception handling conventions
- Authentication and authorization conventions
- Database migration policy
- Existing test style

---

## 4. Shared Coding Rules

- Give each function and class one clear responsibility.
- Reuse existing shared functions, utilities, components, and abstractions where appropriate.
- Split excessively long functions into meaningful units.
- Prefer descriptive names over unclear abbreviations.
- Review whether hardcoded numbers, strings, and URLs should be moved to constants or configuration.
- Remove unused imports, variables, functions, comments, and files.
- Do not write comments that merely repeat what the code already says.
- Write comments only when business rules or design decisions require explanation.
- Do not hide exceptions with empty `catch` blocks.
- Never log passwords, access tokens, refresh tokens, secrets, or personal information.
- Follow existing formatter and linter configuration.
- Add a new library only when the existing stack cannot reasonably solve the problem.
- When adding a dependency, explain its purpose, impact, and alternatives.

---

## 5. Frontend Rules

### Technology Guidelines

- Next.js
- TypeScript
- Follow the existing routing strategy and directory structure.
- Reuse the existing styling tools and design system.
- Follow the existing state management approach.

### Implementation Rules

- Prefer TypeScript over JavaScript.
- Minimize the use of `any` and define request and response types.
- Separate responsibilities between Server Components and Client Components.
- Do not add unnecessary `"use client"` directives.
- Reuse shared UI components when available.
- Do not duplicate the same API calling logic across multiple components.
- Handle loading, empty, error, and success states.
- Perform basic validation for user input on the frontend.
- Check authentication state and permissions for protected pages.
- When backend response fields change, update related types, API clients, and UI code together.
- Provide alternative text for meaningful images where possible.
- Use semantic HTML elements for buttons, links, forms, and navigation.
- Preserve the existing visual direction and responsive layout.
- Do not add a new state management library or UI library without an explicit need.

### Environment Variables

- Use the `NEXT_PUBLIC_` prefix only for values that are safe to expose in the browser.
- Never place API secrets, private keys, or server-only tokens in client-side code.
- Use `.env` for local frontend environment variables.
- Do not commit environment files containing real secrets.
- Manage required frontend environment variables directly in the ignored `.env` file.

### Recommended Validation Commands

Check the actual scripts in `package.json` before running commands.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run test
```

Do not claim that a command was executed unless it was actually executed.

---

## 6. Backend Rules

### Technology Guidelines

- Java 21
- Spring Boot
- Gradle
- Spring MVC
- Spring Data JPA
- Spring Security
- OAuth2 / JWT
- MySQL
- Flyway
- Redis
- WebSocket or STOMP

Confirm actual versions and dependencies from `build.gradle`, `build.gradle.kts`, and `gradle.properties`.

### Layer Responsibilities

Follow the existing project structure. In general, keep the following responsibilities separated:

- Controller: receive requests, validate input, and return responses
- Service: business logic and transaction boundaries
- Repository: data access
- Entity: persistence model
- DTO: API request and response model
- Mapper: conversion between entities and DTOs
- Config: security, CORS, WebSocket, and application configuration

### Implementation Rules

- Do not place core business logic in Controllers.
- Do not return JPA Entities directly from APIs.
- Separate request DTOs and response DTOs when their responsibilities differ.
- Use the existing validation approach, such as Bean Validation.
- Manage transaction boundaries clearly in the Service layer.
- Use read-only transactions for query operations when appropriate.
- Review both sides of bidirectional relationships when changing associations.
- Consider lazy loading, N+1 queries, and recursive serialization.
- Follow the existing shared API response and exception format.
- When adding exceptions, review the global exception handler and correct HTTP status code.
- Use the existing `SecurityContext` or authentication utility for authenticated user information.
- Enforce authorization on the backend, not only on the frontend.
- Review Redis and JWT policies when modifying logout, refresh, expiration, or token revocation.
- For file uploads, validate file size, extension, MIME type, and storage failures.
- Add timeouts and error handling for external API calls.
- Use asynchronous processing or messaging systems only when there is a confirmed requirement.

### Recommended Validation Commands

Use `gradlew.bat` on Windows and `./gradlew` on macOS or Linux.

```bash
./gradlew bootRun
./gradlew test
./gradlew clean build
```

If tests are skipped, explain why.

---

## 7. Database and Flyway Rules

- Manage schema changes through Flyway migrations.
- Do not modify migration files that have already been applied or shared with the team.
- Add a new migration file for every new schema change.
- Follow the migration naming convention already used by the project.
- Do not modify an Entity without considering the required migration.
- When adding a column, review:
  - Nullability
  - Default value
  - Compatibility with existing data
  - Index requirements
  - Unique constraints
  - Foreign keys
- Explain the risk of data loss when deleting or renaming columns.
- For production-impacting migrations, consider rollback or recovery steps.
- Follow existing naming conventions for tables and columns.
- Do not store personal data, credentials, or tokens unless they are truly required.
- Keep time data types and timezone policies consistent.

---

## 8. API Rules

- Follow the existing base URL and API versioning policy.
- Use appropriate RESTful HTTP methods and status codes.
- Follow existing request and response field naming conventions.
- Review pagination, sorting, and filtering requirements for collection APIs.
- For creation APIs, determine whether the created resource identifier should be returned.
- Distinguish between full updates and partial updates.
- Confirm whether deletion is physical or logical.
- Use consistent error codes and messages.
- Distinguish authentication failure from insufficient permission.
- When an API contract changes, update frontend types, API clients, tests, and documentation together.
- Update Swagger or OpenAPI documentation when applicable.
- Separate user-facing error messages from internal log messages.

---

## 9. Authentication and Security Rules

- Never hardcode access tokens, refresh tokens, OAuth secrets, database passwords, or API keys.
- Store secrets in environment variables or an approved secret manager.
- Do not commit `.env` files, production configuration files, certificates, or private keys.
- Never store or log passwords in plain text.
- Perform authentication and authorization checks on the server.
- Allow only required Origins, Methods, and Headers in CORS configuration.
- Avoid insecure configurations such as wildcard origins with credentials.
- Keep JWT expiration, refresh, and revocation behavior consistent with the existing policy.
- Review refresh token storage and replay prevention.
- Validate user input and consider SQL injection, XSS, and file upload vulnerabilities.
- Apply ownership checks and permission checks to sensitive resources.
- Do not expose stack traces or internal sensitive information in API responses.
- Review maintenance status and known security issues before adding dependencies.

---

## 10. Real-Time Communication Rules

When modifying WebSocket, STOMP, Redis Pub/Sub, or Kafka-related code, review:

- Connection endpoints
- Subscription destinations
- Authentication
- Per-user and per-room authorization
- Duplicate message handling
- Reconnection behavior
- Message persistence
- Read status
- Error message format
- Session and message delivery strategy for horizontal scaling

Do not introduce Kafka only because real-time communication exists. Consider it only when throughput, durability, decoupling, or scaling requirements justify it.

---

## 11. Testing Rules

- Follow the existing test framework and style.
- Check for related tests before modifying functionality.
- Apply TDD whenever developing or changing the Spring MVC flow, including Controller, Service, and Repository code.
- Follow the Red-Green-Refactor cycle: write a failing test first, implement only enough code to pass it, and then refactor while keeping all tests green.
- Do not add an MVC feature without its corresponding tests unless testing is technically impossible; in that case, explain the reason before reporting completion.
- Annotate every test with a descriptive `@DisplayName` using the format `@DisplayName("t1 behavior and expected result")`, incrementing the lowercase number within each test class (`t1`, `t2`, `t3`, ...).
- Prefix each test method name with the matching number and a descriptive English name, for example `void t1_googleLoginRedirectsToProviderAuthorizationUrl()`.
- Use AssertJ assertions such as `assertThat`, `assertThatThrownBy`, and `assertThatCode` by default for readable assertions.
- Write Controller tests for request validation, HTTP status codes, response bodies, authentication, and authorization behavior.
- Write Service tests for business rules, transaction-relevant behavior, success paths, failure paths, and boundary conditions.
- Write Repository tests for custom queries, entity mapping, constraints, sorting, pagination, and data-access boundary conditions when applicable.
- Use integration tests when behavior crosses multiple MVC layers or depends on security, persistence, Flyway, or external configuration.
- When fixing a bug, add a regression test when practical.
- Prefer Service unit tests for business logic.
- Review Controller or integration tests for API changes.
- Validate repository queries and boundary conditions.
- Test authentication success, authentication failure, and insufficient permission separately.
- For frontend work, review loading, empty, error, and success states.
- Use mocks or stubs for external APIs when appropriate.
- Never use production data or real personal information in tests.
- Do not report completion while tests are failing.
- If tests cannot be executed, state the reason and provide the command the user can run.

---

## 12. Git and Collaboration Rules

- Keep `main` deployable and never push to it directly.
- Use `dev` as the integration branch and update it before starting work.
- Name new feature branches `feature/{domainName}-{detail}` and bug-fix branches `fix/{domainName}-{detail}`.
- Work in this order: update `dev`, create a work branch, implement one feature unit, commit and push, open a PR, receive review, and merge into `dev` after approval.
- Format commit messages as `type: 작업 내용` using `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `design`, `comment`, `rename`, `remove`, or `!HOTFIX`.
- Keep one purpose per commit and make the Korean commit subject explain the change clearly.
- Target PRs to `dev` and title them `[타입] #이슈번호 제목`.
- Include the related issue, work summary, screenshots or test results, review points, and checklist in every PR description.
- Require at least one approval, passing builds and tests, no conflicts, and a completed checklist before merge.
- Apply review feedback and request review again; the author resolves merge conflicts.
- Do not create branches, commits, pushes, pull requests, or merges unless explicitly requested.
- Follow the team's existing branching strategy and commit convention.
- Keep each change focused on one purpose whenever possible.
- Avoid unrelated mass formatting changes.
- Explain why shared or conflict-prone files were modified.
- Check that generated files, build outputs, IDE settings, and secret files are covered by `.gitignore`.
- Pull request descriptions should include purpose, major changes, test results, and cautions.
- Clearly mention API and database changes so teammates can review them.
- Link the relevant issue number when one exists.
- Modify lock files only when dependencies actually change.

---

## 13. Documentation Rules

Review related documentation when changing:

- Setup or execution steps
- Environment variables
- API paths or request and response formats
- Database schema
- Authentication flow
- Deployment process
- External service integrations
- Team-wide technical constraints

Document environment variables without real values:

```env
DATABASE_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 14. Prohibited Actions

- Unrequested full project restructuring
- Technology replacement without evidence or approval
- Committing real secrets or personal information
- Editing already-applied Flyway migration files
- Ignoring failed tests
- Delivering code that does not compile
- Leaving temporary mock data in production code
- Adding unused dependencies
- Relying only on frontend authorization
- Creating duplicate files without checking related code
- Hiding failures with empty exception handling
- Claiming work that was not actually performed

---

## 15. Final Response Format

Write the final response in Korean and keep it concise.

### Modified Files

- `path/to/file`
- `path/to/file`

### Key Changes

- What changed
- Why it changed
- Impact on existing functionality

### Validation

- Build, test, or lint commands that were actually executed
- Success or failure result
- Reason for any skipped validation

### Notes

- Required environment variables
- Database migrations
- Frontend and backend changes that must be deployed together
- Deployment considerations

---

## 16. Rule Priority

If rules conflict, follow this order:

1. The user's current request
2. A more specific `AGENTS.md` located in a subdirectory
3. The root `AGENTS.md`
4. Existing project conventions confirmed from code and tests
5. General development best practices

However, do not follow a request blindly when it creates a security issue or a risk of data loss. Explain the risk in Korean before proceeding.
