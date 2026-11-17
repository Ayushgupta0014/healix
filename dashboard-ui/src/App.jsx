
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Activity, Wrench, RotateCcw, Zap, CheckCircle2,
  Terminal, Database, ShieldCheck, Gauge, Code2,
  Server, Cpu, Wifi, Clock, AlertTriangle,
  ArrowUpRight, Sparkles, CircleDot
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const socket = io(API_URL, {
  autoConnect: false,
  reconnection: true
});

export default function App() {
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [status, setStatus] = useState('HEALTHY');
  const [loadingAction, setLoadingAction] = useState('');
  const [connected, setConnected] = useState(false);
  const logEndRef = useRef(null);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/incidents`);
      if (!res.ok) throw new Error('Failed to fetch incidents');

      const data = await res.json();

      if (Array.isArray(data)) {
        setIncidents(data);
        setSelectedIncident(prev => prev || data[0] || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncidents();

    socket.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onLog = (log) => {
      const timestamp = new Date().toLocaleTimeString();

      setLogs(prev => [
        ...prev.slice(-49),
        { ...log, timestamp }
      ]);

      if (log.type === 'CRASH') setStatus('HEALING');

      if (
        log.type === 'STDOUT' &&
        log.message?.includes('Running')
      ) {
        setStatus('HEALTHY');
      }
    };

    const onPatch = (patch) => {
      setStatus('HEALTHY');
      setIncidents(prev => [patch, ...prev]);
      setSelectedIncident(patch);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('system_log', onLog);
    socket.on('ai_patch', onPatch);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('system_log', onLog);
      socket.off('ai_patch', onPatch);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleResetDemo = async () => {
    setLoadingAction('reset');

    try {
      const res = await fetch(`${API_URL}/api/reset-demo`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('Reset failed');

      setStatus('VULNERABLE');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction('');
    }
  };

  const triggerChaos = async (type) => {
    setLoadingAction(type);

    try {
      const res = await fetch(`${API_URL}/api/chaos/${type}`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('Chaos request failed');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction('');
    }
  };

  const validMttrs = incidents
    .map(i => Number(i.mttr_ms))
    .filter(n => n > 0);

  const avgMttr = validMttrs.length
    ? `${(
        validMttrs.reduce((a, b) => a + b, 0) /
        validMttrs.length / 1000
      ).toFixed(2)}s`
    : '1.55s';

  const statusColor = {
    HEALTHY: '#34d399',
    HEALING: '#fb7185',
    VULNERABLE: '#fbbf24'
  };

  const metrics = [
    {
      title: 'MEAN TIME TO RECOVERY',
      value: avgMttr,
      subtitle: 'Average incident recovery',
      icon: Gauge,
      color: '#38bdf8'
    },
    {
      title: 'AUTONOMOUS PATCHES',
      value: incidents.length,
      subtitle: 'AI fixes recorded',
      icon: Wrench,
      color: '#a78bfa'
    },
    {
      title: 'SMOKE TESTS',
      value: '100%',
      subtitle: 'Verification target',
      icon: ShieldCheck,
      color: '#34d399'
    },
    {
      title: 'WEBSOCKET',
      value: connected ? 'ONLINE' : 'OFFLINE',
      subtitle: 'Live telemetry connection',
      icon: Wifi,
      color: connected ? '#34d399' : '#fb7185'
    }
  ];

  const chaosActions = [
    { id: 'null-pointer', label: 'Null Pointer', color: '#ef4444' },
    { id: 'json-crash', label: 'JSON Crash', color: '#f97316' },
    { id: 'db-fault', label: 'DB Pool Fault', color: '#a855f7' }
  ];

  return (
    <div className="app-shell">

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #070b14;
          color: #e2e8f0;
          font-family: Inter, system-ui, sans-serif;
        }

        button {
          font: inherit;
        }

        .app-shell {
          min-height: 100vh;
          padding: 30px 4%;
          background:
            radial-gradient(ellipse at 50% -15%, #142447 0%, transparent 55%),
            #070b14;
        }

        .container {
          max-width: 1500px;
          margin: auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          padding: 20px 24px;
          background: rgba(15,23,42,.82);
          border: 1px solid #26344d;
          border-radius: 18px;
          margin-bottom: 25px;
          backdrop-filter: blur(15px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .brand-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          color: #38bdf8;
          background: #10263e;
          border: 1px solid #285579;
          border-radius: 14px;
        }

        .brand h1 {
          font-size: 21px;
          margin: 0;
          letter-spacing: 1px;
          color: #f8fafc;
        }

        .brand p {
          font-size: 12px;
          color: #8293ac;
          margin: 5px 0 0;
        }

        .controls {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }

        .status {
          padding: 9px 13px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .7px;
          border: 1px solid currentColor;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 13px;
          border: 1px solid #334155;
          border-radius: 9px;
          color: white;
          background: #172338;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          transition: .2s;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.2);
        }

        .action-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 30px 0 15px;
        }

        .section-heading h2 {
          font-size: 14px;
          letter-spacing: .8px;
          margin: 0;
          color: #e2e8f0;
        }

        .section-heading p {
          color: #64748b;
          font-size: 11px;
          margin: 5px 0 0;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .metric {
          padding: 21px;
          background: linear-gradient(145deg, #111c30, #0c1423);
          border: 1px solid #25334b;
          border-radius: 15px;
          transition: .2s;
        }

        .metric:hover {
          border-color: #3b5577;
          transform: translateY(-3px);
        }

        .metric-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .metric-icon {
          padding: 11px;
          border-radius: 12px;
          background: #172941;
        }

        .metric-title {
          color: #91a3bd;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .8px;
        }

        .metric-value {
          font-size: 29px;
          font-weight: 800;
          margin-top: 7px;
          color: #f8fafc;
        }

        .metric-sub {
          color: #64748b;
          font-size: 11px;
          margin-top: 7px;
        }

        .panel-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .panel {
          min-width: 0;
          background: #0d1626;
          border: 1px solid #25334b;
          border-radius: 16px;
          padding: 20px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .terminal {
          height: 330px;
          overflow-y: auto;
          padding: 16px;
          background: #050a13;
          border: 1px solid #1e293b;
          border-radius: 11px;
          font: 12px/1.8 monospace;
        }

        .terminal::-webkit-scrollbar,
        .incident-list::-webkit-scrollbar {
          width: 5px;
        }

        .terminal::-webkit-scrollbar-thumb,
        .incident-list::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }

        .log-line {
          margin-bottom: 7px;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .incident-list {
          height: 330px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .incident {
          padding: 15px;
          border: 1px solid #26354d;
          border-radius: 11px;
          background: #080f1d;
          cursor: pointer;
          transition: .2s;
        }

        .incident:hover {
          border-color: #38bdf8;
        }

        .incident.active {
          background: #13243a;
          border-color: #38bdf8;
        }

        .incident-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          margin-bottom: 10px;
        }

        .incident h3 {
          font-size: 13px;
          margin: 0 0 7px;
          color: #e2e8f0;
        }

        .incident p {
          font-size: 11px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0;
        }

        .diff-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .code-box {
          min-width: 0;
        }

        .code-label {
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        pre {
          background: #050a13;
          border: 1px solid #25334b;
          border-radius: 11px;
          padding: 16px;
          color: #cbd5e1;
          font: 12px/1.7 monospace;
          white-space: pre-wrap;
          overflow-x: auto;
          overflow-wrap: anywhere;
          max-height: 330px;
        }

        footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 35px;
          padding: 22px 5px 5px;
          border-top: 1px solid #25334b;
          color: #64748b;
          font-size: 12px;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .footer-credit {
          padding: 10px 15px;
          background: #101b2c;
          border: 1px solid #26354d;
          border-radius: 30px;
        }

        @media(max-width: 1050px) {
          .metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media(max-width: 750px) {
          .app-shell {
            padding: 16px 12px;
          }

          .panel-grid,
          .diff-grid {
            grid-template-columns: 1fr;
          }

          .topbar {
            padding: 17px;
          }

          .controls {
            width: 100%;
          }

          .action-btn {
            flex: 1 1 130px;
          }
        }

        @media(max-width: 450px) {
          .metrics {
            grid-template-columns: 1fr;
          }

          .brand h1 {
            font-size: 17px;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="container">

        {/* HEADER */}

        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">
              <Activity size={27}/>
            </div>

            <div>
              <h1>
                HEALIX <span style={{color:'#38bdf8'}}>//</span> AUTONOMOUS SRE
              </h1>
              <p>AI-Powered Self-Healing Infrastructure Platform</p>
            </div>
          </div>

          <div className="controls">

            <span
              className="status"
              style={{
                color: statusColor[status],
                background: `${statusColor[status]}12`
              }}
            >
              <CircleDot size={10} style={{display:'inline',marginRight:5}}/>
              {status}
            </span>

            <button
              className="action-btn"
              onClick={handleResetDemo}
              disabled={!!loadingAction}
            >
              <RotateCcw size={14}/>
              {loadingAction === 'reset' ? 'Resetting...' : 'Reset Bugs'}
            </button>

            {chaosActions.map(action => (
              <button
                key={action.id}
                className="action-btn"
                style={{
                  background: `${action.color}18`,
                  borderColor: `${action.color}70`
                }}
                disabled={!!loadingAction}
                onClick={() => triggerChaos(action.id)}
              >
                <Zap size={13} color={action.color}/>
                {loadingAction === action.id
                  ? 'Triggering...'
                  : action.label}
              </button>
            ))}
          </div>
        </header>

        {/* OVERVIEW */}

        <div className="section-heading">
          <div>
            <h2>INFRASTRUCTURE OVERVIEW</h2>
            <p>Real-time platform health and recovery metrics</p>
          </div>
          <span style={{fontSize:11,color:'#64748b'}}>
            <Activity size={12} style={{display:'inline'}}/> Live monitoring
          </span>
        </div>

        <div className="metrics">
          {metrics.map((item, index) => {
            const Icon = item.icon;

            return (
              <div className="metric" key={index}>
                <div className="metric-top">
                  <span className="metric-title">{item.title}</span>
                  <div className="metric-icon">
                    <Icon size={22} color={item.color}/>
                  </div>
                </div>

                <div
                  className="metric-value"
                  style={{color:item.color}}
                >
                  {item.value}
                </div>

                <div className="metric-sub">{item.subtitle}</div>
              </div>
            );
          })}
        </div>

        {/* TELEMETRY */}

        <div className="section-heading">
          <div>
            <h2>OPERATIONS CENTER</h2>
            <p>System logs and autonomous incident management</p>
          </div>
        </div>

        <div className="panel-grid">

          {/* TERMINAL */}

          <section className="panel">
            <div className="panel-title" style={{color:'#38bdf8'}}>
              <Terminal size={18}/>
              Live Telemetry Stream
              <span style={{
                marginLeft:'auto',
                fontSize:10,
                color:connected?'#34d399':'#fb7185'
              }}>
                {connected?'● CONNECTED':'● DISCONNECTED'}
              </span>
            </div>

            <div className="terminal">
              {logs.length === 0 && (
                <div style={{color:'#64748b'}}>
                  Waiting for system events...
                  <br/>
                  Reset bugs or inject a chaos fault to begin.
                </div>
              )}

              {logs.map((log, i) => (
                <div
                  key={i}
                  className="log-line"
                  style={{
                    color:
                      log.type === 'CRASH' ? '#fb7185' :
                      log.type === 'WARN' ? '#fbbf24' :
                      log.type === 'INFO' ? '#38bdf8' :
                      '#a7f3d0'
                  }}
                >
                  <span style={{color:'#64748b'}}>
                    [{log.timestamp}]
                  </span>
                  {' '}[{log.type}] {log.message}
                </div>
              ))}

              <div ref={logEndRef}/>
            </div>
          </section>

          {/* INCIDENTS */}

          <section className="panel">
            <div className="panel-title" style={{color:'#a78bfa'}}>
              <Database size={18}/>
              Incident Audit Log
              <span style={{
                marginLeft:'auto',
                background:'#211b3b',
                color:'#c4b5fd',
                padding:'4px 9px',
                borderRadius:20,
                fontSize:11
              }}>
                {incidents.length} Records
              </span>
            </div>

            <div className="incident-list">
              {incidents.length === 0 && (
                <div style={{color:'#64748b',fontSize:12}}>
                  No incidents recorded yet.
                </div>
              )}

              {incidents.map((inc, idx) => (
                <div
                  key={inc.id || idx}
                  className={`incident ${
                    selectedIncident?.id === inc.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedIncident(inc)}
                >
                  <div className="incident-meta">
                    <span style={{color:'#38bdf8',fontWeight:800}}>
                      <CheckCircle2
                        size={13}
                        style={{display:'inline',marginRight:5}}
                      />
                      PATCH #{inc.id || incidents.length-idx}
                    </span>

                    <span style={{color:'#64748b'}}>
                      {inc.created_at
                        ? new Date(inc.created_at).toLocaleTimeString()
                        : 'Just now'}
                    </span>
                  </div>

                  <h3>{inc.root_cause || 'Incident resolved'}</h3>

                  <p>{inc.fix_summary || 'AI patch applied successfully.'}</p>

                  {Number(inc.mttr_ms) > 0 && (
                    <div style={{
                      display:'inline-block',
                      marginTop:10,
                      color:'#6ee7b7',
                      background:'#064e3b',
                      borderRadius:5,
                      padding:'4px 8px',
                      fontSize:10
                    }}>
                      MTTR: {inc.mttr_ms}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* AI CODE DIFF */}

        <div className="section-heading">
          <div>
            <h2>AI AUTONOMOUS CODE REPAIR</h2>
            <p>Compare vulnerable code with AI-generated patches</p>
          </div>
          <Sparkles size={20} color="#a78bfa"/>
        </div>

        {selectedIncident ? (
          <section className="panel">

            <div className="panel-title" style={{color:'#34d399'}}>
              <Wrench size={18}/>
              AI Patch Diff Viewer
              <span style={{
                color:'#94a3b8',
                fontSize:11,
                fontWeight:400
              }}>
                {selectedIncident.target_file || selectedIncident.file || 'Source file'}
              </span>
            </div>

            <div className="diff-grid">

              <div className="code-box">
                <div className="code-label" style={{color:'#fb7185'}}>
                  <AlertTriangle size={13} style={{display:'inline'}}/>
                  {' '}BEFORE — VULNERABLE CODE
                </div>

                <pre>
                  {selectedIncident.old_code || '// Original code unavailable'}
                </pre>
              </div>

              <div className="code-box">
                <div className="code-label" style={{color:'#34d399'}}>
                  <CheckCircle2 size={13} style={{display:'inline'}}/>
                  {' '}AFTER — AI HEALED CODE
                </div>

                <pre>
                  {selectedIncident.new_code || '// Patched code unavailable'}
                </pre>
              </div>

            </div>
          </section>
        ) : (
          <section className="panel" style={{
            textAlign:'center',
            padding:45,
            color:'#64748b'
          }}>
            <Code2 size={35}/>
            <p>Select an incident to inspect its AI-generated patch.</p>
          </section>
        )}

        {/* FOOTER */}

        <footer>
          <div className="footer-brand">
            <Code2 size={18} color="#38bdf8"/>
            <span>
              © {new Date().getFullYear()} <strong style={{color:'#cbd5e1'}}>
                Healix Autonomous SRE
              </strong>. All Rights Reserved.
            </span>
          </div>

          <div className="footer-credit">
            Engineered & Developed by{' '}
            <strong style={{color:'#38bdf8'}}>
              Ayush Gupta
            </strong>
          </div>
        </footer>

      </div>
    </div>
  );
}
