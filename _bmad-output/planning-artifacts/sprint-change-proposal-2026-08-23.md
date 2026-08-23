# Sprint Change Proposal — Portfolio Data Alignment with CV

**Date:** 2026-08-23
**Author:** Correct Course workflow (Developer role)
**Status:** Approved by Gokul
**Change Scope:** Moderate

---

## Section 1: Issue Summary

`public/portfolio-data.json` — the single content source hydrated at runtime (AD-11 contract) — still ships scaffold placeholder data: fictional employers ("Example Corp", "Previous Systems Ltd"), fictional projects (`cluster-control`, `ledger-stream`, `probe-mesh`), placeholder contact details (`you@example.com`, `github.com/example/*`), and generic fintech topology nodes.

The portfolio is a live job-seeking asset; every rendered panel currently presents fabricated content that does not match Gokul Nair's actual CV (`gokul_v4.tex`: Java Backend Engineer, 5 years, Neosoft Technologies, core banking / insurance / HR-platform projects).

Discovered during post-sprint content review, before go-live.

## Section 2: Impact Analysis

### Epic Impact
- **No epic invalidated.** Epics 1–4 delivered a content-driven application specifically so data swaps require no structural code changes — this change validates that architecture.
- Epic structure, order, and priorities unchanged.

### Story Impact
- Touches Story 1-3 (runtime JSON content hydration) deliverable content only — the hydration mechanism itself is unaffected.
- No new stories required; work is direct implementation of approved edits.

### Artifact Conflicts
| Artifact | Conflict | Resolution |
|---|---|---|
| `portfolio-data.ts` (AD-11 contract) | `repoUrl` field removed from schema | Update `ProjectEntry` + parser guards |
| `portfolio-json-contract.spec.ts` | Hard-coded topology node IDs and `payment-service → postgresql-db` link assertion; `repoUrl` assertions | Update round-trip expectations to new node IDs/link; drop `repoUrl` checks |
| Test fixtures (`app.spec.ts`, `portfolio-data-loader.service.spec.ts`, `cluster-state.service.spec.ts`) | `repoUrl` in fixture data | Remove field |
| PRD | None — content-agnostic | N/A |
| Architecture spine | None — AD-11 shape preserved except field removal | Note field removal |

### Technical Impact
- UI consumption audit found `projects[]` is **not rendered by any feature** — `repoUrl` removal is zero-UI-impact.
- Consumed sections: `experience` (career-pods), `envProperties` (env-registry), `topology` (service-topology), `health` (simulation engine), `contact.email` (swagger-playground).
- Topology re-theme stays exactly at `MAX_TOPOLOGY_NODES = 5`; simulation engine operates generically over nodes.

## Section 3: Recommended Approach

**Selected approach: Direct Adjustment (Option 1).**

- Effort estimate: **Low** (~half day including test updates)
- Risk level: **Low** — no schema-shape surprises, all runtime guards updated in lockstep
- Timeline impact: None — fits within current sprint as a content-population task
- Rationale: Rollback is meaningless (nothing to revert to but placeholders); MVP review unnecessary since the MVP is unaffected. Direct adjustment preserves momentum.

User decisions recorded:
1. Topology re-themed to real multi-region core banking platform (requires contract spec update) — approved
2. Repo links removed entirely rather than pointing to non-existent repos — approved
3. Topology metrics populated with simulated plausible values anchored to real CV claims where fitting — approved

## Section 4: Detailed Change Proposals

### 4.1 JSON Data — `public/portfolio-data.json`

**contact** — replace placeholders with CV identity:
```json
{
  "email": "gokul.nairmurali@gmail.com",
  "github": "https://github.com/Gokulnair21",
  "linkedin": "https://www.linkedin.com/in/gokul-nair-7a5882195/"
}
```

**experience** — single real entry:
```json
[
  {
    "company": "Neosoft Technologies",
    "role": "Associate Team Lead — Java Backend Engineer",
    "period": "Jun 2021 — Present",
    "highlights": [
      "Owned end-to-end backend architecture for a multi-region core banking platform (Algeria, Egypt, Tunisia) built on Spring Boot microservices — onboarding, payments, term deposits, and loans.",
      "Accelerated BFF performance from 7s to under 3s by decoupling static and dynamic data paths via Redis caching and async loading.",
      "Secured all inter-service and client communication with Mutual TLS (mTLS) plus AES encryption for financial data in transit across three country deployments.",
      "Scaled engineering quality across an 8–10 person team — code review standards and internal sessions on Kafka, CQRS, and resilience patterns drove a 35% reduction in recurring architecture defects.",
      "Led technical hiring for mid-to-senior Java backend roles, defining the evaluation bar and screening pipeline."
    ]
  }
]
```

