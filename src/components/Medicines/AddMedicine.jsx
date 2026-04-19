// src/components/Medicines/AddMedicine.jsx
import { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const COLORS = ['#0d9488','#8b5cf6','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#06b6d4'];
const TYPES = ['Tablet','Capsule','Syrup','Injection','Drops','Inhaler','Patch','Cream','Other'];

export default function AddMedicine({ onClose, onSaved, editMed }) {
  const { currentUser, activeProfile } = useAuth();
  const [form, setForm] = useState({
    name: '', dosage: '', type: 'Tablet', times: ['08:00'],
    quantity: '', totalQuantity: '', expiryDate: '',
    color: '#0d9488', vacationMode: false, prescriptionImage: '',
  });
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (editMed) {
      setForm({
        name: editMed.name || '',
        dosage: editMed.dosage || '',
        type: editMed.type || 'Tablet',
        times: editMed.times || ['08:00'],
        quantity: editMed.quantity || '',
        totalQuantity: editMed.totalQuantity || '',
        expiryDate: editMed.expiryDate || '',
        color: editMed.color || '#0d9488',
        vacationMode: editMed.vacationMode || false,
        prescriptionImage: editMed.prescriptionImage || '',
      });
    }
  }, [editMed]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addTime() { set('times', [...form.times, '12:00']); }
  function removeTime(i) { set('times', form.times.filter((_, idx) => idx !== i)); }
  function updateTime(i, v) { set('times', form.times.map((t, idx) => idx === i ? v : t)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.dosage || form.times.length === 0) {
      toast.error('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      let imageUrl = form.prescriptionImage;
      if (file) {
        const r = ref(storage, `prescriptions/${currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(r, file);
        imageUrl = await getDownloadURL(r);
      }

      const data = {
        ...form,
        quantity: Number(form.quantity),
        totalQuantity: Number(form.totalQuantity || form.quantity),
        prescriptionImage: imageUrl,
        profileId: activeProfile,
        updatedAt: Timestamp.now(),
      };

      if (editMed) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'medicines', editMed.id), data);
        toast.success('Medicine updated ✅');
      } else {
        data.createdAt = Timestamp.now();
        await addDoc(collection(db, 'users', currentUser.uid, 'medicines'), data);
        toast.success('Medicine added ✅');
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save medicine');
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{editMed ? '✏️ Edit Medicine' : '+ Add Medicine'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Medicine Name *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Metformin" required />
            </div>
            <div className="form-group">
              <label className="form-label">Dosage *</label>
              <input value={form.dosage} onChange={e=>set('dosage',e.target.value)} placeholder="e.g. 500mg" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={e=>set('expiryDate',e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Current Stock</label>
              <input type="number" value={form.quantity} onChange={e=>set('quantity',e.target.value)} placeholder="e.g. 30" min="0" required />
            </div>
            <div className="form-group">
              <label className="form-label">Total Quantity (pack size)</label>
              <input type="number" value={form.totalQuantity} onChange={e=>set('totalQuantity',e.target.value)} placeholder="e.g. 30" min="1" />
            </div>
          </div>

          {/* Dose Times */}
          <div className="form-group">
            <label className="form-label">Dose Times *</label>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {form.times.map((t, i) => (
                <div key={i} style={{ display:'flex', gap:8 }}>
                  <input type="time" value={t} onChange={e=>updateTime(i,e.target.value)}
                    style={{ flex:1 }} />
                  {form.times.length > 1 && (
                    <button type="button" onClick={()=>removeTime(i)} style={{
                      padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)',
                      color:'var(--danger)', border:'none', cursor:'pointer', fontWeight:700,
                    }}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTime} style={{
                padding:'9px', borderRadius:8, background:'var(--bg)', border:'1px dashed var(--border)',
                color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:600,
              }}>+ Add Time</button>
            </div>
          </div>

          {/* Color */}
          <div className="form-group">
            <label className="form-label">Color Tag</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={()=>set('color',c)} style={{
                  width:32, height:32, borderRadius:8, background:c, border:'none', cursor:'pointer',
                  boxShadow: form.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                  transition:'box-shadow 0.2s',
                }} />
              ))}
            </div>
          </div>

          {/* Prescription upload */}
          <div className="form-group">
            <label className="form-label">Prescription Image (optional)</label>
            <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])}
              style={{ padding:'8px', cursor:'pointer' }} />
            {form.prescriptionImage && (
              <img src={form.prescriptionImage} alt="Prescription" style={{ height:60, borderRadius:8, marginTop:8, objectFit:'cover' }} />
            )}
          </div>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex:1, justifyContent:'center' }}>
              {loading ? '⏳ Saving...' : editMed ? '✅ Update' : '+ Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
