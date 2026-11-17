const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// BUG 1: Null Pointer Dereference on nested payload
app.post('/api/orders/checkout', (req, res) => {
  const { user, items } = req.body || {};
  if (!user || typeof user.email !== 'string' || !user.email.includes('@')) {
    return res.status(400).json({ error: 'Valid user with email is required' });
  }
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be a valid array' });
  }
  const domain = user.email.split('@')[1];
  const total = items.reduce((sum, i) => sum + (Number(i?.price) || 0), 0);
  res.json({ message: `Order placed for ${domain}`, total });
});

// BUG 2: Unhandled JSON Parse / Discount Calculation Crash
app.post('/api/payments/discount', (req, res) => {
  const { rawCouponData, amount } = req.body || {};
  let parsed;
  try {
    parsed = typeof rawCouponData === 'string' ? JSON.parse(rawCouponData) : rawCouponData;
  } catch {
    return res.status(400).json({ error: 'Malformed JSON in rawCouponData' });
  }
  if (!parsed || typeof parsed.discountPercent !== 'number' || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Valid amount and discountPercent required' });
  }
  const finalAmount = amount - (amount * parsed.discountPercent) / 100;
  res.json({ finalAmount });
});

// BUG 3: Async Unhandled Rejection on External Inventory Fetch
app.get('/api/inventory/:sku', async (req, res, next) => {
  try {
    const sku = req.params.sku;
    if (!sku || sku === 'CORRUPT_SKU') {
      return res.status(503).json({ error: 'Invalid or quarantined SKU requested', fallbackCache: true });
    }
    res.json({ sku, inStock: true, count: 42 });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.TARGET_PORT || 4000;
app.listen(PORT, () => {
  console.log(`[TARGET-APP] Running on port ${PORT}`);
});
