import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { currentUser, fetchUserProfile } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', email: '', priority: 1 });
  const [newProfile, setNewProfile] = useState({ name: '', relation: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      setContacts(data.emergencyContacts || []);
      setProfiles(data.profiles || [{ id: 'self', name: 'Myself', relation: 'self' }]);
    }
    setLoading(false);
  }

  async function saveContacts(updated) {
    setSaving(true);
    await updateDoc(doc(db, 'users', currentUser.uid), { emergencyContacts: updated });
    setContacts(updated);
    await fetchUserProfile(currentUser.uid);
    toast.success('Saved ✅');
    setSaving(false);
  }

  async function saveProfiles(updated) {
    setSaving(true);
    await updateDoc(doc(db, 'users', currentUser.uid), { profiles: updated });
    setProfiles(updated);
    await fetchUserProfile(currentUser.uid);
    toast.success('Saved ✅');
    setSaving(false);
  }

  function addContact() {
    if (!newContact.name || !newContact.email) { toast.error('Enter name and email'); return; }
    if (!newContact.email.includes('@')) { toast.error('Invalid email'); return; }
    saveContacts([...contacts, { ...newContact, priority: contacts.length + 1 }]);
    setNewContact({ name: '', email: '', priority: 1 });
  }

  function removeContact(i) {
    saveContacts(contacts.filter((_, idx) => idx !== i));
  }

  function addProfile() {
    if (!newProfile.name || !newProfile.relation) { toast.error('Enter name and relation'); return; }
    saveProfiles([...profiles, { id: Date.now().toString(), ...newProfile }]);
    setNewProfile({ name: '', relation: '' });
  }

  function removeProfile(id) {
    if (id === 'self') { toast.error('Cannot remove default'); return; }
    saveProfiles(profiles.filter(p => p.id !== id));
  }

  if (loading) return <div className="page loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">⚙️ Settings</h2>
          <p className="page-subtitle">Emergency contacts and profiles</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>👤 Account</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
            {(currentUser?.displayName || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{currentUser?.displayName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{currentUser?.email}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>🚨 Emergency Contacts</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Gets email when dose is missed</p>
        {contacts.length === 0 ? (
          <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>No contacts added yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {contacts.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                </div>
                <button onClick={() => removeContact(i)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>+ Add Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Name (e.g. Mom, Dad)" value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))} />
            <input type="email" placeholder="Email address" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} />
            <button onClick={addContact} disabled={saving} className="btn btn-primary" style={{ justifyContent: 'center' }}>
              {saving ? '⏳ Saving...' : '+ Add Contact'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>👨‍👩‍👧 Caregiver Profiles</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Manage medicines for family members</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {profiles.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.relation}</div>
              </div>
              {p.id === 'self'
                ? <span className="badge badge-primary">Default</span>
                : <button onClick={() => removeProfile(p.id)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}>🗑️</button>
              }
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>+ Add Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Name (e.g. Mom)" value={newProfile.name} onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))} />
            <input placeholder="Relation (e.g. mother, father)" value={newProfile.relation} onChange={e => setNewProfile(p => ({ ...p, relation: e.target.value }))} />
            <button onClick={addProfile} disabled={saving} className="btn btn-primary" style={{ justifyContent: 'center' }}>
              {saving ? '⏳ Saving...' : '+ Add Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
        }
