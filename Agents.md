# Repository Rules

These rules apply to the full repository.

## 1) File Size Hard Limit

- Every source/config/documentation file must have a hard limit of `200` lines.
- Count all lines: code, comments, blank lines, and imports.
- If a change would exceed `200` lines, split logic into smaller files/modules.
- Do not merge PRs that violate this rule.

## 2) Secret Handling and Security Baseline

- Never commit secrets, credentials, or private keys.
- Forbidden in git history:
  - API keys, access tokens, passwords, client secrets
  - `.env` values and local secret config files
  - SSH keys, TLS keys, certificates with private material
  - database dumps containing private or personal data
- Keep secrets in environment variables or secret managers only.
- Commit only redacted examples such as `.env.example` with placeholder values.
- If a secret is exposed:
  - rotate it immediately
  - remove it from code
  - clean git history if required
- Do not log sensitive values (tokens, passwords, personal identifiers).
- Validate and sanitize all external input before use.
- Escape untrusted output rendered into HTML to prevent XSS.
- Use parameterized queries for database access (no string-built SQL).
- Use least-privilege credentials for apps, DBs, and APIs.
- Keep dependencies updated and pin versions where possible.
- Review third-party code and packages before adding them.

## 3) Commit Hygiene

- Do not commit generated artifacts, caches, local DB files, or logs.
- Use `.gitignore` as the baseline enforcement.
- Prefer small, focused commits with clear messages.

## 4) Mandatory Validation Checks (When Relevant)

- Before opening or updating a PR, run all relevant checks for changed components.
- A check is "relevant" when the related stack/files are touched.
- If a check exists and fails, the PR is blocked until fixed.
- If a check does not exist yet, add it as part of migration work when practical.

### 4.1 Frontend checks (if `frontend/` or UI files changed)

- Lint: run `npm run lint` (or equivalent frontend lint command).
- Type safety: run `npm run typecheck` for TypeScript projects.
- Unit tests: run `npm test` (or `npm run test`).
- Build: run `npm run build`.

### 4.2 Backend checks (if `backend/` changed)

- Lint: run backend lint command (for example `npm run lint`).
- Type safety: run `npm run typecheck` for TypeScript backends.
- Unit/integration tests: run `npm test` (or framework equivalent).
- Build/startup validation: run `npm run build` (if defined) and start smoke check.

### 4.3 Python checks (if Python code is added/changed)

- Lint/style: run `ruff check` (or existing linter in repo).
- Type safety: run `mypy` (if typed Python is used).
- Tests: run `pytest`.

### 4.4 Infra and deployment checks (if `infra/`, Docker, or scripts changed)

- Compose validation: run `docker compose -f infra/docker-compose.yml --env-file .env.example config`.
- Container build validation: run `docker compose -f infra/docker-compose.yml --env-file .env.example build`.
- Script validation: run shell scripts with `bash -n` before execution.

### 4.5 Security checks (for all PRs)

- Secret scan before commit/push:
  - `git diff --cached` review for sensitive strings
  - `rg -n "(api[_-]?key|secret|token|password|private[_-]?key)"` on changed files
- Dependency review:
  - Run `npm audit` where Node dependencies are changed.
- Verify no `.env`, key files, dumps, or credentials are staged.

## 5) PR Acceptance Gate

- PR must include:
  - summary of changes
  - list of executed checks and outcomes
  - any skipped checks with reason
- "Untested" changes are not allowed unless explicitly approved with rationale.
