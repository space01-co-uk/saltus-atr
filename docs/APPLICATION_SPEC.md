# SLAL Risk UK Adviser Customer Handover — Application Specification

## 1. Overview

A React single-page application embedded via iframe on the Standard Life website. It presents an EValue "5risk" attitude-to-risk questionnaire (13 questions), submits answers to EValue's API to calculate a risk rating (1–5), displays results, and generates a downloadable PDF report. The app is anonymous — no user authentication or personal data is collected.

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend framework | React 18.2 + TypeScript 5.x |
| Build toolchain | Create React App 5.0.1 (react-scripts) |
| Routing | React Router DOM 6.x (BrowserRouter) |
| State management | React Context + useReducer (custom pattern) |
| GraphQL client | Apollo Client 3.x with aws-appsync-auth-link |
| Forms | react-hook-form 7.x |
| UI components | Ionic React 8.x, React Bootstrap 2.x, styled-components 5.x, Headless UI 2.x |
| Analytics | Google Tag Manager via react-gtm-module |
| Backend API | AWS AppSync (GraphQL, IAM auth) |
| Auth | AWS Cognito (unauthenticated identity pool — no login) |
| Lambda runtime | Node.js 22.x (TypeScript) |
| PDF generation | Puppeteer-core + @sparticuz/chromium in Lambda (2048MB, 300s timeout) |
| Infrastructure | AWS CDK (WAF, Cognito, PDF services), Amplify CLI (AppSync, hosting) |
| Hosting | S3 + CloudFront (via Amplify) |
| Secrets | AWS Secrets Manager (SLAL-RISK-UK-ADVISER-{env}) |
| CI/CD | Bitbucket Pipelines |
| Package manager | Yarn 4.x (Berry) |
| Node version | 22 |

## 3. GraphQL Schema

```graphql
type Query {
    getQuestions: [Question]
        @function(name: "getEvalueTokenUKAdviserCustHandover-${env}")
        @function(name: "getRiskQuestionsUKAdviserCustHandover-${env}")
}

type Mutation {
    calculateRisk(responses: [Response]): RiskResult
        @function(name: "getEvalueTokenUKAdviserCustHandover-${env}")
        @function(name: "calculateRiskUKAdviserCustHandover-${env}")

    generateRiskResultPDF(input: RiskResultPDFInput): PDFOutput
        @function(name: "generateRiskResultPDFUKAdviserCustHandover-${env}")
}

type Question    { id: ID!; text: String!; answers: [Answer]! }
type Answer      { id: ID!; text: String! }
type RiskResult  { rating: Int! }
type PDFOutput   { url: String! }
input Response   { questionId: ID!; responseId: ID! }
input RiskResultPDFInput { RiskRating: String!; RiskAnswers: [RiskAnswerInput] }
input RiskAnswerInput    { questionId: Int!; responseId: Int! }
```

The `@function` directives create pipeline resolvers — Lambdas execute sequentially, each receiving the previous Lambda's return value as `event.prev.result`.

## 4. EValue API Integration (Backend Lambda Functions)

### 4.1 Authentication: getEvalueTokenUKAdviserCustHandover

This Lambda runs first in every pipeline (both getQuestions and calculateRisk). Tokens are NOT cached — a fresh token is obtained per request.

Flow:

1. Fetch secret `SLAL-RISK-UK-ADVISER-{ENV}` from AWS Secrets Manager (eu-west-1)
2. Secret contains: `{ EVALUE_CONSUMER_KEY, EVALUE_CONSUMER_SECRET }`
3. POST to EValue OAuth endpoint

```
POST https://api.evalueproduction.com/token
Headers:
  Authorization: Basic <base64(EVALUE_CONSUMER_KEY:EVALUE_CONSUMER_SECRET)>
  Content-Type: application/x-www-form-urlencoded
Body:
  grant_type=client_credentials
```

Response (returned as `event.prev.result` to next Lambda):

```json
{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600, "scope": "..." }
```

### 4.2 Fetch Questions: getRiskQuestionsUKAdviserCustHandover

Receives bearer token from `event.prev.result.access_token`. Throws if missing.

