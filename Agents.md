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

