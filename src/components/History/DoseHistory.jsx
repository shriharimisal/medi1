// src/components/History/DoseHistory.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { format, subDays } from 'date-fns';

const STATUS_FILTERS = ['all', 'taken', 'missed', 'snoozed'];

export default function DoseHistory() {
  const { currentUser, activeProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMed, setFilterMed] = useState('all');
  const [filterDays, setFilterDays] = useState(7);

  useEffect(() => { loadData(); }, [currentUser, activeProfile, filterDays]);

  async function loadData() {
    setLoading(true);
    const sinceDate = format(subDays(new Date(), filterDays), 'yyyy-MM-dd');

    const [histSnap, medSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'users', currentUser.uid, 'doseHistory'),
        where('profileId', '==', activeProfile),
        where('date', '>=', sinceDate)
      )),
      getDocs(query(
        collection(db, 'users', currentUser.uid, 'medicines'),
        where('profileId', '==', activeProfile)
      )),
    ]);

    const hist = histSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return b.time?.localeCompare(a.time);
      });

    setHistory(hist);
    setMedicines(medSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  const filtered = history.filter(h => {
    if (filterStatus !== 'all' && h.status !== filterStatus) return false;
    if (filterMed !== 'all' && h.medicineId !== filterMed) return false;
    return true;
  });

  // Per-medicine adherence stats
  const medStats = {};
  for (const h of history) {
    if (!medStats[h.medicineId]) medStats[h.medicineId] = { name: h.medicineName, taken: 0, missed: 0, snoozed: 0 };
    medStats[h.medicineId][h.status] = (medStats[h.medicineId][h.status] || 0) + 1;
  }

  const totalTaken = history.filter(h => h.status === 'taken').length;
  const totalMissed = history.filter(h => h.status === 'missed').length;
  const totalAll = history.length;
  const overallAdherence = totalAll > 0 ? Math.round((totalTaken / totalAll) * 100) : 0;

  // Group by date
  const grouped = {};
  for (const h of filtered) {
    if (!grouped[h.date]) grouped[h.date] = [];
    grouped[h.date].push(h);
  }

  if (loading) return <div className="page loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dose History</h2>
          <p className="page-subtitle">{filtered.length} entries · {overallAdherence}% overall adherence</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>✅</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{totalTaken}</div>
          <div className="stat-label">Taken (last {filterDays}d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>❌</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{totalMissed}</div>
          <div className="stat-label">Missed (last {filterDays}d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--primary)' }}>📈</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{overallAdherence}%</div>
          <div className="stat-label">Adherence Rate</div>
        </div>
      </div>

      {/* Per-medicine adherence */}
      {Object.keys(medStats).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Medicine-wise Adherence</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(medStats).map(([id, s]) => {
              const total = s.taken + s.missed + s.snoozed;
              const pct = total > 0 ? Math.round((s.taken / total) * 100) : 0;
              return (
                <div key={id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {pct}% ({s.taken}/{total})
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterDays} onChange={e => setFilterDays(Number(e.target.value))} style={{ width: 'auto' }}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>

        <select value={filterMed} onChange={e => setFilterMed(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Medicines</option>
          {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '7px 14px', borderRadius: 20,
              background: filterStatus === s ? 'var(--primary)' : 'var(--bg)',
              color: filterStatus === s ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              {s === 'all' ? 'All' : s === 'taken' ? '✅ Taken' : s === 'missed' ? '❌ Missed' : '⏸ Snoozed'}
            </button>
          ))}
        </div>
      </div>

      {/* History list grouped by date */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No history found</div>
            <div className="empty-text">Dose history will appear here once you start tracking</div>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([date, doses]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📅 {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span>{doses.filter(d => d.status === 'taken').length}/{doses.length} taken</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Logged At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doses.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{d.medicineName}</td>
                        <td>{d.time}</td>
                        <td>
                          <span className={`badge badge-${d.status === 'taken' ? 'success' : d.status === 'missed' ? 'danger' : 'warning'}`}>
                            {d.status === 'taken' ? '✅ Taken' : d.status === 'missed' ? '❌ Missed' : '⏸ Snoozed'}
                          </span>
                          {d.autoMissed && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(auto)</span>}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {d.timestamp?.toDate ? format(d.timestamp.toDate(), 'hh:mm a') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
