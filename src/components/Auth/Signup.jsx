// src/components/Auth/Signup.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signup(email, password, name);
      toast.success('Account created! Welcome to Apothecary 🎉');
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast.error('Email already in use');
      else toast.error('Failed to create account');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:20,
    }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>💊</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:800, color:'var(--primary)' }}>
            Apothecary
          </h1>
          <p style={{ color:'var(--text-muted)', marginTop:6 }}>Create your account</p>
        </div>

        <div className="card">
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>Create Account</h2>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)}
                placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Min. 6 characters" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'13px' }}>
              {loading ? '⏳ Creating...' : '✅ Create Account'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'var(--primary)', fontWeight:600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
