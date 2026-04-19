// src/components/Medicines/MedicineList.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import AddMedicine from './AddMedicine';
import toast from 'react-hot-toast';

const COLORS = ['#0d9488','#8b5cf6','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6'];

export default function MedicineList() {
  const { currentUser, activeProfile } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editMed, setEditMed] = useState(null);

  useEffect(() => { loadMedicines(); }, [currentUser, activeProfile]);

  async function loadMedicines() {
    setLoading(true);
    const snap = await getDocs(
      query(collection(db, 'users', currentUser.uid, 'medicines'),
        where('profileId', '==', activeProfile))
    );
    setMedicines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function deleteMedicine(id) {
    if (!confirm('Delete this medicine and all its history?')) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'medicines', id));
    toast.success('Medicine deleted');
    loadMedicines();
  }

  async function toggleVacation(med) {
    await updateDoc(doc(db, 'users', currentUser.uid, 'medicines', med.id), {
      vacationMode: !med.vacationMode,
    });
    toast.success(med.vacationMode ? 'Vacation mode disabled' : 'Vacation mode enabled');
    loadMedicines();
  }

  const stockPct = (m) => m.totalQuantity > 0 ? Math.round(m.quantity / m.totalQuantity * 100) : 0;
  const daysToExpiry = (m) => m.expiryDate
    ? Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) return <div className="page loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Medicines</h2>
          <p className="page-subtitle">{medicines.length} medicine{medicines.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditMed(null); setShowAdd(true); }}>
          + Add Medicine
        </button>
      </div>

      {medicines.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">💊</div>
            <div className="empty-title">No medicines added</div>
            <div className="empty-text">Add your first medicine to start tracking</div>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowAdd(true)}>+ Add Medicine</button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {medicines.map(med => {
            const pct = stockPct(med);
            const days = daysToExpiry(med);
            return (
              <div key={med.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'stretch' }}>
                  {/* Color bar */}
                  <div style={{ width:6, background: med.color || 'var(--primary)', flexShrink:0, borderRadius:'14px 0 0 14px' }} />
                  <div style={{ flex:1, padding:20 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                          <h3 style={{ fontSize:17, fontWeight:700 }}>{med.name}</h3>
                          {med.vacationMode && <span className="badge badge-warning">✈️ Vacation</span>}
                          {pct < 25 && <span className="badge badge-danger">⚠️ Low Stock</span>}
                          {days !== null && days <= 30 && <span className="badge badge-warning">⏐ Expiring</span>}
                        </div>
                        <div style={{ display:'flex', gap:16, fontSize:13, color:'var(--text-muted)', flexWrap:'wrap' }}>
                          <span>💊 {med.dosage}</span>
                          <span>📋 {med.type}</span>
                          <span>⏰ {med.times?.join(', ')}</span>
                          {med.expiryDate && <span>📅 Expires: {med.expiryDate}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => toggleVacation(med)}>
                          {med.vacationMode ? '▶ Resume' : '✈️ Vacation'}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditMed(med); setShowAdd(true); }}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteMedicine(med.id)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                    {/* Stock progress */}
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:13, color:'var(--text-muted)' }}>Stock: {med.quantity} / {med.totalQuantity}</span>
                        <span style={{ fontSize:13, fontWeight:700, color: pct < 25 ? 'var(--danger)' : pct < 50 ? 'var(--warning)' : 'var(--success)' }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${pct}%`,
                          background: pct < 25 ? 'var(--danger)' : pct < 50 ? 'var(--warning)' : 'var(--primary)',
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddMedicine
          editMed={editMed}
          onClose={() => { setShowAdd(false); setEditMed(null); }}
          onSaved={() => { setShowAdd(false); setEditMed(null); loadMedicines(); }}
        />
      )}
    </div>
  );
}
