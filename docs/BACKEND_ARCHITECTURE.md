# Backend Architecture

## Architecture at a Glance

The backend is **fully serverless** on AWS: **AppSync** (managed GraphQL) sits in front of **Lambda functions**, which call the external **EValue API**. Authentication is anonymous via **Cognito Identity Pool** (unauthenticated access — no login needed).

There are **no VTL mapping templates**. The resolvers use **AppSync JavaScript resolvers** (runtime `APPSYNC_JS 1.0.0`), the newer, more readable alternative to VTL.

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                       │
│        (embedded in iframe on Standard Life website)          │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────┐       ┌──────────┐       ┌──────────┐
  │Query:    │       │Mutation: │       │Mutation: │
  │getQuestions      │calculateRisk     │generateRiskResultPDF
  └────┬─────┘       └────┬─────┘       └────┬─────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
        ┌─────────────────▼──────────────────┐
        │  AppSync GraphQL API (IAM Auth)    │
        │  - Pipeline Resolvers (JS 1.0.0)   │
        │  - 3 Lambda Data Sources           │
        └─────────────────┬──────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
        ▼                                    ▼
  ┌──────────────────────┐        ┌──────────────────────┐
  │ EValue API Service   │        │ AWS S3 + CloudFront  │
  │ (External, OAuth2)   │        │ (PDF Storage & CDN)  │
  └──────────────────────┘        └──────────────────────┘
```

## The Three GraphQL Operations

### 1. `getQuestions` (Query) — Pipeline Resolver

A **pipeline resolver** with two steps that chain together:

```
Frontend → AppSync → [Step 1: getEvalueToken Lambda] → [Step 2: getQuestions Lambda] → Frontend
```

**Step 1 — `getEvalueTokenFn`:**

- Reads OAuth2 credentials (`EVALUE_CONSUMER_KEY` + `EVALUE_CONSUMER_SECRET`) from **AWS Secrets Manager**
- POSTs to `https://api.evalueproduction.com/token` with `grant_type=client_credentials`
- Returns `{ access_token, token_type, expires_in }`

**Step 2 — `getQuestionsFn`:**

- Receives the token via `event.prev.result.access_token` (pipeline steps pass data via `ctx.prev.result`)
- POSTs to the EValue API's `getQuestionnaireData` endpoint with `{ questionnaireName: '5risk' }`
- **Transforms** the response: converts numeric `questionId`/`responseId` to strings (GraphQL schema uses `String!`) and renames fields (`questionText` → `text`, `responses` → `answers`, etc.)
- Returns the array of 13 questions

**Why a pipeline?** The token fetch is a separate concern. By making it its own pipeline function, it can be **reused** across multiple resolvers (and it is — `calculateRisk` uses the same `getEvalueTokenFn` as step 1).

### 2. `calculateRisk` (Mutation) — Pipeline Resolver

Same pattern, two steps:

```
Frontend → AppSync → [Step 1: getEvalueToken Lambda] → [Step 2: calculateRisk Lambda] → Frontend
```

**Step 1** is the same `getEvalueTokenFn` — fetches a fresh OAuth2 token.

**Step 2 — `calculateRiskFn`:**

- Gets the token from `event.prev.result.access_token`
- Gets user answers from `event.arguments.responses`
- POSTs to EValue's `calculateRisk` endpoint with the responses + `questionnaireName: '5risk'` + `term: 15`
- EValue returns something like `{ riskProfile: 3.7 }`
- The Lambda **clamps** it to [1, 5] and **truncates** the decimal via `parseInt()` — so `3.7` → `3`, `0.5` → `1`, `6.2` → `5`
- Returns `{ rating: 3 }`

### 3. `generateRiskResultPDF` (Mutation) — Direct Resolver (NOT a pipeline)

A **direct Lambda invocation**, no pipeline needed because it doesn't call the EValue API (no token required).

```
Frontend → AppSync → generatePDF Lambda → S3 → Pre-signed URL → Frontend
```

The frontend sends **everything** the PDF needs as input: the risk rating, all 13 questions with their text, and the user's selected answers. The Lambda:

1. Validates input (rating must be 1–5, arrays non-empty)
2. Escapes JSON for safe HTML embedding (prevents injection)
3. Compiles an HTML template using lodash `_.template()` — a 3-page A4 layout
4. Launches **Puppeteer + headless Chromium** (`@sparticuz/chromium`) in the Lambda
5. Renders the HTML → PDF
6. Uploads to S3 (`{uuid}.pdf`)
7. Generates a **pre-signed URL** (expires in 120 seconds)
8. Returns `{ url: "https://s3...signed-url" }`

This Lambda needs 2048MB memory and 300s timeout because Chromium is resource-heavy.