```
POST https://api.evalueproduction.com/riskQuestionnaire/1.0.0/riskProfiler/getQuestionnaireData
Headers:
  Authorization: Bearer <access_token>
Body:
  { "questionnaireName": "5risk" }
```

EValue Response:

```typescript
{
  name: string;
  version: number;
  questions: Array<{
    questionId: number;
    questionText: string;
    responses: Array<{ responseId: number; responseText: string }>
  }>
}
```

Transformation (returned to frontend):

```
questionId   -> id
questionText -> text
responseId   -> id  (nested under answers)
responseText -> text (nested under answers)
```

Returns an array of Question objects (currently 13 questions).

### 4.3 Calculate Risk: calculateRiskUKAdviserCustHandover

Receives bearer token from `event.prev.result.access_token`. Responses come from `event.arguments.responses`.

```
POST https://api.evalueproduction.com/riskQuestionnaire/1.0.0/riskProfiler/calculateRisk
Headers:
  Authorization: Bearer <access_token>
Body:
  {
    "responses": [{ "questionId": "1", "responseId": "2" }, ...],
    "questionnaireName": "5risk",
    "term": 15
  }
```

Note: `term: 15` is hardcoded (represents a 15-year investment term).

EValue Response:

```json
{ "riskProfile": 3.7 }
```

Transformation (`transformRiskProfile`):

1. If `riskProfile < 1` -> clamp to 1
2. If `riskProfile > 5` -> clamp to 5
3. `parseInt(riskProfile)` — truncate to integer

Returns: `{ rating: <integer 1-5> }`

### 4.4 EValue API Endpoints Summary

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `https://api.evalueproduction.com/token` | POST | OAuth2 client_credentials |
| `https://api.evalueproduction.com/riskQuestionnaire/1.0.0/riskProfiler/getQuestionnaireData` | POST | Fetch questionnaire |
| `https://api.evalueproduction.com/riskQuestionnaire/1.0.0/riskProfiler/calculateRisk` | POST | Calculate risk rating |

## 5. Frontend Application State

### State Shape

```typescript
{
  questions: object[];          // Fetched Question[] from EValue
  currentQuestion: number;      // 1-based index (starts at 1)
  answers: object[];            // Array of { questionId: number, responseId: number }
  riskRating?: number;          // Integer 1-5
  riskRatingDescription?: string;
  pdfUrl: string;               // Pre-signed S3 URL
  steps: number;                // Hardcoded 4 (unused)
  currentStep: number;          // Hardcoded 1 (unused)
}
```

### Reducer Actions

| Action | Payload | Behaviour |
| --- | --- | --- |
| `SET_QUESTIONS` | `{ questions }` | Sets `state.questions` (guard: no-ops if `!state.questions`) |
| `SET_CURRENT_QUESTION` | `{ currentQuestion }` | Sets active question index |
| `UPDATE_ANSWERS` | `{ answer: {questionId, responseId} }` | Appends answer to `state.answers[]` |
| `SET_RISK_RATING` | `{ riskRating }` | Sets integer rating |
| `SET_RISK_RATING_DESCRIPTION` | `{ description }` | Sets description text |
| `RESET_FORM` | — | Resets `currentQuestion=1`, `answers=[]`, `riskRating=undefined` (keeps questions) |
| `CREATE_PDF` | `{ url }` | Sets `state.pdfUrl` |
| `RESET_CREATE_PDF` | — | Sets `pdfUrl=''` |

## 6. Frontend User Flow & Rendering

### Route: `/` — QuestionnaireStart

Renders:

- H2: "Check your attitude to risk"
- Explanatory copy about the EV risk profiler
- Interactive risk level selector (RadioGroup, levels 1-5) showing label + description
- Disclaimer: questionnaire doesn't consider age, goals, or capacity for loss
- H2: "Take the questionnaire" — 13 multiple choice questions, less than 5 minutes
- Alert: "We don't store your data"
- CTA button: "I'm ready to start"

On button click:

1. Dispatches `RESET_FORM`
2. Navigates to `/questionnaire`

### Route: `/questionnaire` — Questionnaire + QuestionForm

