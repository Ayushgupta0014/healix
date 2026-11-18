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
  const { user, items } = req.body;
  const domain = user.email.split('@')[1]; 
  const total = items.reduce((sum, i) => sum + i.price, 0);
  res.json({ message: `Order placed for ${domain}`, total });
});

// BUG 2: Unhandled JSON Parse / Discount Calculation Crash
app.post('/api/payments/discount', (req, res) => {
  const { rawCouponData, amount } = req.body;
  const parsed = JSON.parse(rawCouponData); // Crashes on invalid/missing JSON string
  const finalAmount = amount - (amount * parsed.discountPercent) / 100;
  res.json({ finalAmount });
});

// BUG 3: Async Unhandled Rejection on External Inventory Fetch
app.get('/api/inventory/:sku', async (req, res, next) => {
  try {
    const sku = req.params.sku;
    if (sku === 'CORRUPT_SKU') {
      throw new Error('Inventory Database Connection Pool Exhausted for SKU: ' + sku);
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
