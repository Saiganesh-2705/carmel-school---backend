// Works out which Groq models this API key can use. Groq retires and renames models from time to time, so the server asks
// Groq for the list instead of trusting one fixed name. The answer is remembered for an hour.
const PREFERRED = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b', 'gemma2-9b-it'];
const NOT_CHAT = /whisper|tts|guard|playai|orpheus|embed|prompt-guard|safeguard|transcri/i;
let cache = null;

async function listModels(key) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` }, signal: ctrl.signal });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.data || []).map((m) => m.id).filter((id) => id && !NOT_CHAT.test(id));
  } catch { return null; } finally { clearTimeout(t); }
}

// Returns model names to try, best first (your GROQ_MODEL, then known good ones that exist for your key, then anything else).
exports.candidateModels = async (key) => {
  if (cache && cache.key === key && Date.now() - cache.at < 3600000) return cache.list;
  const available = await listModels(key);
  const wanted = [process.env.GROQ_MODEL, ...PREFERRED].filter(Boolean);
  let list;
  if (available && available.length) list = [...new Set([...wanted.filter((m) => available.includes(m)), ...available])];
  else list = [...new Set(wanted)];
  list = list.slice(0, 4);
  if (available && available.length) cache = { key, at: Date.now(), list };
  return list;
};
exports.listModels = listModels;
