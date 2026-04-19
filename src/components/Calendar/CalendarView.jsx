// src/components/Calendar/CalendarView.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday, subMonths, addMonths,
} from 'date-fns';

export default function CalendarView() {
  const { currentUser, activeProfile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayStats, setDayStats] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDoses, setSelectedDoses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMonth(); }, [currentMonth, currentUser, activeProfile]);

  async function loadMonth() {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const snap = await getDocs(
      query(collection(db, 'users', currentUser.uid, 'doseHistory'),
        where('profileId', '==', activeProfile),
        where('date', '>=', start),
        where('date', '<=', end))
    );
    const entries = snap.docs.map(d => d.data());

    const stats = {};
    for (const e of entries) {
      if (!stats[e.date]) stats[e.date] = { taken: 0, missed: 0, snoozed: 0 };
      stats[e.date][e.status] = (stats[e.date][e.status] || 0) + 1;
    }
    setDayStats(stats);
    setLoading(false);
  }

  async function handleDayClick(dateStr) {
    setSelectedDay(dateStr);
    const snap = await getDocs(
      query(collection(db, 'users', currentUser.uid, 'doseHistory'),
        where('date', '==', dateStr), where('profileId', '==', activeProfile))
    );
    setSelectedDoses(snap.docs.map(d => d.data()).sort((a, b) => a.time.localeCompare(b.time)));
  }

  function getDayColor(dateStr) {
    const s = dayStats[dateStr];
    if (!s) return null;
    const total = s.taken + s.missed + s.snoozed;
    if (total === 0) return null;
    if (s.missed === 0 && s.snoozed === 0) return '#22c55e';
    if (s.taken === 0) return '#ef4444';
    return '#f59e0b';
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad = getDay(startOfMonth(currentMonth));
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Calendar</h2>
          <p className="page-subtitle">Monthly dose adherence overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>← Prev</button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 140, textAlign: 'center' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>Next →</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['#22c55e','All Taken'], ['#f59e0b','Partial'], ['#ef4444','All Missed'], ['var(--border)','No Data']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: c }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {/* Padding cells */}
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const color = getDayColor(dateStr);
              const s = dayStats[dateStr];
              const selected = selectedDay === dateStr;
              const today = isToday(day);

              return (
                <button key={dateStr} onClick={() => handleDayClick(dateStr)} style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 10,
                  border: selected ? '2px solid var(--primary)' : today ? '2px solid var(--primary-light)' : '1px solid var(--border)',
                  background: color ? `${color}22` : 'var(--bg)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 2,
                  transition: 'all 0.15s',
                  padding: 4,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: today ? 800 : 500,
                    color: today ? 'var(--primary)' : 'var(--text)',
                  }}>{format(day, 'd')}</span>
                  {color && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                  )}
                  {s && (
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {s.taken}✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 16 }}>
              📋 {format(new Date(selectedDay + 'T00:00:00'), 'EEEE, MMMM d')}
            </h3>
            {selectedDoses.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '12px 0' }}>No doses recorded for this day</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDoses.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10, background: 'var(--bg)',
                    border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{d.medicineName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏰ {d.time}</div>
                    </div>
                    <span className={`badge badge-${d.status === 'taken' ? 'success' : d.status === 'missed' ? 'danger' : 'warning'}`}>
                      {d.status === 'taken' ? '✅ Taken' : d.status === 'missed' ? '❌ Missed' : '⏸ Snoozed'}
                    </span>
                  </div>
                ))}
                {/* Summary */}
                {dayStats[selectedDay] && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <span className="badge badge-success">✅ {dayStats[selectedDay].taken} Taken</span>
                    <span className="badge badge-danger">❌ {dayStats[selectedDay].missed} Missed</span>
                    <span className="badge badge-warning">⏸ {dayStats[selectedDay].snoozed} Snoozed</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
