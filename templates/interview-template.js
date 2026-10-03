const { askMagica } = require('../services/magicaService');

async function generateInterviewPrep(role = 'IT Auditor') {
  return askMagica(
    `Generate interview preparation for the role: ${role}. Include likely technical and behavioral questions, concise answer frameworks, and topics to review.`,
    {
      systemPrompt: 'You are an interview coach specializing in IT audit, internal audit, SOX, risk, and compliance roles.',
      maxTokens: 1200
    }
  );
}

module.exports = { generateInterviewPrep };
