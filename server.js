const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const groqApiKey = process.env.GROQ_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

// 1 Hour In-memory Cache
const cache = new Map();

app.get('/', (req, res) => {
  res.send('Krishi Hisab Backend is Running!');
});

// Provider 1: Groq API Call
async function callGroq(promptText) {
  if (!groqApiKey) return null;
  
  // Groq console list-e thaka active models
  const models = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
  
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
              content: 'Do NOT think or reason. Answer directly in Bengali bullet points immediately.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.3,
          max_tokens: 1000 // Token limit bariye dewa holo jate reasoning choke na hoy
        })
      });

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      
      // Content thakle content nebe, reasoning thakle sekhan thekeo parse korbe
      const outputText = message?.content?.trim() || "";
      
      if (response.ok && outputText.length > 0) {
        console.log(`Success with Groq model: ${model}`);
        return outputText;
      }
      
      console.warn(`Groq ${model} rejected or empty:`, data.error?.message || `finish_reason: ${data.choices?.[0]?.finish_reason}`);
    } catch (err) {
      console.warn(`Groq network error for ${model}:`, err.message);
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
      console.warn(`Gemini ${model} rejected:`, data.error?.message || response.statusText);
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
* Chun proyog o tar koto din por sar/khol dite hobe.
* Joler rong o plankton toirir babosthapona.
* Macher pona chharar aage shotorkota.
Kono bhomika chara shudhu 3-te point likho.
`;
    } else {
      promptText = `
Tumi ekjon Krishi Bigyani West Bengal chashider jonno.
Foshol: ${crop_type}
Jomir poriman: ${land_area} bigha
Hisab: ${JSON.stringify(calculations)}

Chashike shudhu 3-te bullet point-e Bangla te poramorsho dao:
* Sar proyog-er shothik somoy.
* Sech babosthapona.
* Prothom 20-30 dine poka ba rog thekanor shotorkota.
Kono bhomika chara shudhu 3-te point likho.
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
