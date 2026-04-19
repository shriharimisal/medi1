// src/components/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { currentUser, activeProfile } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [todayDoses, setTodayDoses] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!currentUser) return;
    loadData();
    // eslint-disable-next-line
  }, [currentUser, activeProfile]);

  async function loadData() {
    setLoading(true);
    try {
      // Load medicines
      const medsSnap = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'medicines'),
          where('profileId', '==', activeProfile))
      );
      const meds = medsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMedicines(meds);

      // Load today's history
      const todaySnap = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'doseHistory'),
          where('date', '==', today),
          where('profileId', '==', activeProfile))
      );
      setTodayDoses(todaySnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load 7-day chart data
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const snap = await getDocs(
          query(collection(db, 'users', currentUser.uid, 'doseHistory'),
            where('date', '==', dateStr),
            where('profileId', '==', activeProfile))
        );
        const entries = snap.docs.map(d => d.data());
        days.push({
          day: format(d, 'EEE'),
          taken: entries.filter(e => e.status === 'taken').length,
          missed: entries.filter(e => e.status === 'missed').length,
          snoozed: entries.filter(e => e.status === 'snoozed').length,
        });
      }
      setChartData(days);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Compute stats
  const totalDosesToday = medicines.reduce((sum, m) => sum + (m.times?.length || 0), 0);
  const takenToday = todayDoses.filter(d => d.status === 'taken').length;
  const missedToday = todayDoses.filter(d => d.status === 'missed').length;
  const remainingToday = Math.max(0, totalDosesToday - takenToday - missedToday);
  const adherence = totalDosesToday > 0 ? Math.round((takenToday / totalDosesToday) * 100) : 0;

  // Low stock meds (>75% used)
  const lowStock = medicines.filter(m => m.quantity / m.totalQuantity < 0.25);
  // Expiring soon (within 30 days)
  const expiringSoon = medicines.filter(m => {
    if (!m.expiryDate) return false;
    const diff = (new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  });

  // Today's schedule
  const todaySchedule = medicines.flatMap(m =>
    (m.times || []).map(time => {
      const hist = todayDoses.find(d => d.medicineId === m.id && d.time === time);
      return { medicine: m, time, status: hist?.status || 'pending' };
    })
  ).sort((a, b) => a.time.localeCompare(b.time));

  if (loading) return <div className="page loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      {/* Stats */}
      <div style={{ marginBottom:24 }}>
        <div style={{ marginBottom:16 }}>
          <h2 className="page-title">Good {getGreeting()}, {currentUser.displayName?.split(' ')[0] || 'there'}! 👋</h2>
          <p className="page-subtitle">Here's your medication overview for today</p>
        </div>
        <div className="grid-4">
          <StatCard icon="💊" label="Total Doses Today" value={totalDosesToday} color="#0d9488" />
          <StatCard icon="✅" label="Taken" value={takenToday} color="#22c55e" />
          <StatCard icon="❌" label="Missed" value={missedToday} color="#ef4444" />
          <StatCard icon="⏳" label="Remaining" value={remainingToday} color="#f59e0b" />
        </div>
      </div>

      {/* Adherence */}
      <div style={{ marginBottom:24, display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, alignItems:'start' }}>
        <div className="card">
          <h3 style={{ fontWeight:700, marginBottom:16, fontSize:16 }}>📈 7-Day Adherence</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:13 }} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Bar dataKey="taken" fill="#0d9488" name="Taken" radius={[4,4,0,0]} />
              <Bar dataKey="missed" fill="#ef4444" name="Missed" radius={[4,4,0,0]} />
              <Bar dataKey="snoozed" fill="#f59e0b" name="Snoozed" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)' }}>Today's Adherence</div>
          <div style={{ position:'relative', width:120, height:120 }}>
            <svg viewBox="0 0 120 120" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke={adherence >= 80 ? '#22c55e' : adherence >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="12"
                strokeDasharray={`${adherence * 3.14} 314`}
                strokeLinecap="round" />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800 }}>{adherence}%</div>
            </div>
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>{takenToday} of {totalDosesToday} taken</div>
        </div>
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || expiringSoon.length > 0) && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
          {lowStock.map(m => (
            <div key={m.id} style={{
              padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)',
              border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', gap:10,
            }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div>
                <strong>{m.name}</strong> is running low —{' '}
                <span style={{ color:'var(--danger)' }}>{m.quantity} doses left</span> ({Math.round(m.quantity / m.totalQuantity * 100)}% remaining)
              </div>
            </div>
          ))}
          {expiringSoon.map(m => (
            <div key={m.id} style={{
              padding:'12px 16px', borderRadius:10, background:'rgba(245,158,11,0.08)',
              border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', gap:10,
            }}>
              <span style={{ fontSize:18 }}>🕐</span>
              <div>
                <strong>{m.name}</strong> expires on{' '}
                <span style={{ color:'var(--warning)' }}>{m.expiryDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's Schedule */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 style={{ fontWeight:700, fontSize:16 }}>📅 Today's Schedule</h3>
          <Link to="/medicines" className="btn btn-outline btn-sm">Manage Medicines</Link>
        </div>
        {todaySchedule.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💊</div>
            <div className="empty-title">No medicines added yet</div>
            <div className="empty-text">Add your first medicine to get started</div>
            <Link to="/medicines" className="btn btn-primary" style={{ marginTop:16 }}>+ Add Medicine</Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {todaySchedule.map((s, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:14, padding:'12px 16px',
                borderRadius:10, background:'var(--bg)',
                border:'1px solid var(--border)',
              }}>
                <div style={{
                  width:44, height:44, borderRadius:12,
                  background: s.medicine.color || 'var(--primary)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'white', fontWeight:700, fontSize:13, flexShrink:0,
                }}>
                  {s.time}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700 }}>{s.medicine.name}</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>{s.medicine.dosage} · {s.medicine.type}</div>
                </div>
                <span className={`badge badge-${s.status === 'taken' ? 'success' : s.status === 'missed' ? 'danger' : s.status === 'snoozed' ? 'warning' : 'primary'}`}>
                  {s.status === 'pending' ? '⏰ Pending' : s.status === 'taken' ? '✅ Taken' : s.status === 'missed' ? '❌ Missed' : '⏸ Snoozed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background:`${color}18`, color }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
