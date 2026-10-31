const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const groqApiKey = process.env.GROQ_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

// 1 Hour In-memory Cache to prevent Rate Limits
const cache = new Map();

app.get('/', (req, res) => {
  res.send('Krishi Hisab Backend is Running!');
});

// Provider 1: Groq API Call
async function callGroq(promptText) {
  if (!groqApiKey) return null;
  const models = ['gemma2-9b-it', 'openai/gpt-oss-20b'];
  
  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'Tumi ekjon Krishi o Matshyo Palon Expert. West Bengal-er jonno 3-ti bullet point-e short Bangla poramorsho dao.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.5,
          max_tokens: 350
        })
      });

      const data = await response.json();
      if (response.ok && data.choices?.[0]?.message?.content) {
        console.log(`Success with Groq model: ${model}`);
        return data.choices[0].message.content;
      }
      console.warn(`Groq ${model} rejected:`, data.error?.message || JSON.stringify(data));
    } catch (err) {
      console.warn(`Groq network error:`, err.message);
    }
  }
  return null;
}

// Provider 2: Gemini Fallback
async function callGemini(promptText) {
  if (!geminiApiKey) return null;
  const models = ['gemini-3.8-flash', 'gemini-2.5-flash'];
  for (const model of models) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`Success with Gemini model: ${model}`);
        return data.candidates[0].content.parts[0].text;
      }
      console.warn(`Gemini ${model} rejected:`, data.error?.message || JSON.stringify(data));
    } catch (err) {
      console.warn(`Gemini ${model} error:`, err.message);
    }
  }
  return null;
}

app.post('/api/ai-advisor', async (req, res) => {
  try {
    const { crop_type, land_area, calculations } = req.body;

    if (!crop_type || !land_area) {
      return res.status(400).json({ error: 'Missing crop_type or land_area' });
    }

    // Cache Key Check (jodi eki query ager 1 ghontay hoye thake, API call hobe na)
    const cacheKey = `${crop_type}_${land_area}`;
    if (cache.has(cacheKey)) {
      console.log(`Serving from Memory Cache: ${cacheKey}`);
      return res.json({ advice: cache.get(cacheKey) });
    }

    const isPond = crop_type.includes('পুকুর') || crop_type.toLowerCase().includes('pond');
    let promptText = '';

    if (isPond) {
      promptText = `
Tumi ekjon Matshyo Palon Expert West Bengal mach chasider jonno.
Prokolpo: ${crop_type}
Pukurer ayoton: ${land_area} katha
Upadaner hisab: ${JSON.stringify(calculations)}

Mach chasike shudhu 3-te bullet point-e Bangla te poramorsho dao:
1. Chun proyog o tar koto din por sar/khol dite hobe.
2. Joler rong o plankton toirir babosthapona.
3. Macher pona chharar aage shotorkota.
Kono unnecessary kotha chara shudhu 3-te point likho.
`;
    } else {
      promptText = `
Tumi ekjon Krishi Bigyani West Bengal chashider jonno.
Foshol: ${crop_type}
Jomir poriman: ${land_area} bigha
Hisab: ${JSON.stringify(calculations)}

Chashike shudhu 3-te bullet point-e Bangla te poramorsho dao:
1. Sar proyog-er shothik somoy.
2. Sech babosthapona.
3. Prothom 20-30 dine poka ba rog thekanor shotorkota.
Kono unnecessary kotha chara shudhu 3-te point likho.
`;
    }

    let advice = await callGroq(promptText);

    if (!advice) {
      advice = await callGemini(promptText);
    }

    if (!advice) {
      if (isPond) {
        advice = `* চুন প্রয়োগের অন্তত ৭-১০ দিন পর গোবর ও খোল ভেজানো জল পুকুরে সমানভাবে ছড়িয়ে দিন।\n* জল হালকা সবুজ রঙ ধারণ করলে বুঝবেন প্রাকৃতিক খাবার বা প্লাংকটন তৈরি হয়েছে।\n* পোনা ছাড়ার পূর্বে পাত্রটি পুকুরের জলে কিছুক্ষণ ভাসিয়ে রেখে তাপমাত্রা খাপ খাইয়ে নিন।`;
      } else {
        advice = `* সারের প্রথম কিস্তি জমি তৈরির শেষ চাষে এবং বাকি অংশ বৃদ্ধির সময় ২-৩ বারে ভাগ করে দিন।\n* জমিতে অতিরিক্ত জল জমতে দেবেন না; পরিমিত সেচ ও নিষ্কাশনের ব্যবস্থা রাখুন।\n* চারা রোপণের ১৫-২০ দিন পর জমি নিয়মিত পরিদর্শন করে আগাম পোকা দমন ব্যবস্থা নিন।`;
      }
    } else {
      // API call shofol hole 1 ghontar jonno cache-e rekhe dewa
      cache.set(cacheKey, advice);
      if (cache.size > 200) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
    }

    res.json({ advice });

  } catch (err) {
    console.error("Server Catch Error:", err);
    res.status(500).json({ error: "AI Poramorsho load kora jayni." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
