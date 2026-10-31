const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

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

    // Direct official endpoint call
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Gemini API Error Response:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "AI API call failed" });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Poramorsho toiri kora jayni.";
    res.json({ advice: aiText });

  } catch (err) {
    console.error("Server Catch Error:", err);
    res.status(500).json({ error: "AI Poramorsho load kora jayni." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
