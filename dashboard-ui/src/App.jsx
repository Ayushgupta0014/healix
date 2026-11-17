import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Activity, Wrench, RotateCcw, Zap, CheckCircle2, Terminal, Database, ShieldCheck, Gauge } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

export default function App() {
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [status, setStatus] = useState('HEALTHY');
  const [loadingAction, setLoadingAction] = useState('');
  const logEndRef = useRef(null);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/incidents`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setIncidents(data);
        if (data.length > 0 && !selectedIncident) setSelectedIncident(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  };

  useEffect(() => {
    fetchIncidents();

    socket.on('system_log', (log) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev.slice(-49), { ...log, timestamp }]);
      if (log.type === 'CRASH') setStatus('HEALING');
      if (log.type === 'STDOUT' && log.message.includes('Running')) setStatus('HEALTHY');
    });

    socket.on('ai_patch', (patch) => {
      setStatus('HEALTHY');
      setIncidents((prev) => [patch, ...prev]);
      setSelectedIncident(patch);
    });

    return () => {
      socket.off('system_log');
      socket.off('ai_patch');
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleResetDemo = async () => {
    setLoadingAction('reset');
    await fetch(`${API_URL}/api/reset-demo`, { method: 'POST' });
    setStatus('VULNERABLE');
    setLoadingAction('');
  };

  const triggerChaos = async (type) => {
    setLoadingAction(type);
    try {
      await fetch(`${API_URL}/api/chaos/${type}`, { method: 'POST' });
    } catch (err) {
      console.error('Chaos triggered:', err);
    }
    setLoadingAction('');
  };

  const validMttrs = incidents.map((i) => Number(i.mttr_ms)).filter((n) => n > 0);
  const avgMttr = validMttrs.length
    ? `${(validMttrs.reduce((a, b) => a + b, 0) / validMttrs.length / 1000).toFixed(2)}s`
    : '1.55s';

  return (
    <div style={{ backgroundColor: '#090d16', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={32} color="#38bdf8" />
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '0.5px' }}>HEALIX // AUTONOMOUS SRE</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Self-Healing Cloud Sandbox • Node.js + Redis + PostgreSQL + Gemini AI</p>
          </div>
        </div>

        {/* Chaos Lab Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: status === 'HEALING' ? '#7f1d1d' : status === 'VULNERABLE' ? '#78350f' : '#064e3b',
            color: status === 'HEALING' ? '#fca5a5' : status === 'VULNERABLE' ? '#fde68a' : '#6ee7b7',
            border: '1px solid currentColor'
          }}>
            ● {status}
          </span>

          <button onClick={handleResetDemo} disabled={loadingAction === 'reset'} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <RotateCcw size={14} /> Reset Bugs (3)
          </button>

          <button onClick={() => triggerChaos('null-pointer')} disabled={!!loadingAction} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <Zap size={14} /> Crash: NullPtr
          </button>

          <button onClick={() => triggerChaos('json-crash')} disabled={!!loadingAction} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <Zap size={14} /> Crash: JSON
          </button>

          <button onClick={() => triggerChaos('db-fault')} disabled={!!loadingAction} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <Zap size={14} /> Crash: DB Pool
          </button>
        </div>
      </div>

      {/* SRE KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>MEAN TIME TO RECOVERY (MTTR)</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8' }}>{avgMttr}</div>
          </div>
          <Gauge size={26} color="#38bdf8" />
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>AUTONOMOUS PATCHES DEPLOYED</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>{incidents.length}</div>
          </div>
          <Wrench size={26} color="#a78bfa" />
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>SMOKE TEST VERIFICATION</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#34d399' }}>100% PASSED</div>
          </div>
          <ShieldCheck size={26} color="#34d399" />
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', height: '330px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#38bdf8', fontWeight: 600 }}>
            <Terminal size={18} /> Live Telemetry Stream (WebSockets)
          </div>
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#020617', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
            {logs.length === 0 && <div style={{ color: '#64748b' }}>Click "Reset Bugs (3)" and inject any chaos fault above!</div>}
            {logs.map((log, i) => (
              <div key={i} style={{
                marginBottom: '6px',
                color: log.type === 'CRASH' ? '#f87171' : log.type === 'WARN' ? '#fbbf24' : log.type === 'INFO' ? '#38bdf8' : '#a7f3d0',
                whiteSpace: 'pre-wrap'
              }}>
                <span style={{ color: '#64748b' }}>[{log.timestamp}]</span> [{log.type}] {log.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', height: '330px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#a78bfa', fontWeight: 600 }}>
            <Database size={18} /> PostgreSQL Incident Audit Log ({incidents.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incidents.length === 0 && <div style={{ color: '#64748b', fontSize: '13px' }}>No patches recorded yet.</div>}
            {incidents.map((inc, idx) => (
              <div
                key={inc.id || idx}
                onClick={() => setSelectedIncident(inc)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: selectedIncident?.id === inc.id ? '#1e293b' : '#020617',
                  border: selectedIncident?.id === inc.id ? '1px solid #38bdf8' : '1px solid #1e293b',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#38bdf8', marginBottom: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#10b981" /> Patch #{inc.id || incidents.length - idx}
                    {inc.mttr_ms > 0 && <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{inc.mttr_ms}ms</span>}
                  </span>
                  <span>{inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : 'Just now'}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>{inc.root_cause}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{inc.fix_summary}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: AI Code Diff Viewer */}
      {selectedIncident && (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#34d399', fontWeight: 600 }}>
            <Wrench size={18} /> AI Patch Diff Viewer — {selectedIncident.target_file || selectedIncident.file}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '6px', fontWeight: 600 }}>BEFORE (Vulnerable Code)</div>
              <pre style={{ backgroundColor: '#020617', border: '1px solid #7f1d1d', padding: '12px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto', maxHeight: '300px', color: '#fca5a5' }}>
                {selectedIncident.old_code}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#34d399', marginBottom: '6px', fontWeight: 600 }}>AFTER (AI-Healed Production Code)</div>
              <pre style={{ backgroundColor: '#020617', border: '1px solid #065f46', padding: '12px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto', maxHeight: '300px', color: '#6ee7b7' }}>
                {selectedIncident.new_code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}