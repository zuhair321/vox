import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, Zap } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { API_BASE } from '../../api/client';

const LoginDummy: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('vox_token', data.tokens.access);
      localStorage.setItem('vox_refresh_token', data.tokens.refresh);
      localStorage.setItem('vox_user', JSON.stringify(data.user));
      navigate('/friends');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="vox-login" aria-label="VOX login">
      {/* ── atmospheric layers ── */}
      <div className="vox-login-scanlines" aria-hidden="true" />
      <div className="vox-login-fog" aria-hidden="true" />

      {/* ── floating ember particles ── */}
      <div className="vox-login-embers" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="ember" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* ── watermark ── */}
      <div className="vox-login-watermark" aria-hidden="true">VOX</div>

      {/* ── pentagram sigil ring ── */}
      <div className="vox-login-orb" aria-hidden="true">
        <div className="vox-login-ring ring-outer" />
        <div className="vox-login-ring ring-inner" />
        <div className="vox-login-ring ring-sigil" />
      </div>

      <section className="vox-login-stage">
        <form onSubmit={handleLogin} className="vox-login-card">
          {/* animated border glow */}
          <span className="vox-login-border-glow" aria-hidden="true" />

          {/* corner ornaments */}
          <span className="vox-login-corner corner-tl" aria-hidden="true" />
          <span className="vox-login-corner corner-tr" aria-hidden="true" />
          <span className="vox-login-corner corner-bl" aria-hidden="true" />
          <span className="vox-login-corner corner-br" aria-hidden="true" />

          <header className="vox-login-header">
            <p className="vox-login-subtitle">† SECURE ACCESS †</p>
            <h1 className="glitch-text" data-text="VOX">VOX</h1>
            <strong>ENCRYPTED COMMS PROTOCOL</strong>
            <div className="vox-login-ornament" aria-hidden="true">
              <span />
              <span className="cross">✦</span>
              <span />
            </div>
          </header>

          <div className="vox-login-divider" aria-hidden="true">
            <span className="divider-diamond" />
          </div>

          <div className="vox-login-field">
            <label htmlFor="vox-login-email">IDENTITY</label>
            <div className="vox-login-input-wrap">
              <Shield size={16} aria-hidden="true" />
              <input
                id="vox-login-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="founder@vox"
              />
            </div>
          </div>

          <div className="vox-login-field">
            <label htmlFor="vox-login-password">PASSKEY</label>
            <div className="vox-login-input-wrap">
              <Zap size={16} aria-hidden="true" />
              <input
                id="vox-login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="enter passcode"
              />
            </div>
          </div>

          <button type="submit" className="vox-login-submit" disabled={isSubmitting}>
            <LogIn size={16} aria-hidden="true" />
            <span>{isSubmitting ? 'AUTHENTICATING…' : 'ENTER THE VOID'}</span>
          </button>

          <footer className="vox-login-footer">
            <span>END-TO-END</span>
            <span>† VOXLINK †</span>
            <span>SECURE</span>
          </footer>
        </form>

        <p className="vox-login-register">
          No account?{' '}
          <button type="button" onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: 'var(--chaos)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>
            <strong>REGISTER</strong>
          </button>
        </p>
      </section>
    </main>
  );
};

export default LoginDummy;
