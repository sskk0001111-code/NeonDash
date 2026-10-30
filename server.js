const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

app.get('/', (req, res) => {
  res.send('Krishi Hisab API Live');
});

app.post('/api/log', async (req, res) => {
  try {
    const { crop_type, land_area } = req.body;
    
    if (!crop_type || land_area === undefined) {
      return res.status(400).json({ error: 'crop_type and land_area are required' });
    }

    const { data, error } = await supabase
      .from('tool_logs')
      .insert([{ crop_type, land_area: parseFloat(land_area) }]);

    if (error) throw error;

    return res.json({ success: true, message: 'Data logged successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
