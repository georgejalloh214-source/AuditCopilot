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
npm install express dotenv cors
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

Invalid JSON or a missing/empty control returns HTTP 400. Oversized controls return HTTP 413. An upstream timeout returns HTTP 504, and connection errors return HTTP 502. Other non-success responses include Magica's status and response body. The API key and control text are not logged.

## Security

`.env` is excluded by `.gitignore`. Never commit or share your real API key. CORS is enabled for all origins for local testing; restrict allowed origins before exposing this service publicly.
