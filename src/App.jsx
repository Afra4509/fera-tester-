import { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, Globe, Zap, Server } from 'lucide-react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    rps: 0,
    activeVisitors: 0,
    uniqueIps: 0
  });

  const [history, setHistory] = useState([]);
  const [recentHits, setRecentHits] = useState([]); // <-- NEW STATE FOR LIVE FEED
  const [isConnected, setIsConnected] = useState(false);

  // Use refs to keep track of state for the interval without causing re-renders
  const rpsCounter = useRef(0);
  const activeSessions = useRef(new Map()); // sessionId -> last seen timestamp
  const uniqueIps = useRef(new Set());
  const totalCounter = useRef(0);

  useEffect(() => {
    // 1. Fetch initial counts (optional: we can just start from 0 for the real-time session, 
    // but let's query the total count from Supabase to be accurate).
    const fetchInitialData = async () => {
      const { count, error } = await supabase
        .from('traffic_logs')
        .select('*', { count: 'exact', head: true });
        
      if (!error && count) {
        totalCounter.current = count;
        setStats(s => ({ ...s, totalRequests: count }));
      }
    };
    fetchInitialData();

    // 2. Setup Realtime Subscription
    const channel = supabase
      .channel('public:traffic_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'traffic_logs' },
        (payload) => {
          const { ip_address, session_id } = payload.new;
          
          // Increment RPS
          rpsCounter.current += 1;
          
          // Increment Total
          totalCounter.current += 1;
          
          // Track Unique IPs
          if (ip_address) uniqueIps.current.add(ip_address);
          
          // Track Active Session
          if (session_id) activeSessions.current.set(session_id, Date.now());

          // Add to Live Feed
          setRecentHits(prev => {
            const newHits = [{ time: new Date().toLocaleTimeString(), ip: ip_address, session: session_id.substring(0,8) }, ...prev];
            return newHits.slice(0, 10); // Keep last 10
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      });

    // 3. Interval to calculate RPS and update state every second
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Cleanup sessions older than 60 seconds
      for (const [id, lastSeen] of activeSessions.current.entries()) {
        if (now - lastSeen > 60000) {
          activeSessions.current.delete(id);
        }
      }

      const currentRps = rpsCounter.current;
      rpsCounter.current = 0; // Reset for next second

      setStats({
        totalRequests: totalCounter.current,
        rps: currentRps,
        activeVisitors: activeSessions.current.size,
        uniqueIps: uniqueIps.current.size
      });

      setHistory((prev) => {
        const newHistory = [...prev, { time: new Date().toLocaleTimeString(), rps: currentRps }];
        if (newHistory.length > 60) newHistory.shift();
        return newHistory;
      });

    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1><Activity className="metric-icon" size={28} /> Traffic Observer (Supabase)</h1>
        <div className="live-indicator">
          <div className="live-dot" style={{ backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }}></div>
          {isConnected ? 'LIVE' : 'DISCONNECTED'}
        </div>
      </header>

      <div className="metrics-grid">
        <MetricCard 
          title="Active Visitors" 
          value={stats.activeVisitors} 
          icon={<Users size={24} />} 
        />
        <MetricCard 
          title="Requests / Sec" 
          value={stats.rps} 
          icon={<Zap size={24} />} 
        />
        <MetricCard 
          title="Total Requests" 
          value={stats.totalRequests.toLocaleString()} 
          icon={<Server size={24} />} 
        />
        <MetricCard 
          title="Unique IPs (Session)" 
          value={stats.uniqueIps.toLocaleString()} 
          icon={<Globe size={24} />} 
        />
      </div>

      <div className="glass-panel chart-section">
        <div className="chart-header">
          <h3>Real-time Traffic (RPS)</h3>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="var(--text-secondary)" 
              fontSize={12} 
              tickMargin={10} 
              minTickGap={30} 
            />
            <YAxis 
              stroke="var(--text-secondary)" 
              fontSize={12} 
              tickFormatter={(val) => Math.round(val)} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)',
                borderRadius: '8px',
                color: 'var(--text-primary)'
              }} 
              itemStyle={{ color: 'var(--accent)' }}
            />
            <Area 
              type="monotone" 
              dataKey="rps" 
              stroke="var(--accent)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRps)" 
              isAnimationActive={false} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="glass-panel snippet-section" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h3>Integration Snippet (Serverless)</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Add this script to the <code>&lt;head&gt;</code> of the websites you want to monitor.
          </p>
          <pre>
{`<script src="/snippet.js"></script>`}
          </pre>
        </div>
        
        <div style={{ flex: '1 1 300px' }}>
          <h3>Live Activity Feed ⚡</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentHits.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Menunggu pengunjung masuk...</p>
            ) : (
              recentHits.map((hit, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--success)' }}>{hit.time}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Visitor: {hit.session}...</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <div className="glass-panel metric-card">
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="metric-value">
        {value}
      </div>
    </div>
  );
}

export default App;
