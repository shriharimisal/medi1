// src/components/Reports/Reports.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { format, subDays, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

export default function Reports() {
  const { currentUser, activeProfile } = useAuth();
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [medData, setMedData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('weekly');

  useEffect(() => { loadData(); }, [currentUser, activeProfile]);

  async function loadData() {
    setLoading(true);
    try {
      // Last 30 days of history
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const histSnap = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'doseHistory'),
          where('profileId', '==', activeProfile),
          where('date', '>=', since))
      );
      const history = histSnap.docs.map(d => d.data());

      // Medicines
      const medSnap = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'medicines'),
          where('profileId', '==', activeProfile))
      );
      const medicines = medSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Weekly data (last 7 days)
      const weekly = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const dayEntries = history.filter(h => h.date === date);
        const taken = dayEntries.filter(h => h.status === 'taken').length;
        const missed = dayEntries.filter(h => h.status === 'missed').length;
        const snoozed = dayEntries.filter(h => h.status === 'snoozed').length;
        const total = taken + missed + snoozed;
        weekly.push({
          day: format(subDays(new Date(), i), 'EEE'),
          date,
          taken,
          missed,
          snoozed,
          adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
        });
      }
      setWeeklyData(weekly);

      // Monthly data (weekly buckets for last 4 weeks)
      const monthly = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = format(startOfWeek(subDays(new Date(), w * 7)), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(subDays(new Date(), w * 7)), 'yyyy-MM-dd');
        const weekEntries = history.filter(h => h.date >= weekStart && h.date <= weekEnd);
        const taken = weekEntries.filter(h => h.status === 'taken').length;
        const missed = weekEntries.filter(h => h.status === 'missed').length;
        const total = taken + missed;
        monthly.push({
          week: `Wk ${4 - w}`,
          taken,
          missed,
          adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
        });
      }
      setMonthlyData(monthly);

      // Per-medicine adherence
      const medMap = {};
      for (const h of history) {
        if (!medMap[h.medicineName]) medMap[h.medicineName] = { taken: 0, missed: 0, snoozed: 0 };
        medMap[h.medicineName][h.status]++;
      }
      const medArr = Object.entries(medMap).map(([name, s]) => {
        const total = s.taken + s.missed + s.snoozed;
        return { name, taken: s.taken, missed: s.missed, adherence: total > 0 ? Math.round((s.taken / total) * 100) : 0 };
      });
      setMedData(medArr);

      // Stock levels
      setStockData(medicines.map(m => ({
        name: m.name,
        remaining: m.quantity,
        used: (m.totalQuantity || m.quantity) - m.quantity,
        pct: Math.round(m.quantity / (m.totalQuantity || m.quantity) * 100),
      })));

    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const PIE_COLORS = ['#0d9488', '#ef4444', '#f59e0b'];
  const totalTaken = weeklyData.reduce((s, d) => s + d.taken, 0);
  const totalMissed = weeklyData.reduce((s, d) => s + d.missed, 0);
  const totalSnoozed = weeklyData.reduce((s, d) => s + d.snoozed, 0);
  const pieData = [
    { name: 'Taken', value: totalTaken },
    { name: 'Missed', value: totalMissed },
    { name: 'Snoozed', value: totalSnoozed },
  ].filter(d => d.value > 0);

  if (loading) return <div className="page loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-subtitle">Adherence trends and stock usage analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['weekly','📅 Weekly'],['monthly','📆 Monthly'],['medicines','💊 Per Medicine'],['stock','📦 Stock']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 20px', borderRadius: '10px 10px 0 0',
            background: tab === key ? 'var(--bg-card)' : 'transparent',
            color: tab === key ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: tab === key ? 700 : 500,
            border: tab === key ? '1px solid var(--border)' : 'none',
            borderBottom: tab === key ? '1px solid var(--bg-card)' : 'none',
            marginBottom: tab === key ? -1 : 0,
            fontSize: 14, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* Weekly */}
      {tab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Doses Taken vs Missed (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="taken" fill="#0d9488" name="Taken" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missed" fill="#ef4444" name="Missed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="snoozed" fill="#f59e0b" name="Snoozed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>7-Day Split</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i] }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Daily Adherence % (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} formatter={(v) => [`${v}%`, 'Adherence']} />
                <Line type="monotone" dataKey="adherence" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: '#0d9488', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly */}
      {tab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Weekly Doses (Last 4 Weeks)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="taken" fill="#0d9488" name="Taken" radius={[4, 4, 0, 0]} />
                <Bar dataKey="missed" fill="#ef4444" name="Missed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Weekly Adherence Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} formatter={(v) => [`${v}%`, 'Adherence']} />
                <Line type="monotone" dataKey="adherence" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per Medicine */}
      {tab === 'medicines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {medData.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data yet</div></div></div>
          ) : (
            <>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Adherence Per Medicine</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={medData} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: 'var(--text)' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} formatter={(v) => [`${v}%`, 'Adherence']} />
                    <Bar dataKey="adherence" fill="#0d9488" radius={[0, 4, 4, 0]} name="Adherence %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Detailed Breakdown</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Medicine</th><th>Taken</th><th>Missed</th><th>Adherence</th></tr></thead>
                    <tbody>
                      {medData.map(m => (
                        <tr key={m.name}>
                          <td style={{ fontWeight: 600 }}>{m.name}</td>
                          <td><span className="badge badge-success">{m.taken}</span></td>
                          <td><span className="badge badge-danger">{m.missed}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="progress-bar" style={{ flex: 1 }}>
                                <div className="progress-fill" style={{ width: `${m.adherence}%`, background: m.adherence >= 80 ? 'var(--success)' : m.adherence >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 13, minWidth: 36 }}>{m.adherence}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Stock */}
      {tab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {stockData.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-icon">📦</div><div className="empty-title">No medicines added</div></div></div>
          ) : (
            <>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Stock Levels</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stockData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="remaining" fill="#0d9488" name="Remaining" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="used" fill="#e2f0ef" name="Used" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Stock Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {stockData.map(m => (
                    <div key={m.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.pct < 25 ? 'var(--danger)' : m.pct < 50 ? 'var(--warning)' : 'var(--success)' }}>
                          {m.remaining} left ({m.pct}%)
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${m.pct}%`,
                          background: m.pct < 25 ? 'var(--danger)' : m.pct < 50 ? 'var(--warning)' : 'var(--primary)',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
