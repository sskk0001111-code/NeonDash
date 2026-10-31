const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const groqApiKey = process.env.GROQ_API_KEY;

app.get('/', (req, res) => {
  res.send('Krishi Hisab Backend is Running!');
});

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

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: 'Tumi ekjon Krishi Bigyani. Shudhu Bangla te direct bullet points likhbe.'
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

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API Error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "Groq API call failed" });
    }

    const aiText = data.choices?.[0]?.message?.content || "Poramorsho toiri kora jayni.";
    res.json({ advice: aiText });

  } catch (err) {
    console.error("Server Catch Error:", err);
    res.status(500).json({ error: "AI Poramorsho load kora jayni." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
