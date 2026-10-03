require('dotenv').config({ quiet: true });

const API_URL = 'https://inference.magica.com/v1/chat/completions';
const DEFAULT_MODEL = '~google/gemini-flash-latest';
const DEFAULT_TIMEOUT_MS = 60_000;

class MagicaApiError extends Error {
  constructor(message, { status = 502, code = 'MAGICA_API_ERROR', retryAfter, details } = {}) {
    super(message);
    this.name = 'MagicaApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

function getApiKey() {
  const apiKey = process.env.MAGICA_API_KEY?.trim();

  if (!apiKey || !apiKey.startsWith('gx_') || apiKey === 'gx_your_api_key_here') {
    throw new MagicaApiError('Set a valid MAGICA_API_KEY in .env.', {
      status: 500,
      code: 'MAGICA_API_KEY_INVALID'
    });
  }

  return apiKey;
}

function validateApiKey() {
  getApiKey();
}

function parseRetryAfter(value) {
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds));
  }

  const retryDate = Date.parse(value);
  return Number.isNaN(retryDate)
    ? undefined
    : Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
}

async function readResponse(response) {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText };
  }
}

async function askMagica(prompt, options = {}) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new TypeError('prompt must be a non-empty string.');
  }

  const model = options.model?.trim() || process.env.MAGICA_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const apiKey = getApiKey();

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('timeoutMs must be a positive integer.');
  }

  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt.trim() });

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 900,
        temperature: options.temperature ?? 0.2
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw new MagicaApiError(
      timedOut ? 'Magica request timed out.' : 'Could not connect to Magica.',
      {
        status: timedOut ? 504 : 502,
        code: timedOut ? 'MAGICA_TIMEOUT' : 'MAGICA_CONNECTION_FAILED'
      }
    );
  }

  const data = await readResponse(response);
  if (!response.ok) {
    if (response.status === 429) {
      throw new MagicaApiError('Magica rate limit reached. Retry after the indicated delay.', {
        status: 429,
        code: 'MAGICA_RATE_LIMITED',
        retryAfter: parseRetryAfter(response.headers.get('retry-after')),
        details: data
      });
    }

    throw new MagicaApiError('Magica chat request failed.', {
      status: response.status,
      code: data?.code || 'MAGICA_REQUEST_FAILED',
      details: data
    });
  }

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new MagicaApiError('Magica returned an unexpected chat response.', {
      status: 502,
      code: 'MAGICA_INVALID_RESPONSE'
    });
  }

  return {
    text,
    model: data.model || model,
    usage: data.usage ?? null
  };
}

module.exports = { askMagica, MagicaApiError, validateApiKey };
