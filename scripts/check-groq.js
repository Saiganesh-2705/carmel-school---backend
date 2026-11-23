// Run:  npm run check:groq   (inside the server folder)
// Proves the key in server/.env works, lists the models your key can use, and sends one tiny question.
require('dotenv').config();
const chat = require('../controllers/chat.controller');
const { listModels, candidateModels } = require('../services/groq');

(async () => {
  const key = chat.apiKey();
  if (!key) { console.log('NOT set up. Add GROQ_API_KEY=your_key to server/.env, then run this again.'); process.exitCode = 1; return; }
  if (!key.startsWith('gsk_')) console.log('Warning: Groq keys normally start with "gsk_". Check you copied the whole key.');
  const all = await listModels(key);
  if (!all) { console.log('FAILED: Groq did not accept this key (or could not be reached). Create a new key at console.groq.com/keys.'); process.exitCode = 1; return; }
  console.log(`Your key can use ${all.length} chat models, for example: ${all.slice(0, 6).join(', ')}`);
  const models = await candidateModels(key);
  console.log('The chat will try, in order:', models.join(', '));
  for (const model of models) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say hello in five words.' }], max_tokens: 60 }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { console.log(`  ${model}: failed (${r.status}) ${(d.error && d.error.message) || ''}`); continue; }
      console.log(`OK: Groq works with ${model}. Reply:`, (d.choices[0].message.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim());
      return;
    } catch (e) { console.log(`  ${model}: could not reach Groq (${e.message})`); }
  }
  console.log('FAILED: none of the models worked. See the messages above.'); process.exitCode = 1;
})();
