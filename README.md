# AuditCopilot

An Express API that drafts an IT control's risk, audit test procedure, and expected evidence using Magica chat completions. Treat its output as planning assistance, not audit evidence or a conclusion about control effectiveness.

## Requirements

- Node.js 22 or newer
- A Magica API key

## Setup (Windows PowerShell)

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace `YOUR_API_KEY` with your key from Magica Settings > API Keys. The example selects the live catalog alias `~google/gemini-flash-latest`; override `MAGICA_LLM_MODEL` with another supported language-model ID if needed. Then install dependencies and start the server:

```powershell
npm install
npm start
```

The server listens on `http://localhost:3000` by default. Set `PORT` in `.env` to use another port. Run `npm run check` to verify `server.js` syntax.

Open `http://localhost:3000` for the AuditCopilot web interface. Enter a control description and select **Generate workpaper draft** to receive the risk, test procedure, and expected evidence.

## Endpoints

### `GET /health`

Returns `{ "status": "ok" }` when the server is running. This checks the local service, not Magica API connectivity.

### `POST /audit-assistant`

Request JSON:

```json
{
  "control": "User access reviews are performed quarterly by management."
}
```

Example PowerShell request:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/audit-assistant -ContentType 'application/json' -Body '{"control":"User access reviews are performed quarterly by management."}'
```

The server calls `https://inference.magica.com/v1/chat/completions` and returns the model's response under `result`, along with the selected model ID and token usage when available. The response asks for these sections: Risk, Audit Test Procedure, and Expected Evidence. Controls are limited to 12,000 characters.

Invalid JSON or a missing/empty control returns HTTP 400. Oversized controls return HTTP 413. Requests are limited to 10 per client IP per 15 minutes. An upstream timeout returns HTTP 504, and connection errors return HTTP 502. Other non-success responses include Magica's status and response body. The API key and control text are not logged.

## Reusable Magica service

`services/magicaService.js` exports `askMagica(prompt, options)`. It loads and validates `MAGICA_API_KEY`, sends a chat-completions request, and returns `{ text, model, usage }`. Options include `systemPrompt`, `model`, `maxTokens`, `temperature`, and `timeoutMs`. HTTP 429 responses include a `retryAfter` value when Magica provides one.

```js
const { askMagica } = require('./services/magicaService');

const result = await askMagica('Create an audit test procedure');
console.log(result.text, result.model, result.usage);
```

Starter functions are in `templates/`: `draftAuditWorkpaper`, `generateInterviewPrep`, `reviewResume`, and `writeSong`. They return the same `{ text, model, usage }` shape. Songwriting prompts request original lyrics rather than imitation of a specific artist.

Run `npm test` for mocked service tests and `npm run check` to syntax-check all project JavaScript files.

## Security

`.env` and `.env.local` are excluded by `.gitignore`. Never commit or share your real API key. The browser UI and API use the same origin; cross-origin access is not enabled.

## Deploy to Render

The included `render.yaml` defines a free Node web service and prompts for `MAGICA_API_KEY` as a secret during initial setup. Push the repository to GitHub, then in Render choose **New > Blueprint**, connect `georgejalloh214-source/AuditCopilot`, select the `main` branch, and provide the Magica key when prompted. Render builds with `npm ci`, starts with `npm start`, and checks `/health`. Free instances may spin down when idle.
