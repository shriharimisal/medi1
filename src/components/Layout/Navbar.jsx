// src/components/Layout/Navbar.jsx
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const TITLES = {
  '/': 'Dashboard',
  '/medicines': 'Medicines',
  '/calendar': 'Calendar',
  '/history': 'Dose History',
  '/reports': 'Reports',
};

export default function Navbar() {
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const { activeProfile, userProfile } = useAuth();
  const title = TITLES[location.pathname] || 'Apothecary';

  const profiles = userProfile?.profiles || [];
  const profile = profiles.find(p => p.id === activeProfile);

  return (
    <header style={{
      position: 'fixed', top: 0,
      left: 'var(--sidebar-width)', right: 0,
      height: 'var(--navbar-height)',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px', zIndex: 100,
      gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20 }}>{title}</h2>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
          {profile && ` · Managing: ${profile.name}`}
        </div>
      </div>

      <button onClick={toggle} style={{
        width:38, height:38, borderRadius:10,
        background:'var(--bg)', border:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, cursor:'pointer', transition:'all 0.2s',
      }}>
        {dark ? '☀️' : '🌙'}
      </button>

      <div style={{
        padding:'6px 14px', borderRadius:20,
        background:'rgba(13,148,136,0.1)',
        color:'var(--primary)', fontSize:13, fontWeight:700,
      }}>
        🏥 Caregiver Mode
      </div>
    </header>
  );
}
