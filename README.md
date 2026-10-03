# SOC Incident Intelligence Platform: Backend

A multi-tenant backend for a Security Operations Center (SOC) platform. It ingests security alerts, correlates them into incidents, ranks them by explainable risk, and (in later milestones) uses GraphRAG + an LLM to help analysts understand incidents.

> **Design principle:** deterministic backend services are the source of truth. The LLM is an assistant, never the authority, and the platform keeps working when the LLM is down.

## Project status

| Milestone | Scope | Status |
|---|---|---|
| **M1** | Backend foundation: Express, Prisma, PostgreSQL, Docker, JWT, RBAC, tenant isolation | Complete |
| M2 | Alert ingestion: CSV/JSON upload, MinIO, BullMQ, idempotency | Planned |
| M3 | Normalization, entity extraction, correlation | Planned |
| M4 | Enrichment, MITRE ATT&CK mapping, risk engine | Planned |
| M5 | Incident APIs, state machine, analyst actions, audit | Planned |
| M6 | Knowledge ingestion + GraphRAG (pgvector + graph tables) | Planned |
| M7 | LLM briefs, structured output validation, fallback | Planned |
| M8 | Metrics (MTTT), observability, hardening | Planned |

## Tech stack

- **Runtime:** Node.js 22, Express 5
- **Database:** PostgreSQL 16 (`pgvector` image, ready for M6) via Prisma 6
- **Auth:** JWT access tokens + rotating refresh tokens, bcrypt
- **Validation:** Zod
- **Logging:** Pino (`pino-http`, with secret redaction)
- **Security:** Helmet, CORS allow-list, rate limiting on auth routes
- **Testing:** Jest + Supertest
- **Infra:** Docker + Docker Compose

## What M1 delivers

- Registration that creates a tenant and its first `ADMIN` user
- Login, token refresh with **rotation and reuse detection**, and logout
- Role-based access control: `TIER_1_ANALYST`, `TIER_2_ANALYST`, `SOC_MANAGER`, `ADMIN`, `AI_SERVICE`
- **Tenant isolation:** `tenantId` always comes from the verified JWT, never from the request body, params or query. Cross-tenant access returns `404`
- Tenant-scoped repository pattern (reference implementation: `assets`)
- Append-only audit log for registration and login events
- A single error format, request IDs on every response, health and readiness endpoints, graceful shutdown
- Env validation that fails fast on bad config
- Integration tests covering auth, RBAC and tenant isolation

## Project structure

```
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── src/
│   ├── app.js                 Express app (no listen, so tests can import it)
│   ├── server.js              Entry point + graceful shutdown
│   ├── routes.js
│   ├── config/                env.js, db.js
│   ├── middleware/            auth.js, rbac.js, validate.js, error.js
│   ├── modules/
│   │   ├── auth/              routes, controller, service, validation
│   │   ├── users/
│   │   ├── assets/            tenant-scoped repository example
│   │   └── audit/
│   └── utils/                 logger.js, errors.js, tokens.js
├── tests/integration/
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Getting started

### Prerequisites

- Node.js 22+
- Docker Desktop
- Git

### 1. Clone and install

```bash
git clone https://github.com/rajyadav2020/mitre-attacks.git
cd =mitre-attacks
npm install
```

### 2. Configure environment

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Generate a strong JWT secret and put it in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Run migrations and seed demo data

```bash
npx prisma migrate dev
npm run seed
```

### 5. Run the API

```bash
npm run dev
```

The API is now at `http://localhost:3000`.

### Or run everything in Docker

```bash
docker compose up --build
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development`, `test` or `production` | `development` |
| `PORT` | API port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 32 chars) | required |
| `JWT_ACCESS_TTL` | Access token lifetime | `15m` |
| `REFRESH_TTL_DAYS` | Refresh token lifetime in days | `7` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:5173` |
| `LOG_LEVEL` | Pino log level | `info` |

## API reference (M1)

Base path: `/api/v1`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/health` | none | | Liveness check |
| GET | `/ready` | none | | Readiness check (verifies DB) |
| POST | `/auth/register` | none | | Create tenant + ADMIN user |
| POST | `/auth/login` | none | | Returns access + refresh tokens |
| POST | `/auth/refresh` | none | | Rotate refresh token |
| POST | `/auth/logout` | none | | Revoke refresh token |
| GET | `/users/me` | JWT | any | Current user |
| POST | `/users` | JWT | ADMIN | Create a user in your own tenant |
| GET | `/assets` | JWT | any | List tenant assets |
| GET | `/assets/:id` | JWT | any | Get a tenant asset |
| POST | `/assets` | JWT | ADMIN, SOC_MANAGER | Create an asset |

`/health` and `/ready` are served at the root, outside `/api/v1`.

### Example

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.io","password":"Passw0rd!Passw0rd"}'
```

### Error format

Every error uses the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [{ "path": "email", "message": "Invalid email" }],
    "requestId": "b1c2d3e4-..."
  }
}
```

### Demo accounts (after `npm run seed`)

Password for all: `Passw0rd!Passw0rd` (demo only, never use in production)

| Email | Role |
|---|---|
| admin@demo.io | ADMIN |
| manager@demo.io | SOC_MANAGER |
| t2@demo.io | TIER_2_ANALYST |
| t1@demo.io | TIER_1_ANALYST |

## Testing

Create a separate test database and `.env.test`:

```bash
docker compose exec postgres psql -U soc -d soc -c "CREATE DATABASE soc_test;"
```

Apply migrations to it, then run the suite:

```bash
# PowerShell
$env:DATABASE_URL="postgresql://soc:soc_password@localhost:5432/soc_test"
npx prisma migrate deploy
npm test
```

Tests cover: register and `/me`, 401 without a token, cross-tenant 404, body `tenantId` ignored, RBAC 403, and refresh-token reuse rejection.

## Security notes

- Passwords are hashed with bcrypt (cost 12)
- Refresh tokens are stored only as SHA-256 hashes; reuse of a rotated token revokes all of the user's active tokens
- Login returns the same error for unknown email and wrong password, with constant-time-ish comparison
- JWT verification pins the algorithm (HS256) and issuer
- Auth endpoints are rate limited
- Logs redact authorization headers, passwords and tokens
- Responses never include stack traces

### Known limitations (prototype)

- Access tokens are not checked against the DB on each request, so a disabled user stays valid until the token expires (max 15 min)
- `AI_SERVICE` role exists but has no login path yet (planned for M7)
- No email verification or password reset (out of scope for this project)

## Roadmap

Next up is **M2: Alert Ingestion**: Redis + BullMQ, MinIO raw storage, `IngestBatch` and `Alert` models, alert fingerprints, and idempotency keys. The target is uploading a 3,000-alert dataset and receiving a `202 Accepted` batch response.

