const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Render Environment theke key load hobe
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Basic check route
app.get('/', (req, res) => {
  res.send('Krishi Hisab Backend is Running!');
});

// AI Advisor Route
app.post('/api/ai-advisor', async (req, res) => {
  try {
    const { crop_type, land_area, calculations } = req.body;

    if (!crop_type || !land_area) {
      return res.status(400).json({ error: 'Missing crop_type or land_area' });
    }

    const prompt = `
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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    res.json({ advice: aiText });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: "AI Poramorsho load kora jayni." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
