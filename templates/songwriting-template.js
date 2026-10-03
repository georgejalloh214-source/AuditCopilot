const { askMagica } = require('../services/magicaService');

async function writeSong(topic) {
  return askMagica(
    `Write an original Afrobeats song about ${topic}. Do not imitate any specific artist or existing song.`,
    {
      systemPrompt: 'You are a songwriter creating original lyrics. Use a memorable chorus and clear verse structure.',
      maxTokens: 1400
    }
  );
}

module.exports = { writeSong };
