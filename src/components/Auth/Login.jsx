// src/components/Auth/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error('Invalid email or password');
    }
    setLoading(false);
  }

  function fillDemo() {
    setEmail('demo@medreminder.com');
    setPassword('Demo@1234');
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:20,
    }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>💊</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:800, color:'var(--primary)' }}>
            Apothecary
          </h1>
          <p style={{ color:'var(--text-muted)', marginTop:6 }}>Smart Medicine Reminder System</p>
        </div>

        <div className="card">
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>Sign In</h2>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'13px' }}>
              {loading ? '⏳ Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          <button onClick={fillDemo} style={{
            marginTop:12, width:'100%', padding:'11px', borderRadius:8,
            background:'rgba(245,158,11,0.1)', color:'var(--accent)',
            border:'1px dashed var(--accent)', fontWeight:600, fontSize:13, cursor:'pointer',
          }}>
            ✨ Fill Demo Credentials
          </button>

          <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color:'var(--primary)', fontWeight:600 }}>Sign Up</Link>
          </p>
        </div>

        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'var(--text-muted)' }}>
          Demo: demo@medreminder.com · Demo@1234
        </p>
      </div>
    </div>
  );
}
