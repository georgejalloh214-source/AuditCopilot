const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { askMagica, MagicaApiError } = require('../services/magicaService');

const originalApiKey = process.env.MAGICA_API_KEY;
const originalFetch = globalThis.fetch;

function useTestApiKey() {
  process.env.MAGICA_API_KEY = 'gx_test_key';
}

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.MAGICA_API_KEY;
  } else {
    process.env.MAGICA_API_KEY = originalApiKey;
  }
  globalThis.fetch = originalFetch;
});

test('validates the API key before making a request', async () => {
  process.env.MAGICA_API_KEY = 'YOUR_API_KEY';
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not run');
  };

  await assert.rejects(askMagica('Draft an audit test'), (error) => {
    assert.ok(error instanceof MagicaApiError);
    assert.equal(error.code, 'MAGICA_API_KEY_INVALID');
    return true;
  });
  assert.equal(fetchCalled, false);
});

test('sends a chat request and returns text, model, and token usage', async () => {
  useTestApiKey();
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return new Response(JSON.stringify({
      model: '~google/gemini-flash-latest',
      choices: [{ message: { content: 'Risk: access may remain active.' } }],
      usage: { total_tokens: 42 }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const result = await askMagica('Review quarterly access reviews', {
    systemPrompt: 'You are an auditor.'
  });

  assert.equal(requestUrl, 'https://inference.magica.com/v1/chat/completions');
  assert.equal(requestOptions.headers.Authorization, 'Bearer gx_test_key');
  assert.equal(JSON.parse(requestOptions.body).model, '~google/gemini-flash-latest');
  assert.deepEqual(result, {
    text: 'Risk: access may remain active.',
    model: '~google/gemini-flash-latest',
    usage: { total_tokens: 42 }
  });
});

test('returns a retry delay for Magica rate limits', async () => {
  useTestApiKey();
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: 'Rate limit reached'
  }), {
    status: 429,
    headers: { 'content-type': 'application/json', 'retry-after': '25' }
  });

  await assert.rejects(askMagica('Draft an audit test'), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.code, 'MAGICA_RATE_LIMITED');
    assert.equal(error.retryAfter, 25);
    return true;
  });
});

test('maps request timeouts to a gateway timeout error', async () => {
  useTestApiKey();
  globalThis.fetch = async () => {
    const error = new Error('aborted');
    error.name = 'TimeoutError';
    throw error;
  };

  await assert.rejects(askMagica('Draft an audit test'), (error) => {
    assert.equal(error.status, 504);
    assert.equal(error.code, 'MAGICA_TIMEOUT');
    return true;
  });
});
