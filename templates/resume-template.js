const { askMagica } = require('../services/magicaService');

async function reviewResume(resumeText, targetRole = 'IT Auditor') {
  return askMagica(
    `Review this resume for the target role ${targetRole}. Provide an ATS-readiness assessment, role-relevant gaps, prioritized improvements, and likely interview questions. Be specific and do not invent experience.\n\nResume:\n${resumeText}`,
    {
      systemPrompt: 'You are a resume reviewer for IT audit, internal audit, SOX, risk, and compliance careers. Clearly distinguish evidence in the resume from recommendations.',
      maxTokens: 1400
    }
  );
}

module.exports = { reviewResume };