**projects** — three real client projects, no `repoUrl`:
```json
[
  {
    "name": "Bank ABC",
    "description": "Multi-country core banking platform — idempotent payment APIs with zero double-debit incidents, Drools-based onboarding BRMS, and mTLS-secured communication across Algeria, Egypt, and Tunisia.",
    "stack": ["Spring Boot", "Kafka", "Drools", "mTLS"]
  },
  {
    "name": "TATA AIG",
    "description": "Insurance BFF platform — webhook-driven event callbacks eliminating 80,000+ redundant API calls/day, Kafka multi-consumer-group sync pipeline, and circuit-breaker-guarded third-party integrations.",
    "stack": ["Spring Boot", "Kafka", "Redis", "Circuit Breaker", "Dynatrace"]
  },
  {
    "name": "EKAM — Union Bank of India",
    "description": "Enterprise HR platform for 60,000+ employees — hierarchical RBAC (Branch/Region/Zone/Corporate), JWT auth with refresh rotation, and AES encryption for all PII fields.",
    "stack": ["Spring Boot", "MySQL", "JWT", "RBAC", "AES"]
  }
]
```

**topology** — core-banking themed, 5 nodes (at layout max):
- `bff-gateway` — BFF gateway for three country deployments; Redis cache with DB fallback, async user data. Stack: Spring Boot, Spring Cloud, Redis. Metrics: Load Time `< 3 s` (CV-derived), P99 `38 ms`, Error Rate `0.01%`.
- `onboarding-service` — Drools BRMS rule-driven onboarding validation. Stack: Spring Boot, Drools, Kafka. Metrics: Onboarding/min `120`, Rule Eval P99 `24 ms`, Error Rate `0.00%`.
- `payment-service` — idempotent transaction APIs, zero double-debits in production. Stack: Spring Boot, Kafka, mTLS. Metrics: Throughput `210 txn/s`, Double-Debits `0` (CV-derived), Error Rate `0.00%`.
- `deposit-service` — TD/CD term deposits and loan calculator with per-country regulatory compliance. Stack: Spring Boot, Hibernate, JPA. Metrics: Bookings/day `4,800`, P99 `51 ms`, Error Rate `0.02%`.
- `core-bank-db` — primary relational store replicated across regions. Stack: MySQL, Replication. Metrics: Connections `72 / 100`, Replication Lag `0.3 s`, Error Rate `0.00%`.

Links: `bff-gateway → {onboarding-service, payment-service, deposit-service}`; `{payment-service, deposit-service} → core-bank-db`.

**envProperties** — skills mapped from CV Technical Skills:
```
spring.profiles.active = portfolio-prod                          (unchanged)
management.endpoints.web.exposure.include = health,info,metrics  (unchanged)
cluster.region = ap-south-1
gokul.skills.languages = Java 8/17/21, Kotlin
gokul.skills.frameworks = Spring Boot, Spring MVC, Spring Security, Spring Cloud, Hibernate, JPA
gokul.skills.architecture = Microservices, REST API Design, Event-Driven, Saga, CQRS, Circuit Breaker
gokul.skills.messaging = Apache Kafka (multi consumer groups)
gokul.skills.security = mTLS, JWT, OAuth2, RBAC, AES Encryption
gokul.skills.persistence = MySQL, PostgreSQL, Redis
gokul.skills.observability = Dynatrace, Docker, Jenkins, AWS
gokul.skills.testing = JUnit, Mockito, Git, Bitbucket
```

**health** — unchanged (simulation inputs, not CV content).

### 4.2 Code Changes — Schema & Tests

| File | Change |
|---|---|
| `src/app/core/data/portfolio-data.ts` | Remove `repoUrl` from `ProjectEntry`; remove its validation line from `parseProjectEntry` |
| `src/app/core/data/portfolio-json-contract.spec.ts` | Drop `repoUrl` regex assertion and mapping key; update hard-coded topology ID array to `bff-gateway, onboarding-service, payment-service, deposit-service, core-bank-db`; replace `payment-service → postgresql-db` link assertion with `payment-service → core-bank-db` |
| `src/app/app.spec.ts` | Remove `repoUrl` from fixture |
| `src/app/core/data/portfolio-data-loader.service.spec.ts` | Remove `repoUrl` from fixture |
| `src/app/core/state/cluster-state.service.spec.ts` | Remove `repoUrl` from fixture |

## Section 5: Implementation Handoff

**Scope classification: Moderate** — direct implementation plus backlog/test coordination.

- **Handoff recipient:** Developer agent (bmad-build)
- **Responsibilities:**
  1. Apply schema change (`portfolio-data.ts`) and update all affected tests
  2. Populate `public/portfolio-data.json` per Section 4.1
  3. Run full unit test suite + lint/typecheck; verify app boots and hydrates
- **Success criteria:**
  - All unit tests pass (including updated contract spec)
  - Lint/typecheck clean
  - Career-pods shows Neosoft pod with 5 highlights; env-registry renders 11 skill rows; service-topology renders 5 banking-themed nodes with links; swagger-playground contact form targets `gokul.nairmurali@gmail.com`
  - Zero placeholder strings remain anywhere in rendered UI (`example.com`, `your-handle`, `Example Corp`)