## How Pipeline Resolvers Work (the JS part)

In `infrastructure/lib/saltus-atr-stack.ts`, the resolver JS is defined inline in the CDK code.

**Each AppSync Function** has a request/response handler:

```javascript
// Request — forwards context to the Lambda
export function request(ctx) {
  return {
    operation: "Invoke",
    payload: { prev: ctx.prev, arguments: ctx.arguments }
  };
}

// Response — passes Lambda result to next step (or final output)
export function response(ctx) {
  return ctx.result;
}
```

**The Pipeline Resolver itself** has a thin response handler:

```javascript
export function response(ctx) {
  return ctx.prev.result; // returns whatever the last pipeline step returned
}
```

The key concept: `ctx.prev.result` is the **threading mechanism** — each step in the pipeline can access the previous step's output. That's how step 2 gets the OAuth token from step 1.

## Data Flow: Frontend → AppSync

The frontend uses **Apollo Client** with AWS IAM signing:

1. On app load, `CognitoIdentityClient` fetches temporary AWS credentials (anonymous — no login)
2. Every GraphQL request is signed with **SigV4** using `@smithy/signature-v4`
3. AppSync validates the IAM signature and routes to the appropriate resolver

If `VITE_USE_MOCK_DATA=true` is set, the frontend uses an in-process mock instead of calling AppSync (useful for local dev). Without this flag, the app expects a real backend.

## Data Transformation

### EValue API → GraphQL Schema

| EValue Field                  | GraphQL Equivalent  | Transformation               |
| ----------------------------- | ------------------- | ----------------------------- |
| `questionId` (number)         | `Question.id` (String!) | `String(questionId)`      |
| `questionText`                | `Question.text`     | Direct                        |
| `responses[*].responseId`     | `Answer.id`         | `String(responseId)`          |
| `responses[*].responseText`   | `Answer.text`       | Direct                        |
| `riskProfile` (decimal 1–5)   | `RiskResult.rating` | `parseInt()`, clamped to [1,5] |

### Frontend → PDF Lambda

| Frontend Input                         | Lambda Input     | Purpose                                    |
| -------------------------------------- | ---------------- | ------------------------------------------ |
| `responses: [{ questionId, responseId }]` | `RiskAnswers`  | Track which answers user selected          |
| Questions fetched + user answers       | `RiskQuestions`  | Complete question+answer context for PDF   |
| Risk rating from `calculateRisk`       | `RiskRating`     | Display in PDF results page                |

## Key Design Decisions

| Decision                            | Why                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| **Pipeline resolvers**              | Token fetch is shared between `getQuestions` and `calculateRisk` — DRY                    |
| **JS resolvers, not VTL**           | More readable, easier to maintain, modern AppSync approach                                |
| **Fresh token per request**         | Simpler than caching + refresh logic; EValue tokens may have short expiry                 |
| **Questions passed from FE to PDF** | Decouples PDF generation from EValue API — PDF Lambda doesn't need credentials            |
| **Pre-signed URLs (2min expiry)**   | Security — prevents long-lived links to risk reports being shared                         |
| **Cognito unauthenticated**         | Questionnaire is anonymous by design — no personal data, no login                         |

## Infrastructure

### Lambda Functions

All Lambda functions use **Node.js 22.x**, minified via esbuild with source maps.

| Lambda              | Memory  | Timeout | Key Dependencies                        |
| ------------------- | ------- | ------- | ---------------------------------------- |
| `getEvalueToken`    | 128 MB  | 30s     | AWS Secrets Manager                      |
| `getQuestions`       | 128 MB  | 30s     | —                                        |
| `calculateRisk`     | 128 MB  | 30s     | —                                        |
| `generatePDF`       | 2048 MB | 300s    | `puppeteer-core`, `@sparticuz/chromium`  |

### S3 Buckets

- **Hosting bucket** — frontend SPA (S3 + CloudFront with Origin Access Control)
- **PDF bucket** — generated reports (`saltus-atr-questionnaire-pdf-{account-id}`), private, CORS enabled for CloudFront URL + localhost

### Secrets

- **Secret name:** `SALTUS-ATR-EVALUE-dev`
- **Format:** JSON with `EVALUE_CONSUMER_KEY`, `EVALUE_CONSUMER_SECRET`
- Only the `getEvalueToken` Lambda has IAM permission to read this secret

### Deployment

```bash
# Deploy infrastructure (from infrastructure/ directory)
AWS_PROFILE=jr-dev npx cdk deploy SaltusAtrQuestionnaireStack

# Deploy frontend only (builds + syncs to S3 + invalidates CloudFront)
AWS_PROFILE=jr-dev bash scripts/deploy-frontend.sh
```
