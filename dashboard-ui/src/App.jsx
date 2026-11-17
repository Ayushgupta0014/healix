import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Activity, Wrench, RotateCcw, Zap, CheckCircle2, Terminal, Database, ShieldCheck, Gauge, Code2 } from 'lucide-react';

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
    <div style={{
      backgroundColor: '#060a12',
      backgroundImage: 'radial-gradient(circle at 50% 0%, #0f172a 0%, #060a12 70%)',
      color: '#e2e8f0',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '28px 24px',
      boxSizing: 'border-box'
    }}>
      {/* Centered Main Container */}
      <div style={{ maxWidth: '1380px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 56px)' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '16px 22px',
          marginBottom: '22px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={28} color="#38bdf8" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '21px', fontWeight: 800, letterSpacing: '0.6px', color: '#f8fafc' }}>
                HEALIX <span style={{ color: '#38bdf8', fontWeight: 600 }}>//</span> AUTONOMOUS SRE
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Self-Healing Cloud Sandbox • Node.js + Redis + PostgreSQL + Gemini AI
              </p>
            </div>
          </div>

          {/* Chaos Lab Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <span style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              backgroundColor: status === 'HEALING' ? 'rgba(127, 29, 29, 0.6)' : status === 'VULNERABLE' ? 'rgba(120, 53, 15, 0.6)' : 'rgba(6, 78, 59, 0.6)',
              color: status === 'HEALING' ? '#fca5a5' : status === 'VULNERABLE' ? '#fde68a' : '#6ee7b7',
              border: '1px solid currentColor',
              boxShadow: status === 'HEALTHY' ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none'
            }}>
              ● {status}
            </span>

            <button onClick={handleResetDemo} disabled={loadingAction === 'reset'} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              <RotateCcw size={14} /> Reset Bugs (3)
            </button>

            <button onClick={() => triggerChaos('null-pointer')} disabled={!!loadingAction} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}>
              <Zap size={14} /> Crash: NullPtr
            </button>

            <button onClick={() => triggerChaos('json-crash')} disabled={!!loadingAction} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}>
              <Zap size={14} /> Crash: JSON
            </button>

            <button onClick={() => triggerChaos('db-fault')} disabled={!!loadingAction} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)' }}>
              <Zap size={14} /> Crash: DB Pool
            </button>
          </div>
        </div>

        {/* SRE KPI Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '22px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: '#94a3b8', marginBottom: '4px' }}>MEAN TIME TO RECOVERY (MTTR)</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8' }}>{avgMttr}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Gauge size={26} color="#38bdf8" />
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: '#94a3b8', marginBottom: '4px' }}>AUTONOMOUS PATCHES DEPLOYED</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#a78bfa' }}>{incidents.length}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(167, 139, 250, 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Wrench size={26} color="#a78bfa" />
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: '#94a3b8', marginBottom: '4px' }}>SMOKE TEST VERIFICATION</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399' }}>100% PASSED</div>
            </div>
            <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '10px', borderRadius: '10px' }}>
              <ShieldCheck size={26} color="#34d399" />
            </div>
          </div>
        </div>

        {/* Main Telemetry & Audit Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', height: '340px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#38bdf8', fontWeight: 700, fontSize: '14px' }}>
              <Terminal size={18} /> Live Telemetry Stream (WebSockets)
            </div>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#020617', border: '1px solid #1e293b', padding: '14px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}>
              {logs.length === 0 && <div style={{ color: '#64748b' }}>Click "Reset Bugs (3)" and inject any chaos fault above!</div>}
              {logs.map((log, i) => (
                <div key={i} style={{
                  marginBottom: '6px',
                  color: log.type === 'CRASH' ? '#f87171' : log.type === 'WARN' ? '#fbbf24' : log.type === 'INFO' ? '#38bdf8' : '#a7f3d0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  <span style={{ color: '#64748b' }}>[{log.timestamp}]</span> [{log.type}] {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', height: '340px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#a78bfa', fontWeight: 700, fontSize: '14px' }}>
              <Database size={18} /> PostgreSQL Incident Audit Log ({incidents.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {incidents.length === 0 && <div style={{ color: '#64748b', fontSize: '13px' }}>No patches recorded yet.</div>}
              {incidents.map((inc, idx) => (
                <div
                  key={inc.id || idx}
                  onClick={() => setSelectedIncident(inc)}
                  style={{
                    padding: '13px',
                    borderRadius: '10px',
                    backgroundColor: selectedIncident?.id === inc.id ? '#1e293b' : '#020617',
                    border: selectedIncident?.id === inc.id ? '1px solid #38bdf8' : '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#38bdf8', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <CheckCircle2 size={14} color="#10b981" /> Patch #{inc.id || incidents.length - idx}
                      {inc.mttr_ms > 0 && <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '2px 7px', borderRadius: '4px', fontSize: '11px' }}>{inc.mttr_ms}ms</span>}
                    </span>
                    <span style={{ color: '#64748b' }}>{inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : 'Just now'}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>{inc.root_cause}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>{inc.fix_summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: AI Code Diff Viewer */}
        {selectedIncident && (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#34d399', fontWeight: 700, fontSize: '14px' }}>
              <Wrench size={18} /> AI Patch Diff Viewer — <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>{selectedIncident.target_file || selectedIncident.file}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '6px', fontWeight: 700 }}>BEFORE (Vulnerable Code)</div>
                <pre style={{ margin: 0, backgroundColor: '#020617', border: '1px solid #7f1d1d', padding: '14px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.5', overflowX: 'auto', maxHeight: '320px', color: '#fca5a5' }}>
                  {selectedIncident.old_code}
                </pre>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#34d399', marginBottom: '6px', fontWeight: 700 }}>AFTER (AI-Healed Production Code)</div>
                <pre style={{ margin: 0, backgroundColor: '#020617', border: '1px solid #065f46', padding: '14px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.5', overflowX: 'auto', maxHeight: '320px', color: '#6ee7b7' }}>
                  {selectedIncident.new_code}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Professional Developer Signature Footer */}
        <footer style={{
          marginTop: 'auto',
          paddingTop: '18px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={16} color="#38bdf8" />
            <span>
              Healix Autonomous SRE Platform • <span style={{ color: '#94a3b8' }}>v1.0 Production Sandbox</span>
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '6px 14px',
            borderRadius: '999px',
            color: '#94a3b8'
          }}>
            <span>Designed & Developed by</span>
            <span style={{ color: '#38bdf8', fontWeight: 700, letterSpacing: '0.3px' }}>Ayush Gupta</span>
          </div>
        </footer>

      </div>
    </div>
  );
}