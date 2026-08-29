// /api/chat.js — Vercel serverless function.
// Keeps GROQ_API_KEY server-side. Never call Groq directly from the browser.

const pricing = require('../data/products.json');

// NOTE: Groq's model catalog changes. This was set to the Llama models requested,
// but some recent Groq docs show llama-3.3-70b-versatile / llama-3.1-8b-instant as
// deprecated in favor of openai/gpt-oss-20b / openai/gpt-oss-120b. Check
// https://console.groq.com/docs/models before deploying — if Llama is retired,
// change this one line.
// Groq retired llama-3.3-70b-versatile and llama-3.1-8b-instant on August 16, 2026.
// openai/gpt-oss-120b is their recommended replacement for the 70B-class model.
// Check https://console.groq.com/docs/models if this ever needs to change again.
const MODEL = 'openai/gpt-oss-120b';

// Builds the pricing section of the prompt fresh from data/products.json on every
// request — edit that file when prices change, nothing here needs to change too.
function buildPricingBlock() {
  const lines = Object.values(pricing.products).map((p) => {
    let line = `- ${p.name}${p.isLimitedEdition ? ' (Limited Edition — small batch)' : ''}: Console Only Rs. ${p.consoleOnly.toLocaleString('en-PK')} · Console + Controller Rs. ${p.consoleAndController.toLocaleString('en-PK')}`;
    if (p.headset) line += ` · matching headset also available for Rs. ${p.headset.toLocaleString('en-PK')}`;
    return line;
  });
  lines.push(`- Controller skin bought separately (add-on): Rs. ${pricing.controllerAddOnPrice.toLocaleString('en-PK')} (same total as choosing "Console + Controller" on that product)`);
  return lines.join('\n');
}

function buildSystemPrompt() {
  return `Tum OwnIt ke AI shopping assistant ho — ek Pakistani custom PS5 skins store ka helper. Hamesha Roman Urdu/Hinglish mein baat karo (jaise dost se baat karte hain, casual tone) — kabhi bhi Urdu script (اردو) mein mat likhna, sirf Roman/Latin letters use karna.

STORE INFO (yehi facts use karna, kuch bhi mat banana):
- Products: Ragnarok (weathered warrior/rune design), Weapon X (claw-slash/wire-mesh design, controller aur headset bhi available), Hokage (ninja ink-sketch design), Webslinger (spider emblem design), Sticker Bomb (colorful graffiti collage design), Ajrak (Sindhi block-print heritage design), Scuderia (Limited Edition — brushed titanium finish with engraved racetrack and racing badge, small-batch run, jab batch khatam ho jaye to dobara available nahi hota)

CURRENT PRICING (PKR — yeh hamesha up-to-date hai, exact numbers yehi use karna):
${buildPricingBlock()}

- Sab PS5 Disc, PS5 Digital aur PS5 Slim ke liye available hain — customer ko apna model batana hota hai order karte waqt
- Shipping: ${pricing.shipping.standard.toLowerCase()}, express Rs. ${pricing.shipping.express.toLocaleString('en-PK')}
- Returns: ${pricing.returnPolicy}
- Apna khud ka design bhi upload kar sakte hain "Create Your Own" page se
- Yeh site abhi ek portfolio/demo project hai — checkout se koi real payment process nahi hota

RULES:
- Replies short rakho — 2 se 4 lines, mobile pe padhne layak
- Jab koi product recommend karo to naam aur price zaroor batao
- Agar kisi cheez ka pata na ho to honestly bol do, kabhi mat banao ya guess mat karo
- Kabhi fake discount, fake stock-urgency, ya jhooti guarantee mat do
- Jahan relevant ho wahan customer ko batao kaunsa button/page dekhna hai (jaise "Collection mein dekho" ya "Create Your Own try karo")
- Agar koi unrelated / harmful sawal poochay to politely mana kardo aur topic ko PS5 skins pe wapas le aao`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Assistant is not configured yet.' });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  // Keep only the last few turns to control token usage / latency.
  const trimmed = messages.slice(-12).filter(
    (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...trimmed],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error', groqRes.status, errText);
      res.status(502).json({ error: 'Assistant is temporarily unavailable. Try again in a bit.' });
      return;
    }

    const data = await groqRes.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : 'Maaf kijiye, jawab generate nahi ho saka. Dobara try karein.';

    res.status(200).json({ reply });
  } catch (err) {
    console.error('Assistant handler error', err);
    res.status(500).json({ error: 'Something went wrong on our end.' });
  }
};
