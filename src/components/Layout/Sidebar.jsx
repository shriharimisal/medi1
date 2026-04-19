// src/components/Layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/', icon: '⚡', label: 'Dashboard' },
  { to: '/medicines', icon: '💊', label: 'Medicines' },
  { to: '/calendar', icon: '📅', label: 'Calendar' },
  { to: '/history', icon: '📋', label: 'Dose History' },
  { to: '/reports', icon: '📊', label: 'Reports' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const { currentUser, userProfile, activeProfile, setActiveProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    try { await logout(); navigate('/login'); }
    catch { toast.error('Logout failed'); }
  }

  const profiles = userProfile?.profiles || [{ id: 'self', name: 'Myself', relation: 'self' }];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:199 }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Hamburger button */}
      <button onClick={() => setMobileOpen(!mobileOpen)} style={{
        display:'none', position:'fixed', top:16, left:16, zIndex:300,
        width:36, height:36, borderRadius:8, background:'var(--primary)', color:'white',
        fontSize:16, alignItems:'center', justifyContent:'center', border:'none'
      }} className="hamburger">☰</button>

      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        zIndex: 200, transition: 'transform 0.3s',
        transform: mobileOpen ? 'translateX(0)' : undefined,
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:28 }}>💊</div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'var(--primary)' }}>Apothecary</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>Medicine Reminder</div>
            </div>
          </div>
        </div>

        {/* Profile Switcher */}
        {profiles.length > 1 && (
          <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Managing
            </div>
            <select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, fontSize:13, cursor:'pointer' }}>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.relation})</option>
              ))}
            </select>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 12px' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(13,148,136,0.1)' : 'transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
              })}
              onClick={() => setMobileOpen(false)}>
              <span style={{ fontSize:18 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'var(--primary)', color:'white',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:15,
            }}>
              {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {currentUser?.displayName || 'User'}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {currentUser?.email}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ width:'100%', justifyContent:'center' }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          aside { transform: translateX(-100%) !important; }
          aside.open { transform: translateX(0) !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
