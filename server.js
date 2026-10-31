const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
  res.send('Krishi Hisab Backend is Running!');
});

async function callGemini(promptText) {
  // Prathomic bhabe gemini-3.8-flash ebong fallback hishebe gemini-2.5-flash try korbe
  const models = ['gemini-3.8-flash', 'gemini-2.5-flash'];
  
  for (const model of models) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      console.warn(`Model ${model} issue:`, data.error?.message || response.statusText);
    } catch (err) {
      console.warn(`Fetch failed for model ${model}:`, err.message);
    }
    // 503 ba rate limit thekate 1 second delay
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

app.post('/api/ai-advisor', async (req, res) => {
  try {
    const { crop_type, land_area, calculations } = req.body;

    if (!crop_type || !land_area) {
      return res.status(400).json({ error: 'Missing crop_type or land_area' });
    }

    const promptText = `
Tumi ekjon Krishi Bigyani (Agricultural Scientist) West Bengal chashider jonno.
Foshol: ${crop_type}
Jomir poriman: ${land_area} bigha/katha
Hisab krito upadan: ${JSON.stringify(calculations)}

Chashike shudhu 3-te bullet point-e direct ebong actionable poramorsho dao Bangla te:
1. Sar proyog-er shothik somoy (Kokhono eksathe sob sar dite baron koro, koy bar bhenge debe bolo).
2. Sech ba jol babosthapona.
3. Prothom 20-30 dine rog ba poka thekanor shotorkota.
Kono unnecessary gyaan, bhumika ba English chara shudhu 3-te point bullet hisebe likho.
`;

    const advice = await callGemini(promptText);

    if (advice) {
      return res.json({ advice });
    } else {
      return res.status(503).json({ error: 'AI server ekhon busy, kichukkhon por abar chesta korun.' });
    }

  } catch (err) {
    console.error("Server Catch Error:", err);
    res.status(500).json({ error: "AI Poramorsho load kora jayni." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
