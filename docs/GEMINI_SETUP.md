# Gemini integration: GALI 0.5.0

GALI integrates Gemini through Vertex AI using the server-side Google Gen AI SDK. The Data Assistant supports natural-language research and follow-up questions; the dashboard and Scenario Studio can generate balanced AI research briefs. The deterministic calculations remain the source of metric values.

## Configure your service account JSON

1. Keep your service account JSON outside the web public directory, for example `C:/Users/YourName/keys/gali-vertex-sa.json`. Do not put it in `packages/web/public`.
2. Copy `packages/web/.env.local.example` to `packages/web/.env.local`.
3. Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON's absolute path. On Windows use forward slashes and quotes when the path contains spaces:

   ```dotenv
   GOOGLE_APPLICATION_CREDENTIALS="C:/Users/Aril Indra Permana/keys/gali-vertex-sa.json"
   GOOGLE_CLOUD_LOCATION=global
   GALI_GEMINI_MODEL=gemini-3.8-flash
   ```

   GALI reads `project_id` from the JSON. Set `GOOGLE_CLOUD_PROJECT` only if requests should use a different authorized Google Cloud project.

4. In that Google Cloud project, enable billing and the Vertex AI API (`aiplatform.googleapis.com`). Grant the service account the Vertex AI User role (`roles/aiplatform.user`) on the project used for requests. Do not grant Owner just to enable Gemini.
5. From the extracted project root, run `npm run local`. Restart the app after changing credentials or environment variables. The launcher installs missing frontend and Gemini dependencies.
6. Open the Data Assistant, select **Gemini analysis**, and click **Test connection**. This makes one short billable model request. Then ask a question, or use **Generate AI brief** on the dashboard or Scenario Studio.

Next.js loads these settings from `packages/web/.env.local`, because the web app runs from that directory. The root `.env` is for the Python/data stack and does not configure the Next.js Gemini integration.

Gemini's Google Cloud credentials and billing are separate from the Sectors API token. The bundled local dataset can still be used when the Sectors token has expired; Gemini requires its own model access and an internet connection.

## Server and deployed environments

Configure server environment variables with a private file mounted at `GOOGLE_APPLICATION_CREDENTIALS`, or set `GALI_AI_SERVICE_ACCOUNT_JSON` to the full JSON through the hosting provider's secret settings. Use one credential source at a time. Neither is a `NEXT_PUBLIC_` setting. A JSON key never enters a prompt, an API response, a generated brief, or the browser bundle.

For an attached Google Cloud service account or an ADC environment, set `GALI_AI_USE_ADC=1` and `GOOGLE_CLOUD_PROJECT`, and leave both service account sources empty. The SDK handles access-token refresh. GALI validates local JSON keys before constructing the SDK and uses only the expected account fields.

The default model is `gemini-3.8-flash` at `global`, verified against Google's documentation on October 6, 2026. `GALI_GEMINI_MODEL` and `GOOGLE_CLOUD_LOCATION` remain configurable, so a model or location can be changed without editing code. A configured status confirms that local settings are readable; **Access verified** appears only after an actual successful provider response. A historic successful connection does not guarantee a later request will succeed.

## How answers are grounded

- The browser sends the question, a bounded conversation history, issuer tickers, and optional scenario parameters. Browser-supplied datasets, calculated numbers, system prompts, or credentials are rejected.
- The server reads the active issuer universe and issuer Evidence. It identifies the data publication and rejects mixed or changing publication runs.
- An active scenario is recalculated by GALI on the server. Dashboard briefs use the separate price, China demand, and license-expiry tests already used by the resilience matrix.
- Gemini receives a compact allowlist of facts, deterministic orderings, methodology, missing values, and model assumptions. No external browsing or company-document retrieval is enabled.
- Gemini returns structured JSON. Each claim must reference existing evidence IDs; numerical values use placeholders that GALI fills from its formatted server facts. Unknown references, raw numeric assertions, malformed or truncated output, and incomplete research-brief structure are rejected before display.
- Sources open the corresponding GALI issuer or methodology view. These references identify application data and model results; they do not imply that Gemini read or independently verified a company filing.
- AI briefs export the narrative, evidence, snapshot, source type, scope, and model. Synthetic input provenance is preserved. Citations and numeric checks do not prove that every qualitative interpretation is correct.

## Reliability and request limits

The Data Assistant retains an explicit **Data analysis** mode that works without Gemini. Gemini errors never produce a fabricated AI answer. A user can stop waiting for generation; closing the Assistant aborts its pending request. A model request already accepted by Google may still be billed after cancellation. Changing a selected issuer or scenario clears the old AI brief and cancels pending generation.

Provider requests use a timeout and no automatic retry. GALI bounds concurrency to two billable requests, ten requests per minute, and sixty per hour per server process. Connection tests count toward this allowance. Identical questions with unchanged evidence may reuse a successful answer for five minutes; GALI reloads the current evidence before looking up the cache. Error responses are not cached. Model output is capped at four thousand output tokens per analysis, with a smaller cap for connection tests.

POST requests enforce the app origin; questions, history, and request-body size are bounded. Credentials and raw provider errors are never logged. The included packaging command excludes private credential directories, environment files, keys, and service account JSON content.

The app is designed for the existing local workflow. The rate limits and answer cache are in memory and reset on restart. Before opening an anonymous public deployment, add application authentication and a shared request/spend limiter; per-process limits are not an account-wide cloud billing cap.

## Troubleshooting

| Message | Check |
| --- | --- |
| Setup required | `packages/web/.env.local`, credentials path, and app restart |
| JSON could not be read | The file exists on the machine running Next.js; quotes and Windows forward slashes are correct |
| Invalid private key | The file is a complete Google service account JSON, not an API key or OAuth client JSON |
| Access denied | Project billing, Vertex AI API activation, service account role, and selected project |
| Model unavailable | Model ID, project access, and supported location |
| Request limit | Cloud quota or GALI's process allowance; wait and retry |
| Answer could not be verified | Narrow the research question; the response contained an invalid source, unsupported number format, or incomplete structure |
| Data publication changed | Refresh the dataset and retry after publication completes |

## Validation and reference documentation

Run `npm run test:ai` for credential configuration, input validation, grounding, missing values, response guards, provider errors, cancellation, and cache/rate-limit checks. Run the browser suite for the Assistant, connection status, exports, active-scenario attachment, failures, and responsive behavior. See [GEMINI_VERIFICATION.md](GEMINI_VERIFICATION.md) for the release's exact results and live-test boundary.

Primary references checked for this implementation:

- [Google Gen AI SDK for JavaScript](https://googleapis.github.io/js-genai/release_docs/index.html)
- [Application Default Credentials](https://docs.cloud.google.com/docs/authentication/application-default-credentials)
- [Structured output](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output)
- [Vertex AI access control](https://cloud.google.com/vertex-ai/docs/general/access-control)
- [Model lifecycle](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)
- [Gemini Flash model](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash)
