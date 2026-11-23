const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { systemPrompt } = require('../config/schoolKnowledge');
const { candidateModels } = require('../services/groq');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Trimmed, and surrounding quotes removed, so a pasted key with a stray space or quotes still works.
const apiKey = () => String(process.env.GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const enabled = () => !!apiKey();
exports.apiKey = apiKey;
exports.enabled = enabled;

// Keeps only the last few plain user/assistant messages, trimmed. Anything else (such as a fake "system" message) is dropped.
function clean(list) {
  if (!Array.isArray(list)) return [];
  const out = list
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 1000) }));
  return out.slice(-12);
}

exports.chat = asyncHandler(async (req, res) => {
  if (!enabled()) throw new ApiError(503, 'The assistant is not switched on yet. Please send us a message on the Contact page.');
  const messages = clean(req.body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw new ApiError(422, 'Please type a question');

  // Tries the chosen model first, then a smaller one, in case Groq has retired or limited the first.
  const models = await candidateModels(apiKey());
  let r; let reason = '';
  for (const model of models) {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      r = await fetch(GROQ_URL, {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages], temperature: 0.3, max_tokens: 450 }),
      });
    } catch (e) {
      throw new ApiError(504, 'The assistant took too long to answer. Please try again.');
    } finally { clearTimeout(timer); }
    if (r.ok) break;
    const detail = await r.text().catch(() => '');
    try { reason = JSON.parse(detail).error.message; } catch { reason = detail.slice(0, 200); }
    console.error(`Groq error ${r.status} (model ${model}): ${detail.slice(0, 300)}`);
    if (!(r.status === 400 || r.status === 404 || r.status === 403) || models.indexOf(model) === models.length - 1) break;
  }

  if (!r.ok) {
    if (r.status === 429) throw new ApiError(429, 'The assistant is busy right now. Please try again in a minute.');
    if (r.status === 401) throw new ApiError(503, 'The assistant is not set up correctly yet. Please use the Contact page.');
    // While developing, say what Groq answered so the problem is easy to fix.
    throw new ApiError(502, `The assistant could not answer just now. Please try again.${process.env.NODE_ENV === 'production' ? '' : ` (Groq said ${r.status}: ${reason || 'no details'})`}`);
  }
  const data = await r.json().catch(() => null);
  // Some models print their thinking inside <think> tags: keep only the answer.
  const reply = data?.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!reply) throw new ApiError(502, 'The assistant could not answer just now. Please try again.');
  res.json({ success: true, reply });
});