On mount: Calls `graphQLQuery('getQuestions')` -> dispatches `SET_QUESTIONS` (fetch policy: no-cache)

Renders:

- H2: "Your attitude to risk"
- ProgressBar: segmented bar with `totalSteps` segments — green (past), blue (current), grey (future). Label: "Question N of M". Full ARIA attributes (`role="progressbar"`, `aria-valuemin={1}`, `aria-valuemax={totalSteps}`, `aria-valuenow={currentStep}`).
- QuestionForm: `<fieldset>` with `<legend>` (question text), radio buttons for each answer, submit button

Question navigation (forward-only, no back button):

1. User selects a radio answer and clicks "Next" (or "Submit" on last question)
2. react-hook-form validates (answer required)
3. Dispatches `UPDATE_ANSWERS` with `{ questionId: currentQuestion, responseId: selectedAnswerId }` — both parsed as integers
4. Dispatches `SET_CURRENT_QUESTION` with `Math.min(currentQuestion + 1, questions.length)`
5. Form resets (clears radio selection for next question)
6. When `answers.length === questions.length` -> navigates to `/results`

### Route: `/results` — Results

Guard: If `questions.length === 0` (e.g., direct page load), redirects to `/`

On mount (once, when answers complete):

1. Calls `graphQLMutation('calculateRisk', { responses: state.answers })` -> gets `{ rating }`
2. Dispatches `SET_RISK_RATING` with integer
3. Looks up description from riskRatings map, dispatches `SET_RISK_RATING_DESCRIPTION`

Risk Rating Map:

| Rating | Label | Description |
| --- | --- | --- |
| 1 | Lower | Conservative, short-term changes for modest/stable returns |
| 2 | Lower-Medium | Cautious, reasonable long-term returns, accept some risk |
| 3 | Medium | Balanced, accepts fluctuations for better long-term returns |
| 4 | Medium-Higher | Comfortable with risk for higher long-term returns |
| 5 | Higher | Very comfortable, aiming for high long-term returns |

Renders:

- Risk rating SVG image (`risk-rating-{1-5}.svg`)
- H2: "Your risk level is {label}"
- Description paragraph
- "Retake the test" button -> dispatches `RESET_FORM` + `RESET_CREATE_PDF`, navigates to `/questionnaire`
- H2: "Next Steps"
- Card: "Download the results and email to your adviser"
  - "Download PDF" button (shows "Downloading PDF…" while loading)

### Route: `/error` — Error

- Message: "Apologies we're experiencing some technical issues…"
- "Back" button -> dispatches `RESET_FORM` + `SET_QUESTIONS([])`, navigates to `/`

## 7. PDF Generation

### 7.1 Trigger (Frontend)

On "Download PDF" click:

```typescript
graphQLMutation('generateRiskResultPDF', {
  input: {
    RiskRating: `${state.riskRating}`,   // e.g. "4"
    RiskAnswers: state.answers            // [{ questionId: 1, responseId: 2 }, ...]
  }
})
```

Returns `{ url }` — a pre-signed S3 URL (expires in 120 seconds).

Frontend then:

1. `axios.get(url, { responseType: 'blob' })` to fetch the PDF binary
2. `saveAs(blob, 'risk-results.pdf')` via file-saver to trigger browser download

### 7.2 Lambda: generateRiskResultPDFUKAdviserCustHandover

Infrastructure (CDK):

- S3 Bucket: `SLALRiskUKAdvCustPDFStore-{env}` (versioned, SSL-enforced, 180-day object expiry, all public access blocked)
- Lambda Layer: Puppeteer-core + @sparticuz/chromium + lodash.template + pdf-merger-js
- Lambda: 2048MB memory, 300s timeout, Node.js 22.x

Handler logic:

1. Generate UUID for the document filename
2. Extract `RiskRating` (string) and `RiskAnswers` (array) from `event.arguments.input`
3. Serialize the hardcoded `RiskQuestions` array (13 questions with all answer options) and `RiskAnswers` to JSON strings
4. HTML entity encoding (`replaceHTMLEntities`): replace `'` -> `&#39;` and `"` -> `\\"` in JSON strings
5. Get current date as dd/mm/yyyy (en-GB locale)
6. Compile the HTML template using `lodash.template` with params: `{ RiskRating, RiskQuestionsString, RiskAnswersString, date }`
7. Store compiled HTML as `{uuid}_debug.html` in S3 (debugging artifact)
8. Render HTML to PDF using headless Chromium:
   - Format: A4
   - Margins: 1 inch on all sides
   - `printBackground: true`
