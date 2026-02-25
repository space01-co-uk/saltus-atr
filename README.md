# ATR Questionnaire

A 13-question attitude-to-risk questionnaire (EValue "5risk" system) built as a React SPA. Embedded via iframe on the Standard Life website, fully anonymous (no auth or personal data), and calculates a risk rating 1–5 with a downloadable PDF report.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Package Manager:** Yarn 4.x (Berry)
- **Backend:** AWS AppSync (GraphQL, IAM auth), Lambda (Node.js 22.x)
- **External API:** EValue (OAuth2, questions + risk scoring)
- **Infrastructure:** AWS CDK
- **Hosting:** S3 + CloudFront (CDK-managed)
- **CI/CD:** Manual deploy via CLI

## How It Works

1. **Questions** are fetched at runtime from the **EValue API** via a pipeline resolver: AppSync → `getEvalueToken` Lambda (OAuth2) → `getQuestions` Lambda → EValue API. The frontend receives them via a GraphQL query.
2. **User answers** all 13 questions in a forward-only flow (no back button). State is held in-memory with React Context + `useReducer` — nothing is persisted.
3. **Risk score** (1–5) is calculated by the **EValue API** via a second pipeline resolver: AppSync → `getEvalueToken` Lambda → `calculateRisk` Lambda → EValue API. The returned decimal is clamped to [1, 5] and truncated.
4. **PDF report** is generated on-demand by a Lambda running headless Chromium (Puppeteer), uploaded to S3, and returned as a pre-signed URL (120s expiry). This is a direct resolver (no pipeline, no EValue call) — the frontend passes all the data it needs.

There is no database. The only stored artifact is the temporary PDF in S3. The EValue API is the source of truth for questions and risk scoring.

For a detailed backend walkthrough, see [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md).

## Getting Started

```bash
yarn install        # Install dependencies
yarn start          # Dev server
yarn build          # Production build
yarn test           # Run tests (Jest, watch mode)
```

Set `VITE_USE_MOCK_DATA=true` in a `.env.local` file to use mock data without a backend. Without this flag, the app expects a real AppSync endpoint and will show errors if the API is unreachable.

## Routes

| Route            | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `/`              | Landing page with risk level info and CTA |
| `/questionnaire` | 13 questions with progress bar            |
| `/results`       | Risk rating display and PDF download      |
| `/error`         | Technical error with back button          |

## Environment Variables

| Variable                        | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| `VITE_APPSYNC_ENDPOINT`         | AppSync GraphQL endpoint URL                           |
| `VITE_APPSYNC_REGION`           | AWS region (defaults to `eu-west-2`)                   |
| `VITE_COGNITO_IDENTITY_POOL_ID` | Cognito Identity Pool ID for anonymous auth            |
| `VITE_PARENT_ORIGIN`            | Allowed parent origin for iframe `postMessage`         |
| `VITE_USE_MOCK_DATA`            | Set to `true` to use mock data instead of the real API |

## Deployment

```bash
# Deploy infrastructure (from infrastructure/ directory)
AWS_PROFILE=saltusspace npx cdk deploy SaltusAtrQuestionnaireStack

# Deploy frontend only (builds + syncs to S3 + invalidates CloudFront)
AWS_PROFILE=saltusspace bash scripts/deploy-frontend.sh
```
