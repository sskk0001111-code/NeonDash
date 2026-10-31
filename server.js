const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const groqApiKey = process.env.GROQ_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
  res.send('Krishi Hisab Backend is Running!');
});

// Provider 1: Groq API Call
async function callGroq(promptText) {
  if (!groqApiKey) return null;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: 'Tumi ekjon Krishi Bigyani. Shudhu Bangla te 3-te actionable bullet points likhbe.'
          },
          {
            role: 'user',
            content: promptText
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      })
    });

    const data = await response.json();
    if (response.ok && data.choices?.[0]?.message?.content) {
      console.log("Success with Groq API");
      return data.choices[0].message.content;
    }
    console.warn("Groq failed, falling back to Gemini:", data.error?.message || response.statusText);
  } catch (err) {
    console.warn("Groq network error, falling back to Gemini:", err.message);
  }
  return null;
}

// Provider 2: Google Gemini Fallback Call
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
      console.warn(`Gemini ${model} failed:`, data.error?.message || response.statusText);
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

    const promptText = `
Tumi ekjon pro-active Krishi Bigyani (Agricultural Scientist) West Bengal chashider jonno.
Foshol / Prokolpo: ${crop_type}
Jomir poriman: ${land_area} bigha/katha
Hisab krito sar/upadan: ${JSON.stringify(calculations)}

Chashike shudhu 3-te short bullet point-e exact ebong actionable poramorsho dao Bangla te:
1. Sar proyog-er shothik somoy (Kokhono eksathe sob sar dite baron koro, koto bar bhenge debe bolo).
2. Sech ba jol babosthapona.
3. Ei foshle prothom 20-30 dine poka ba rog thekanor prothom shotorkota.
Kono unnecessary gyaan, bhumika ba English chara shudhu 3-te bullet point likho.
`;

    // Step 1: Groq try korbe
    let advice = await callGroq(promptText);

    // Step 2: Groq fail korle Gemini try korbe
    if (!advice) {
      advice = await callGemini(promptText);
    }

    // Step 3: Jodi duto provider-i down thake tokhon ekta standard static advisor return korbe (zero downtime)
    if (!advice) {
      advice = `* সারের প্রথম কিস্তি জমি তৈরির শেষ চাষে এবং বাকি অংশ ফসলের বৃদ্ধির সময় ২-৩ বারে ভাগ করে প্রয়োগ করুন।\n* জমিতে অতিরিক্ত জল জমতে দেবেন না; পরিমিত সেচ ও নিষ্কাশনের সুব্যবস্থা রাখুন।\n* চারা রোপণের ১৫-২০ দিন পর নিয়মিত জমি পরিদর্শন করুন এবং পোকা বা ছত্রাকের লক্ষণ দেখলে নিকটস্থ কিসান মান্ডির পরামর্শ নিন।`;
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
