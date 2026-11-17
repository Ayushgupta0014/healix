const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const Redis = require('ioredis');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Cloud-ready PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://healix_admin:healix_secret_password@127.0.0.1:5432/healix_db',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incident_logs (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        target_file TEXT,
        root_cause TEXT,
        fix_summary TEXT,
        old_code TEXT,
        new_code TEXT,
        mttr_ms INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT TRUE
      );
    `);
    console.log('[POSTGRES] Audit database connected & ready!');
  } catch (err) {
    console.error('[POSTGRES] DB Init Error:', err.message);
  }
}

// Cloud-ready Redis Connection
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisPub = new Redis(redisUrl);
const redisSub = new Redis(redisUrl);

let targetProcess = null;
let lastCrashTime = null;
const targetAppPath = path.join(__dirname, '..', 'target-app', 'server.js');

// Real-World Multi-Endpoint Vulnerable Service (3 Real Production Bugs)
const BUGGY_TEMPLATE = `const express = require('express');
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
  res.json({ message: \`Order placed for \${domain}\`, total });
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
  console.log(\`[TARGET-APP] Running on port \${PORT}\`);
});
`;

async function verifyPatchHealth() {
  await new Promise((r) => setTimeout(r, 1200));
  try {
    const healthRes = await fetch('http://localhost:4000/health');
    const checkoutRes = await fetch('http://localhost:4000/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return healthRes.status === 200 && checkoutRes.status !== 500;
  } catch {
    return false;
  }
}

function startTargetApp() {
  if (targetProcess) targetProcess.kill();

  io.emit('system_log', { type: 'INFO', message: 'Starting Target Microservice on port 4000...' });
  targetProcess = spawn('node', [targetAppPath]);

  targetProcess.stdout.on('data', (data) => {
    const log = data.toString().trim();
    console.log(`[TARGET]: ${log}`);
    io.emit('system_log', { type: 'STDOUT', message: log });
  });

  targetProcess.stderr.on('data', async (data) => {
    const errorTrace = data.toString();
    lastCrashTime = Date.now();
    console.error(`[CRASH DETECTED]:\n${errorTrace}`);
    io.emit('system_log', { type: 'CRASH', message: errorTrace });

    await redisPub.publish('healix_crashes', JSON.stringify({
      timestamp: new Date().toISOString(),
      file: targetAppPath,
      error: errorTrace
    }));
  });

  targetProcess.on('close', (code) => {
    io.emit('system_log', { type: 'WARN', message: `Target App stopped (Exit Code: ${code})` });
  });
}

redisSub.subscribe('healix_patched');

redisSub.on('message', async (channel, message) => {
  if (channel === 'healix_patched') {
    const patchInfo = JSON.parse(message);
    startTargetApp();

    io.emit('system_log', { type: 'INFO', message: 'Running automated post-patch verification suite...' });
    const passed = await verifyPatchHealth();

    if (!passed) {
      io.emit('system_log', { type: 'CRASH', message: 'Verification FAILED! Rolling back patch...' });
      fs.writeFileSync(targetAppPath, patchInfo.old_code, 'utf-8');
      startTargetApp();
      return;
    }

    const mttrMs = lastCrashTime ? Date.now() - lastCrashTime : 1600;
    io.emit('system_log', { type: 'STDOUT', message: `Verification PASSED | MTTR: ${mttrMs}ms` });

    // Real-World Git Audit Commit (if git repo exists)
    exec(`git add "${targetAppPath}" && git commit -m "fix(healix): ${patchInfo.root_cause.slice(0, 50)}"`, { cwd: path.join(__dirname, '..') }, () => {});

    try {
      const result = await pool.query(
        `INSERT INTO incident_logs (target_file, root_cause, fix_summary, old_code, new_code, mttr_ms, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [patchInfo.file, patchInfo.root_cause, patchInfo.fix_summary, patchInfo.old_code, patchInfo.new_code, mttrMs, true]
      );
      io.emit('ai_patch', result.rows[0]);
    } catch (err) {
      io.emit('ai_patch', { ...patchInfo, mttr_ms: mttrMs, verified: true });
    }
  }
});

app.get('/api/incidents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incident_logs ORDER BY created_at DESC LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-demo', (req, res) => {
  fs.writeFileSync(targetAppPath, BUGGY_TEMPLATE, 'utf-8');
  io.emit('system_log', { type: 'WARN', message: 'Demo Reset: Restored 3 vulnerable endpoints in target-app/server.js' });
  startTargetApp();
  res.json({ status: 'Buggy code restored!' });
});

// Proxy Chaos Trigger (Taaki Vercel par live hone ke baad bhi browser se direct Target App crash ho sake!)
app.post('/api/chaos/:type', async (req, res) => {
  const { type } = req.params;
  try {
    if (type === 'null-pointer') {
      const r = await fetch('http://localhost:4000/api/orders/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
      });
      return res.status(r.status).json(await r.json());
    }
    if (type === 'json-crash') {
      const r = await fetch('http://localhost:4000/api/payments/discount', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawCouponData: '{bad-json', amount: 1000 })
      });
      return res.status(r.status).json(await r.json());
    }
    if (type === 'db-fault') {
      const r = await fetch('http://localhost:4000/api/inventory/CORRUPT_SKU');
      return res.status(r.status).json(await r.json());
    }
    res.status(400).json({ error: 'Unknown chaos type' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`[ORCHESTRATOR] Running on port ${PORT}`);
  await initDB();
  startTargetApp();
});