9. Store PDF as `{uuid}` in S3 (ContentType: application/pdf)
10. Generate pre-signed GET URL (expires in 120 seconds)
11. Return `{ url }`

### 7.3 S3 Service Layer

- S3 client with 3-second connection timeout
- `storeTemplate(bucket, filename, body, metadata)` — PutObject with ContentDisposition: 'inline'
- `storeDocument(bucket, filename, body, metadata)` — PutObject with ContentType: 'application/pdf', ContentDisposition: 'inline'
- `getDocumentUrl(bucket, filename)` — pre-signed GET URL, expires in 120 seconds
- `getDocument(bucket, key)` — plain GetObject (available but unused in current flow)

### 7.4 PDF Template Structure (3-page A4 document)

Font: Public Sans (Google Fonts), weights 300/400/700

CSS Variables:

```css
--16px: 2.71mm;  --18px: 3.05mm;  --20px: 3.39mm;
--24px: 4.07mm;  --32px: 5.42mm;  --48px: 8.14mm;
--64px: 10.84mm; --96px: 16.27mm;
--black: #000000;    --darkGreen: #005e63;
--green: #009aa8;    --grey: #E6E6E8;
--darkGrey: #53565A;
```

**Page 1 — Results Summary:**

- Green border line (top)
- H1: "Risk Profile Results" (colour #3C4253)
- Grey box (#E6E6E8 background):
  - Left: risk rating image
  - Right: "Your attitude to risk is {label}" + description
- Info box: "Please email this document to your Financial Adviser"
- Green border line (bottom)

**Page 2 — Questions & Answers (Q1-Q7):**

- Header: "Risk Profiler Report"
- H3: "Your questions and answers:"
- H5: "Risk Questionnaire:"
- Ordered list of questions 1-7, each showing all answer options as radio buttons with the user's selection pre-checked

**Page 3 — Questions & Answers (Q8-Q13):**

- Header: "Risk Profiler Report"
- H3: "Your questions and answers (continued)"
- H5: "Risk Questionnaire:"
- Ordered list starting at 8, same format

Template JavaScript (runs in headless Chromium at render time):

- Parses the injected `RiskQuestions` and `RiskAnswers` JSON strings
- Sorts answers by `questionId` ascending
- For each question, builds HTML with radio buttons showing all answers, pre-checked for the user's response
- Uses a `getRiskObject(rating)` switch to map the rating number to label + description text
- Updates DOM elements: `.risk-rating-value`, `.risk-rating-description`, `.risk-rating-image`, `.first-section` (Q1-7), `.second-section` (Q8-13)

### 7.5 Hardcoded Questions in PDF Lambda

The PDF Lambda contains a hardcoded copy of all 13 questions with their answer options in `services/data.ts`. These must stay in sync with what EValue returns from the 5risk questionnaire. The questions are embedded so the PDF can render all answer options (not just the selected ones) as radio-button-style lists.

Full question list:

1. "I would enjoy exploring investment opportunities for my money." (Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree)
2. "I would go for the best possible return even if there were risk involved." (Always / Usually / Sometimes / Rarely / Never)
3. "How would you describe your typical attitude when making important financial decisions?" (Very adventurous / Fairly adventurous / Average / Fairly cautious / Very cautious)
4. "What amount of risk do you feel you have taken with your past financial decisions?" (Very Large / Large / Medium / Small / Very small)
5. "To reach my financial goal I prefer an investment which is safe and grows slowly but steadily, even if it means lower growth overall." (Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree)
6. "I am looking for high investment growth. I am willing to accept the possibility of greater losses to achieve this." (Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree)
7. "If you had money to invest, how much would you be willing to place in an investment with possible high returns but a similar chance of losing some of your money?" (All of it / More than half / Half / Less than half / Very little, if any)
8. "How do you think that a friend who knows you well would describe your attitude to taking financial risks?" (Daring / Sometimes daring / A thoughtful risk taker / Careful / Very cautious and risk averse)
9. "If you had picked an investment with potential for large gains but also the risk of large losses how would you feel:" (Panicked and very uncomfortable / Quite uneasy / A little concerned / Accepting of the possible highs and lows / Excited by the potential for gain)
10. "Imagine that you have some money to invest and a choice of two investment products, which option would you choose?" (Low return, almost no risk / Higher return, some risk / A mixture of the two)
11. "I would prefer small certain gains to large uncertain ones." (Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree)
12. "When considering a major financial decision, which statement BEST describes the way you think about the possible losses or the possible gains?" (Excited about gains / Optimistic about gains / Think about both / Conscious of losses / Worry about losses)
13. "I want my investment money to be safe even if it means lower returns." (Strongly agree / Tend to agree / In between / Tend to disagree / Strongly disagree)

## 8. Iframe Integration

The app runs inside an iframe on the Standard Life parent site. `App.tsx` uses a `useIframeHeight` hook that runs a `setInterval` (200ms) posting `['setHeight', documentHeight]` to `window.parent` via `postMessage('*')`, allowing the parent page to dynamically resize the iframe.

## 9. Analytics (GTM)

Event structure:

```json
{
  "event": "handoffRiskProfilerTool",
  "eventCategory": "Attitude to risk questionnaire - Hand off",
  "eventAction": "<action>",
  "eventLabel": "<label>"
}
```

Only fires when analytics cookies are accepted (category 2 in `sl#cookiepreferences` cookie). GTM key comes from `REACT_APP_GTM_API_KEY` env var.

Cookie consent:

- `sl#cookiepreferences` cookie: JSON with `cookiecategoryids` (pipe-separated: 1 = necessary, 2 = analytics, 3 = marketing)
- `SLG_COOKIE_POLICY` cookie: `isOptIn=true&reprompt=false`
- Cookie domain: last 3 parts of `window.location.host` (e.g. `standardlife.co.uk`)
- Cookie expiry: 180 days
- "Decline All" sets category 1 only; "Accept All" sets 1|2|3

All analytics events:

| Action | Label |
| --- | --- |
| Risk Analyser Questionnaire page | Display |
| Take the questionnaire | I'm ready to start button |
| What are the risk ratings? | What are the risk ratings? > [Level] |
| Question N | Display |
| Question N | Next question button |
| Question N (last) | Submit button |
| Results page | Display |
| Results page | Attitude to risk - [rating number] |
| Results page | Re-take the test button |
| Results page | Download PDF button |

## 10. Key Behaviours & Edge Cases

1. **Token per request:** No OAuth token caching — every GraphQL operation triggers a fresh `client_credentials` exchange
2. **Forward-only questionnaire:** No back button; users must retake from the start
3. **Ephemeral state:** Browser refresh on `/results` with empty state redirects to `/`
4. **PDF URL expiry:** The pre-signed S3 URL expires in 120 seconds — the frontend fetches it immediately as a blob
5. **PDF objects expire:** S3 lifecycle deletes PDFs after 180 days
6. **Risk clamping:** EValue may return a decimal `riskProfile`; the Lambda clamps to [1, 5] and truncates via `parseInt()`
7. **Hardcoded term:** `term: 15` is always sent to EValue's calculateRisk endpoint
8. **Dual question source:** Questions are fetched live from EValue for the frontend, but the PDF Lambda uses a hardcoded copy — these must stay synchronised
9. **No ESG flow in current routing:** ESG Lambda functions exist but are not wired into the current app routes or GraphQL schema
10. **Debug HTML stored:** Every PDF generation stores a `{uuid}_debug.html` file in S3 alongside the PDF
11. **GTM init commented out:** `TagManager.initialize(...)` in `index.tsx` is commented out; events still dispatch via `TagManager.dataLayer()` but only fire if `REACT_APP_GTM_API_KEY` is set
12. **SET_QUESTIONS guard:** The reducer guards with `if (!state.questions) return state` — checks current state is truthy before allowing update
