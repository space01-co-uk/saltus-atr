# Decision Rationale — Saltus ATR Questionnaire

## Why this project exists

This is a React SPA that implements Standard Life's 13-question attitude-to-risk questionnaire, using the EValue "5risk" system for questions and scoring. It's embedded via iframe on the Standard Life website, is fully anonymous (no login, no personal data), and produces a downloadable PDF report with the user's risk rating (1–5).

---

## Infrastructure

**Single CDK stack (not Amplify CLI)** — CDK gives explicit control over every resource, avoids Amplify's opinionated abstractions, and is easier to reason about. No hidden CloudFormation stacks or Amplify backend environments to manage.

**AppSync + Lambda pipeline resolvers (not REST API Gateway)** — AppSync gives us a typed GraphQL schema that documents the API contract explicitly in `infrastructure/lib/schema.graphql`. Pipeline resolvers chain the `getEvalueToken` Lambda (OAuth2) into the `getQuestions` and `calculateRisk` Lambdas, so token acquisition is a reusable first step rather than duplicated logic.

**JavaScript resolvers (not VTL)** — AppSync JS resolvers (runtime `APPSYNC_JS 1.0.0`) are the modern alternative to Velocity Template Language. They're more readable, easier to debug, and defined inline in the CDK stack — no separate `.vtl` files to manage.

**Cognito Identity Pool with unauthenticated access (not API keys or no auth)** — The app needs to be usable without login, but AppSync still needs an auth mode. Anonymous Cognito issues temporary AWS credentials scoped to `appsync:GraphQL` only. This means the API isn't truly "open" — you need valid (albeit temporary) credentials to call it — while still requiring zero user interaction for auth. An API key would have been simpler but expires after 365 days max and can't be scoped via IAM policies.

**`@sparticuz/chromium` via `nodeModules` (not a Lambda Layer)** — CDK's `NodejsFunction` with `nodeModules: ['@sparticuz/chromium']` tells esbuild to exclude the package from bundling and install it normally in the Lambda zip. A Layer would work but adds deployment complexity. The `nodeModules` approach keeps everything in a single construct. The PDF Lambda gets 2048MB RAM and 300s timeout because Chromium is memory-hungry and cold starts can take several seconds.

**S3 for PDF storage with pre-signed URLs (not inline response)** — PDFs can be several hundred KB. Returning them inline through AppSync/GraphQL would require base64 encoding (33% size increase) and risks hitting AppSync's 1MB response limit. S3 + pre-signed URL keeps the GraphQL response tiny and lets the browser fetch the binary directly. The 120-second URL expiry is short enough to limit link sharing but long enough for the download flow.

**Fresh OAuth token per request (not cached)** — The `getEvalueToken` Lambda fetches a new token from EValue on every request rather than caching. This is simpler than managing token refresh/expiry logic and avoids stale credential edge cases. The tradeoff is a small latency cost (~100ms) on each request, which is acceptable for this use case.

---

## Frontend

**Vite (not CRA)** — CRA is deprecated. Vite is the modern standard with faster builds, native ESM, and better plugin ecosystem. This also drove the decision away from `aws-appsync-auth-link` — that library uses Node.js `url.parse()` internally, which doesn't exist in Vite's browser environment. The custom SigV4 signing using `@smithy` packages (`src/graphql/client.ts`) is what AWS SDK v3 uses internally and works correctly in browser builds.

**Tailwind v4 + Headless UI v2 (not Ionic + Bootstrap + styled-components)** — The original app used three styling systems simultaneously. Tailwind v4's `@theme` directive in `src/index.css` replaces all three with a single approach, and Headless UI provides accessible primitives (RadioGroup) without opinionated styles. The `data-checked:` attribute pattern in Headless UI v2 maps directly onto Tailwind's data attribute variants — cleaner than v1's render-prop pattern.

**React Context + useReducer (not Redux/Zustand)** — The state shape is small and predictable: 13 questions, 13 answers, a current question index, and a risk rating. There's no async state, no cross-cutting concerns, no need for middleware. `useReducer` gives predictable state transitions with a clear action vocabulary (`src/context/questionnaireReducer.ts`) while avoiding dependency overhead.

**react-hook-form (not controlled inputs)** — Used specifically for required validation on the RadioGroup and clean `reset()` between questions. The `QuestionForm` component remounts via `key={currentQuestion}` on each question change, which naturally resets form state. react-hook-form's uncontrolled approach avoids unnecessary re-renders during the radio selection.

**Explicit mock mode (not silent fallback)** — Setting `VITE_USE_MOCK_DATA=true` enables an in-process mock (`src/graphql/mockLink.ts`) that returns hardcoded questions and runs a local scoring algorithm. This is opt-in rather than automatic — without the flag, the app expects a real AppSync backend and will surface errors if the API is unreachable. Silent fallback to mock data is a footgun: you'd never notice misconfigured env vars because the app just works with fake data. The mock scoring uses the same forward/reverse scoring rules from the EValue "5risk" spec (see `src/graphql/mockData.ts`).

**Blob fetch + FileSaver for PDF download (not direct navigation)** — Navigating directly to the pre-signed S3 URL would open the PDF in-browser on most browsers rather than downloading it. The `axios.get(url, { responseType: 'blob' })` → `saveAs(blob, 'risk-results.pdf')` approach guarantees a download prompt with a consistent filename across all browsers.

**Questions passed from frontend to PDF Lambda (not re-fetched)** — The `generateRiskResultPDF` mutation receives the full question text, answer text, and user selections as input rather than having the PDF Lambda call EValue again. This decouples PDF generation from the EValue API — the Lambda doesn't need OAuth credentials or network access to EValue. The tradeoff is a larger GraphQL mutation payload, but it's well within AppSync's limits.

---

## Known technical debt

- **No credential caching** — Cognito credentials are fetched fresh on every GraphQL request. Slightly wasteful but avoids expiry edge cases. A production app would cache with TTL-based refresh.
- **No rate limiting on Cognito identity pool** — Anyone can request anonymous credentials. Flagged as a production hardening item.
- **No retry logic for EValue API** — If EValue is down, requests fail immediately. A retry with exponential backoff would improve resilience.
- **CloudFront basic auth in CDK code** — The demo/dev CloudFront distribution uses Basic Auth with credentials defined inline in the CDK stack. Not production-grade — would need a proper auth mechanism for production.
