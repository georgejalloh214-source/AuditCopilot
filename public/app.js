const form = document.querySelector('#audit-form');
const controlInput = document.querySelector('#control');
const characterCount = document.querySelector('#character-count');
const sampleButton = document.querySelector('#sample-control');
const submitButton = document.querySelector('#submit-button');
const formError = document.querySelector('#form-error');
const resultsPanel = document.querySelector('.results-panel');
const resultsStatus = document.querySelector('#results-status');
const emptyState = document.querySelector('#empty-state');
const resultSections = document.querySelector('#result-sections');
const fullResponse = document.querySelector('#full-response');
const responseMeta = document.querySelector('#response-meta');

const sections = [
  { title: 'Risk', target: document.querySelector('#risk-result') },
  { title: 'Audit Test Procedure', target: document.querySelector('#test-result') },
  { title: 'Expected Evidence', target: document.querySelector('#evidence-result') }
];

function updateCharacterCount() {
  characterCount.textContent = `${controlInput.value.length.toLocaleString()} / 12,000`;
}

function parseSections(text) {
  const contentByTitle = new Map(sections.map(({ title }) => [title, []]));
  let activeTitle = null;

  for (const line of text.split(/\r?\n/)) {
    const headingText = line
      .trim()
      .replace(/^#{1,6}\s*/, '')
      .replace(/^\*\*(.*?)\*\*$/, '$1');
    const headingMatch = headingText.match(/^(?:\d+[.)]\s*)?(Risk|Audit Test Procedure|Expected Evidence)(?:\s*:\s*(.*))?$/i);

    if (headingMatch) {
      activeTitle = sections.find(({ title }) => title.toLowerCase() === headingMatch[1].toLowerCase()).title;
      if (headingMatch[2]) {
        contentByTitle.get(activeTitle).push(headingMatch[2]);
      }
      continue;
    }

    if (activeTitle) {
      contentByTitle.get(activeTitle).push(line);
    }
  }

  for (const { title, target } of sections) {
    const content = contentByTitle.get(title).join('\n').trim();
    target.textContent = content || 'This section was not returned. Review the full response below.';
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  controlInput.disabled = isLoading;
  sampleButton.disabled = isLoading;
  resultsPanel.setAttribute('aria-busy', String(isLoading));
  submitButton.querySelector('span').textContent = isLoading
    ? 'Generating draft…'
    : 'Generate workpaper draft';
  if (isLoading) {
    resultsStatus.textContent = 'Reviewing the control with Magica…';
  }
}

controlInput.addEventListener('input', updateCharacterCount);

sampleButton.addEventListener('click', () => {
  controlInput.value = 'User access reviews are performed quarterly by management.';
  formError.hidden = true;
  updateCharacterCount();
  controlInput.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;

  const control = controlInput.value.trim();
  if (!control) {
    formError.textContent = 'Enter a control description to continue.';
    formError.hidden = false;
    controlInput.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/audit-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ control })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'The analysis request failed.');
    }

    if (typeof data.result !== 'string' || !data.result.trim()) {
      throw new Error('The model response did not contain analysis text.');
    }

    parseSections(data.result);
    fullResponse.textContent = data.result;
    const usage = data.usage?.total_tokens;
    responseMeta.textContent = usage
      ? `Model: ${data.model} · ${usage.toLocaleString()} tokens`
      : `Model: ${data.model}`;
    emptyState.hidden = true;
    resultSections.hidden = false;
    resultsStatus.textContent = 'Draft generated. Review and validate before use.';
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
    resultsStatus.textContent = 'Analysis could not be completed.';
  } finally {
    setLoading(false);
  }
});

updateCharacterCount();