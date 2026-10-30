const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// SESHE SLASH THAKLE REMOVE KORAR SAFEGUARD:
const rawUrl = process.env.SUPABASE_URL || '';
const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(cleanUrl, SUPABASE_SERVICE_KEY);

app.get('/', (req, res) => {
  res.send('Krishi Hisab API Live');
});

app.post('/api/log', async (req, res) => {
  try {
    const { crop_type, land_area } = req.body;
    
    if (!crop_type || land_area === undefined) {
      return res.status(400).json({ error: 'Data missing' });
    }

    const { data, error } = await supabase
      .from('tool_logs')
      .insert([{ crop_type: String(crop_type), land_area: Number(land_area) }]);

    if (error) {
      console.error('Supabase DB error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: 'Saved to Supabase!' });
  } catch (err) {
    console.error('Catch error:', err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
